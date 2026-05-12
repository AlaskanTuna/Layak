"""Admin moderation surface for the agentic scheme discovery pipeline.

Every endpoint here is gated by `Depends(require_admin)` — the dependency
verifies the bearer token via `current_user`, runs the admin custom-claim
bootstrap (idempotent per process), and 403s any uid whose verified email
is not in `LAYAK_ADMIN_EMAIL_ALLOWLIST`.

Endpoints:

    GET  /api/admin/discovery/queue                 List + filter candidates
    GET  /api/admin/discovery/{candidate_id}        Fetch one candidate
    POST /api/admin/discovery/{candidate_id}/approve            Two-track publish
    POST /api/admin/discovery/{candidate_id}/reject             Terminal
    POST /api/admin/discovery/{candidate_id}/request-changes    Returns to pending
    POST /api/admin/discovery/trigger                Manual end-to-end run
    GET  /api/admin/schemes/health                   Per-scheme last-verified summary

The approve handler performs two writes per spec §2.7:
1. Matched candidates (scheme_id resolves to an existing rule) stamp
   `verified_schemes/{scheme_id}.verifiedAt` so user-facing scheme cards
   surface "Source verified DD MMM YYYY via automated discovery."
2. ALL approved candidates additionally serialise to a YAML manifest under
   `backend/data/discovered/` — the bridge artifact for the engineer who
   hand-codes the corresponding Pydantic rule (or updates an existing one).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated, Any, Literal, get_args

import yaml
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Response, status
from fastapi import Path as PathParam
from google.cloud.firestore_v1 import SERVER_TIMESTAMP  # type: ignore[attr-defined, unused-ignore]
from pydantic import BaseModel, ConfigDict, Field

from app.agents.discovery_agent import run_discovery
from app.auth import AdminUser, get_firestore
from app.schema.discovery import CandidateStatus, DiscoveryRunSummary, SchemeCandidate
from app.schema.scheme import SchemeId

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

_DISCOVERED_YAML_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "discovered"

# Canonical scheme ids the badge mechanism can write against. Sourced from
# `SchemeId` so any new scheme added to the Literal lights up the verified
# badge automatically — no duplicate list to drift.
_CANONICAL_SCHEME_IDS: frozenset[str] = frozenset(get_args(SchemeId))


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class CandidateRow(BaseModel):
    """One row in the moderation queue table."""

    model_config = ConfigDict(extra="forbid")

    candidate_id: str
    source_id: str
    scheme_id: str | None
    name: str
    agency: str
    status: CandidateStatus
    created_at: str | None  # ISO-8601 UTC; None for legacy rows pre-timestamp
    reviewed_at: str | None
    confidence: float


class QueueResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[CandidateRow]


class CandidateDetailResponse(BaseModel):
    """Full candidate payload for the detail page."""

    model_config = ConfigDict(extra="forbid")

    candidate: SchemeCandidate
    status: CandidateStatus
    reviewed_by: str | None
    reviewed_at: str | None
    admin_note: str | None


class ActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: str | None = Field(default=None, max_length=2000)


class ActionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_id: str
    status: CandidateStatus
    manifest_path: str | None = None
    manifest_yaml: str | None = None


class SchemeHealthRow(BaseModel):
    """One per-scheme row for the admin landing page."""

    model_config = ConfigDict(extra="forbid")

    scheme_id: str
    verified_at: str | None  # ISO-8601 UTC; None when never verified
    source_content_hash: str | None


class SchemeHealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[SchemeHealthRow]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _iso(value: Any) -> str | None:
    """Best-effort ISO-8601 stringification of a Firestore timestamp.

    Firestore SDK returns `DatetimeWithNanoseconds` for server timestamps;
    `datetime` for client-side writes. Both have `.isoformat()`. We fall
    back to `None` for missing or unknown types so the frontend can render
    "—" instead of throwing.
    """
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()  # type: ignore[no-any-return]
        except Exception:  # noqa: BLE001
            return None
    return None


def _row_from_doc(doc: Any) -> CandidateRow | None:
    """Convert one `discovered_schemes` Firestore doc into a queue row."""
    data = doc.to_dict() or {}
    payload = data.get("candidate") or {}
    if not isinstance(payload, dict) or not payload:
        return None
    try:
        return CandidateRow(
            candidate_id=payload.get("candidate_id", doc.id),
            source_id=payload.get("source_id", ""),
            scheme_id=payload.get("scheme_id"),
            name=payload.get("name", ""),
            agency=payload.get("agency", ""),
            status=data.get("status", "pending"),
            created_at=_iso(data.get("createdAt")),
            reviewed_at=_iso(data.get("reviewedAt")),
            confidence=float(payload.get("confidence", 0.0)),
        )
    except Exception:  # noqa: BLE001 — malformed doc, skip
        _logger.exception("queue row build failed for doc %s", doc.id)
        return None


def _write_manifest(candidate: SchemeCandidate) -> tuple[Path, str]:
    """Serialise the approved candidate to a YAML manifest.

    Filename: `<scheme_id-or-uuid>-<YYYY-MM-DD>-<short_hash>.yaml`. Output
    directory is created on first write. The manifest is the canonical
    reference for the engineer who hand-codes the Pydantic rule update
    (or new rule, when `scheme_id` is None).

    Returns the local path (ephemeral on Cloud Run — survives only the
    serving container's lifetime) AND the YAML string content so the caller
    can persist it durably (e.g. on the Firestore candidate doc) before the
    container recycles.
    """
    _DISCOVERED_YAML_DIR.mkdir(parents=True, exist_ok=True)
    short_hash = candidate.source_content_hash[:8]
    date_token = datetime.now(UTC).strftime("%Y-%m-%d")
    stem = candidate.scheme_id or candidate.candidate_id[:8]
    path = _DISCOVERED_YAML_DIR / f"{stem}-{date_token}-{short_hash}.yaml"
    payload = candidate.model_dump(mode="json")
    yaml_content = yaml.safe_dump(payload, sort_keys=False, allow_unicode=True)
    path.write_text(yaml_content, encoding="utf-8")
    return path, yaml_content


def _candidate_from_doc(doc: Any) -> SchemeCandidate:
    data = doc.to_dict() or {}
    payload = data.get("candidate")
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate payload missing"
        )
    return SchemeCandidate.model_validate(payload)


def _transition(
    user: AdminUser,
    candidate_id: str,
    target_status: CandidateStatus,
    note: str | None,
) -> tuple[Any, SchemeCandidate]:
    """Shared status-transition path used by approve / reject / request-changes."""
    db = get_firestore()
    ref = db.collection("discovered_schemes").document(candidate_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found"
        )
    candidate = _candidate_from_doc(snap)
    ref.update({
        "status": target_status,
        "reviewedBy": user.uid,
        "reviewedAt": SERVER_TIMESTAMP,
        "adminNote": note,
    })
    return db, candidate


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/discovery/queue", response_model=QueueResponse)
async def list_queue(
    _admin: AdminUser,
    status_filter: Annotated[
        CandidateStatus | Literal["all"], Query(alias="status")
    ] = "all",
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> QueueResponse:
    """List candidates in the moderation queue, newest first.

    `status_filter == "all"` returns every status; otherwise filters server-side.
    """
    db = get_firestore()
    query = db.collection("discovered_schemes")
    if status_filter != "all":
        query = query.where("status", "==", status_filter)
    try:
        query = query.order_by("createdAt", direction="DESCENDING").limit(limit)
    except Exception:  # noqa: BLE001 — emulator/local Firestore may reject the index
        pass
    items: list[CandidateRow] = []
    for doc in query.stream():
        row = _row_from_doc(doc)
        if row is not None:
            items.append(row)
    return QueueResponse(items=items)


@router.get("/discovery/{candidate_id}", response_model=CandidateDetailResponse)
async def get_candidate(
    _admin: AdminUser,
    candidate_id: Annotated[str, PathParam(min_length=1)],
) -> CandidateDetailResponse:
    db = get_firestore()
    snap = db.collection("discovered_schemes").document(candidate_id).get()
    if not snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found"
        )
    data = snap.to_dict() or {}
    candidate = _candidate_from_doc(snap)
    return CandidateDetailResponse(
        candidate=candidate,
        status=data.get("status", "pending"),
        reviewed_by=data.get("reviewedBy"),
        reviewed_at=_iso(data.get("reviewedAt")),
        admin_note=data.get("adminNote"),
    )


@router.post("/discovery/{candidate_id}/approve", response_model=ActionResponse)
async def approve_candidate(
    user: AdminUser,
    payload: ActionRequest,
    candidate_id: Annotated[str, PathParam(min_length=1)],
) -> ActionResponse:
    db, candidate = _transition(user, candidate_id, "approved", payload.note)
    manifest_path, manifest_yaml = _write_manifest(candidate)
    # Persist the manifest YAML onto the candidate doc so it survives the
    # Cloud Run container recycle (the local file write above is ephemeral).
    db.collection("discovered_schemes").document(candidate_id).set(
        {"manifestYaml": manifest_yaml, "manifestApprovedAt": SERVER_TIMESTAMP},
        merge=True,
    )
    # Heal legacy rows: candidates extracted before the canonical-preference
    # fix landed in extract_candidate persisted with scheme_id=None even when
    # source.id was itself a canonical SchemeId (e.g. lhdn_form_b). Fall back
    # to source_id here so re-approving those rows still updates the badge.
    resolved_scheme_id = candidate.scheme_id
    if resolved_scheme_id is None and candidate.source_id in _CANONICAL_SCHEME_IDS:
        resolved_scheme_id = candidate.source_id
    if resolved_scheme_id is not None:
        db.collection("verified_schemes").document(resolved_scheme_id).set(
            {
                "schemeId": resolved_scheme_id,
                "verifiedAt": SERVER_TIMESTAMP,
                "sourceContentHash": candidate.source_content_hash,
                "lastKnownPayload": candidate.model_dump(mode="json"),
                "lastReviewedBy": user.uid,
            },
            merge=True,
        )
    return ActionResponse(
        candidate_id=candidate_id,
        status="approved",
        manifest_path=str(manifest_path.relative_to(manifest_path.parent.parent.parent)),
        manifest_yaml=manifest_yaml,
    )


@router.post("/discovery/{candidate_id}/reject", response_model=ActionResponse)
async def reject_candidate(
    user: AdminUser,
    payload: ActionRequest,
    candidate_id: Annotated[str, PathParam(min_length=1)],
) -> ActionResponse:
    _transition(user, candidate_id, "rejected", payload.note)
    return ActionResponse(candidate_id=candidate_id, status="rejected")


@router.post("/discovery/{candidate_id}/request-changes", response_model=ActionResponse)
async def request_changes_candidate(
    user: AdminUser,
    payload: ActionRequest,
    candidate_id: Annotated[str, PathParam(min_length=1)],
) -> ActionResponse:
    _transition(user, candidate_id, "changes_requested", payload.note)
    return ActionResponse(candidate_id=candidate_id, status="changes_requested")


@router.delete("/discovery/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    _admin: AdminUser,
    candidate_id: Annotated[str, PathParam(min_length=1)],
) -> Response:
    """Remove a candidate from the moderation queue.

    Used by the admin UI's bulk-delete action. 204 on success even when the
    doc doesn't exist — idempotent so concurrent reviewers don't 404 each
    other when both delete the same row.
    """
    db = get_firestore()
    try:
        db.collection("discovered_schemes").document(candidate_id).delete()
    except Exception as exc:  # noqa: BLE001 — surface as 503 so the client can retry.
        _logger.exception("Failed to delete discovered_schemes/%s", candidate_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to delete candidate",
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/discovery/trigger", response_model=DiscoveryRunSummary)
async def trigger_discovery(_admin: AdminUser, background: BackgroundTasks) -> DiscoveryRunSummary:
    """Run the discovery pipeline end-to-end and return the summary.

    The pipeline is awaited inline so the admin UI can display the result
    summary immediately. For long-running production scenarios (v2) the
    same agent is invoked from a Cloud Scheduler internal endpoint that
    persists the summary asynchronously.
    """
    db = get_firestore()
    summary = await run_discovery(db)
    # Keep the param to allow scheduling background follow-ups in v2 (e.g.
    # emitting a Slack notification on candidate count). Reference it once
    # so ruff doesn't flag the unused param.
    _ = background
    return summary


@router.get("/schemes/health", response_model=SchemeHealthResponse)
async def schemes_health(_admin: AdminUser) -> SchemeHealthResponse:
    """Per-scheme last-verified timestamps for the admin landing dashboard."""
    db = get_firestore()
    items: list[SchemeHealthRow] = []
    for doc in db.collection("verified_schemes").stream():
        data = doc.to_dict() or {}
        items.append(
            SchemeHealthRow(
                scheme_id=data.get("schemeId", doc.id),
                verified_at=_iso(data.get("verifiedAt")),
                source_content_hash=data.get("sourceContentHash"),
            )
        )
    return SchemeHealthResponse(items=items)
