"""Read-side endpoints for the `evaluations/{evalId}` Firestore collection.

    GET /api/evaluations                    — list the caller's evaluations (paginated)
    GET /api/evaluations/{eval_id}          — one evaluation, owner-gated
    GET /api/evaluations/{eval_id}/packet   — regenerates three PDF drafts as a ZIP

Packet regeneration: PDFs are never persisted. On demand we read the stored
Profile + SchemeMatch[] and re-run WeasyPrint through
`app.agents.tools.generate_packet`.

Every endpoint is authed — the caller's `user.uid` is compared against the
document's `userId` field before any data leaks out. Firestore rules would
block client reads of another user's doc, but the Admin SDK bypasses rules,
so the check is enforced here at the route layer.
"""

from __future__ import annotations

import base64
import io
import logging
import zipfile
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from starlette.responses import Response

from app.agents.tools.generate_packet import generate_packet
from app.auth import CurrentUser, get_firestore
from app.schema.firestore import EvaluationDoc
from app.schema.profile import Profile
from app.schema.scheme import SchemeMatch
from app.services.evaluation_summary import generate_summary

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


class EvaluationListItem(BaseModel):
    """Slim row used by the history list (`/dashboard/evaluation`).

    Full doc is too heavy for a list view — we only need what the table
    renders (date, status, RM, draft count). The detail view calls `GET /{id}`.
    """

    model_config = ConfigDict(extra="forbid")

    id: str
    status: str
    totalAnnualRM: float = Field(ge=0)  # noqa: N815 — mirror Firestore field casing
    createdAt: str | None = None  # noqa: N815 — ISO 8601 string
    completedAt: str | None = None  # noqa: N815
    draftCount: int = Field(default=0, ge=0)  # noqa: N815


class EvaluationListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[EvaluationListItem]
    nextPageToken: str | None = None  # noqa: N815


class EvaluationSummaryResponse(BaseModel):
    """AI-generated overview of one evaluation — powers the Summary card."""

    model_config = ConfigDict(extra="forbid")

    summary: str


_MAX_LIST_PAGE = 50


@router.get("", response_model=EvaluationListResponse)
async def list_evaluations(
    user: CurrentUser,
    limit: int = Query(20, ge=1, le=_MAX_LIST_PAGE),
) -> EvaluationListResponse:
    """List the caller's evaluations, newest first.

    Uses the `(userId ASC, createdAt DESC)` composite index deployed via
    Firestore rules. Pagination via `nextPageToken` is reserved for later —
    the MVP page size is enough for demo.
    """
    db = get_firestore()
    query = (
        db.collection("evaluations")
        .where("userId", "==", user.uid)
        .order_by("createdAt", direction="DESCENDING")
        .limit(limit)
    )
    items: list[EvaluationListItem] = []
    for snap in query.stream():
        data = snap.to_dict() or {}
        items.append(
            EvaluationListItem(
                id=snap.id,
                status=data.get("status", "running"),
                totalAnnualRM=float(data.get("totalAnnualRM") or 0.0),
                createdAt=_ts_to_iso(data.get("createdAt")),
                completedAt=_ts_to_iso(data.get("completedAt")),
                draftCount=len(data.get("matches") or []),
            )
        )
    return EvaluationListResponse(items=items)


@router.get("/{eval_id}", response_model=EvaluationDoc)
async def get_evaluation(user: CurrentUser, eval_id: str) -> EvaluationDoc:
    """Return one evaluation in full.

    404 in two cases: (a) the doc doesn't exist, (b) it does but belongs to
    another user. Deliberately **not** 403 on the wrong-owner case — a 403
    would confirm the doc exists and leak that signal to a guesser. Firestore
    rules protect client reads; this check protects server (Admin SDK) reads.
    """
    data, _ref = _load_owned_evaluation(eval_id, user.uid)
    # Pydantic validation catches drifts between Firestore shape and schema.
    try:
        return EvaluationDoc.model_validate(data)
    except ValidationError as exc:
        _logger.exception("evaluations/%s stored in an unexpected shape", eval_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Evaluation document is malformed",
        ) from exc


@router.get("/{eval_id}/summary", response_model=EvaluationSummaryResponse)
async def get_evaluation_summary(user: CurrentUser, eval_id: str) -> EvaluationSummaryResponse:
    """Return a brief AI-written overview of the evaluation.

    Calls `FAST_MODEL` (gemini-3.1-flash-lite) against the stored profile +
    matches. Stateless — every request re-runs the model so a copy fix to
    the system instruction propagates without a Firestore backfill. The
    service is fail-open: any Gemini error returns a deterministic
    fallback string so the card still renders something meaningful.
    """
    data, _ref = _load_owned_evaluation(eval_id, user.uid)
    summary = generate_summary(data)
    return EvaluationSummaryResponse(summary=summary)


