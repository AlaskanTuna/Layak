"""DiscoveryAgent runner.

Composes `source_watcher` + `extract_candidate` into one end-to-end pass.
Persists every extracted candidate to `discovered_schemes/{candidate_id}`
with status `"pending"`, ready for the admin moderation queue to surface.

Invoked from two paths:
- The in-product `POST /api/admin/discovery/trigger` button (admin-gated).
- v2 only: Cloud Scheduler hitting an internal endpoint. The v1 release
  ships with manual-trigger only — see plan.md Phase 11 §1 amendment.

The runner returns a `DiscoveryRunSummary` so the admin UI can render a
"42 sources checked, 3 candidates extracted in 24s" toast immediately
after the trigger button is pressed.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

from google.cloud.firestore_v1 import SERVER_TIMESTAMP  # type: ignore[attr-defined, unused-ignore]

from app.agents.tools.extract_candidate import extract_candidate
from app.agents.tools.source_watcher import load_discovery_sources, watch_sources
from app.schema.discovery import DiscoveryRunSummary, SchemeCandidate

_logger = logging.getLogger(__name__)


def _persist_candidate(db: Any, candidate: SchemeCandidate) -> bool:
    """Write the candidate to `discovered_schemes/{candidate_id}`.

    Returns True on success, False on Firestore error (logged). The runner
    swallows individual write failures so one bad candidate cannot abort
    the rest of the batch.
    """
    try:
        db.collection("discovered_schemes").document(candidate.candidate_id).set({
            "candidate": candidate.model_dump(mode="json"),
            "status": "pending",
            "reviewedBy": None,
            "reviewedAt": None,
            "adminNote": None,
            "createdAt": SERVER_TIMESTAMP,
        })
        return True
    except Exception:  # noqa: BLE001 — Firestore transient errors must not abort the run
        _logger.exception("Failed to persist candidate %s", candidate.candidate_id)
        return False


async def run_discovery(db: Any) -> DiscoveryRunSummary:
    """End-to-end discovery pass.

    1. Load + validate the YAML allowlist.
    2. Fetch + hash + diff every source against `verified_schemes`.
    3. For each changed source, run the Gemini extractor.
    4. Persist every successfully extracted candidate to Firestore with
       status `"pending"`.
    """
    started_at = datetime.now(UTC)
    errors: list[str] = []
    try:
        sources = load_discovery_sources()
    except RuntimeError as exc:
        _logger.exception("discovery_sources allowlist invalid — aborting run")
        return DiscoveryRunSummary(
            started_at=started_at,
            finished_at=datetime.now(UTC),
            sources_checked=0,
            sources_changed=0,
            candidates_extracted=0,
            candidates_persisted=0,
            errors=[str(exc)],
        )

    changed = await watch_sources(db, sources=sources)
    extracted = 0
    persisted = 0
    for diff in changed:
        candidate = await extract_candidate(diff)
        if candidate is None:
            errors.append(f"extraction failed for source_id={diff.source.id}")
            continue
        extracted += 1
        if _persist_candidate(db, candidate):
            persisted += 1

    return DiscoveryRunSummary(
        started_at=started_at,
        finished_at=datetime.now(UTC),
        sources_checked=len(sources),
        sources_changed=len(changed),
        candidates_extracted=extracted,
        candidates_persisted=persisted,
        errors=errors,
    )
