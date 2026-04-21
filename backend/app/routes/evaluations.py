"""Read-side endpoints for the `evaluations/{evalId}` Firestore collection.

Phase 3 Task 1 read-side:
    GET /api/evaluations                    — list the caller's evaluations (paginated)
    GET /api/evaluations/{eval_id}          — one evaluation, owner-gated
    GET /api/evaluations/{eval_id}/packet   — regenerates three PDF drafts as a ZIP

Packet regeneration spec (docs/superpowers/specs/2026-04-21-v2-saas-pivot-design.md §3.7):
PDFs are never persisted. On demand we read the stored Profile + SchemeMatch[]
and re-run WeasyPrint through `app.agents.tools.generate_packet`.

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

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])


class EvaluationListItem(BaseModel):
    """Slim row used by the history list (`/dashboard/evaluation`).

    Full doc is too heavy for a list view — we only need what the table
    renders (date, status, RM). The detail view calls `GET /{id}`.
    """

    model_config = ConfigDict(extra="forbid")

    id: str
    status: str
    totalAnnualRM: float = Field(ge=0)  # noqa: N815 — mirror Firestore field casing
    createdAt: str | None = None  # noqa: N815 — ISO 8601 string
    completedAt: str | None = None  # noqa: N815


class EvaluationListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[EvaluationListItem]
    nextPageToken: str | None = None  # noqa: N815


_MAX_LIST_PAGE = 50


@router.get("", response_model=EvaluationListResponse)
async def list_evaluations(
    user: CurrentUser,
    limit: int = Query(20, ge=1, le=_MAX_LIST_PAGE),
) -> EvaluationListResponse:
    """List the caller's evaluations, newest first.

    Uses the `(userId ASC, createdAt DESC)` composite index deployed via
    Firestore rules in Phase 2 Task 1. Pagination via `nextPageToken` is
    reserved for Phase 4 Task 1 — the MVP page size is enough for demo.
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


@router.get("/{eval_id}/packet")
async def get_evaluation_packet(user: CurrentUser, eval_id: str) -> Response:
    """Regenerate the three draft PDFs from stored profile + matches, return as ZIP.

    Spec §3.7: packets are never persisted. Every download re-runs WeasyPrint
    against the embedded `profile` + `matches` so a change to the Jinja
    template or packet layout propagates to existing evaluations without a
    backfill.
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


def _load_owned_evaluation(eval_id: str, user_uid: str) -> tuple[dict[str, Any], Any]:
    """Fetch an evaluation + enforce owner-gate. Raises 404 on missing or wrong-owner.

    Returns `(doc_data, doc_ref)` so callers that need to update the doc
    after reading (e.g. Phase 4 delete cascade) skip the second lookup.
    The wrong-owner case returns 404, not 403, to avoid leaking existence.
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