@router.delete("/{eval_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_evaluation(user: CurrentUser, eval_id: str) -> Response:
    """Delete a single evaluation owned by the caller.

    404 in two cases (matching `get_evaluation`): missing doc, or wrong-owner.
    A 403 would confirm existence to a guesser; 404 keeps the response shape
    indistinguishable. Returns 204 with no body on success — the frontend
    drops the row from its local cache and refetches the slim list.
    """
    _data, doc_ref = _load_owned_evaluation(eval_id, user.uid)
    try:
        doc_ref.delete()
    except Exception as exc:  # noqa: BLE001 — surface as 503 so the client can retry.
        _logger.exception("Failed to delete evaluations/%s for uid=%s", eval_id, user.uid)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to delete evaluation",
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{eval_id}/packet")
async def get_evaluation_packet(user: CurrentUser, eval_id: str) -> Response:
    """Regenerate the three draft PDFs from stored profile + matches, return as ZIP.

    Packets are never persisted. Every download re-runs WeasyPrint against
    the embedded `profile` + `matches` so a change to the Jinja template or
    packet layout propagates to existing evaluations without a backfill.
    """
    data, _ref = _load_owned_evaluation(eval_id, user.uid)

    raw_profile = data.get("profile")
    raw_matches = data.get("matches")
    if raw_profile is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evaluation has no extracted profile yet",
        )
    try:
        profile = Profile.model_validate(raw_profile)
        matches = [SchemeMatch.model_validate(m) for m in (raw_matches or [])]
    except ValidationError as exc:
        _logger.exception("evaluations/%s profile/matches malformed", eval_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored evaluation is malformed; cannot regenerate packet",
        ) from exc

    packet = await generate_packet(profile, matches)

    zip_bytes = _pack_as_zip(packet)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="layak-packet-{eval_id}.zip"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/{eval_id}/packet/{scheme_id}")
async def get_evaluation_packet_draft(
    user: CurrentUser,
    eval_id: str,
    scheme_id: str,
) -> Response:
    """Regenerate ONE draft PDF from stored profile + the matching SchemeMatch.

    Powers the inline PDF preview on the persisted results page. Returns a
    single `application/pdf` stream with `inline` disposition so `<iframe>`
    / browser PDF viewers can render it. Auth is the usual Bearer-token
    path; the frontend fetches the bytes via `authedFetch`, wraps them in a
    blob URL, and hands the URL to the iframe.

    404 semantics match `get_evaluation`: missing eval, wrong-owner, OR
    `scheme_id` absent from the stored match list all return 404 — never
    differentiating lest we leak which scheme_ids a stored evaluation has.
    """
    data, _ref = _load_owned_evaluation(eval_id, user.uid)

    raw_profile = data.get("profile")
    raw_matches = data.get("matches")
    if raw_profile is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evaluation has no extracted profile yet",
        )
    try:
        profile = Profile.model_validate(raw_profile)
        matches = [SchemeMatch.model_validate(m) for m in (raw_matches or [])]
    except ValidationError as exc:
        _logger.exception("evaluations/%s profile/matches malformed", eval_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored evaluation is malformed; cannot regenerate packet",
        ) from exc

    target = next((m for m in matches if m.scheme_id == scheme_id and m.qualifies), None)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")

    packet = await generate_packet(profile, [target])
    if not packet.drafts:
        # generate_packet silently skips scheme_ids not in _TEMPLATE_MAP; guard that.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")

    draft = packet.drafts[0]
    if not draft.blob_bytes_b64:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Draft regeneration produced no bytes",
        )
    pdf_bytes = base64.b64decode(draft.blob_bytes_b64)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{draft.filename}"',
            "Cache-Control": "no-store",
        },
    )


def _load_owned_evaluation(eval_id: str, user_uid: str) -> tuple[dict[str, Any], Any]:
    """Fetch an evaluation + enforce owner-gate. Raises 404 on missing or wrong-owner.

    Returns `(doc_data, doc_ref)` so callers that need to update the doc
    after reading (e.g. delete cascade) skip the second lookup. The
    wrong-owner case returns 404, not 403, to avoid leaking existence.
    """
    db = get_firestore()
    doc_ref = db.collection("evaluations").document(eval_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    data: dict[str, Any] = snap.to_dict() or {}
    if data.get("userId") != user_uid:
        # Deliberately 404, not 403 — don't leak the existence of a
        # different user's evaluation to a guesser.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    return data, doc_ref


def _ts_to_iso(value: Any) -> str | None:
    """Firestore `Timestamp` → ISO-8601 string, or None passthrough.

    The Firestore SDK returns `google.api_core.datetime_helpers.DatetimeWithNanoseconds`
    instances for timestamp fields, which quack like `datetime`. `isoformat()`
    works on both. SERVER_TIMESTAMP sentinels that haven't resolved yet come
    back as plain `None`.
    """
    if value is None:
        return None
    try:
        return value.isoformat()
    except AttributeError:
        # If Firestore returned a string already (emulator / edge case), pass through.
        return str(value)


def _pack_as_zip(packet: Any) -> bytes:
    """Zip the three PDF drafts from a Packet into a single bytes payload."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for draft in packet.drafts:
            if not draft.blob_bytes_b64:
                continue
            zf.writestr(draft.filename, base64.b64decode(draft.blob_bytes_b64))
    return buf.getvalue()
