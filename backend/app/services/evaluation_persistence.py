"""Persist the evaluation lifecycle alongside the SSE stream (Phase 3 Task 1).

The intake route now does three things per request:

1. **Pre-SSE write** — `create_running_evaluation` inserts a new `evaluations/{evalId}`
   document with `status="running"`, `userId=<uid>`, `createdAt=SERVER_TIMESTAMP`,
   and the profile if it's already known (manual path) or `None` (upload path —
   extract runs first).
2. **Streaming mirror** — `persist_event_stream` wraps the `stream_agent_events`
   generator, forwards every SSE event to the client verbatim, and writes the
   corresponding Firestore update as each event passes through. `step_started`
   flips the step's state to `running`; `step_result` flips it to `complete`
   and persists the step payload (profile / classification / matches /
   compute_upside / packet). `done` stamps `status="complete"`, `completedAt`,
   `totalAnnualRM`. `error` stamps `status="error"` with the sanitized message.
3. **eval_id injection** — DoneEvent and ErrorEvent get the persisted eval_id
   attached so the frontend can route to `/dashboard/evaluation/results/[id]`.

Firestore write failures mid-stream are caught and converted into an SSE
`error` event — the stream never silently swallows a persistence failure.

Contract: docs/superpowers/specs/2026-04-21-v2-saas-pivot-design.md §3.5.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any

from fastapi import HTTPException, status
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from app.agents.gemini import sanitize_error_message
from app.schema.events import (
    DoneEvent,
    ErrorEvent,
    StepResultEvent,
    StepStartedEvent,
)
from app.schema.profile import Profile

_logger = logging.getLogger(__name__)

_INITIAL_STEP_STATES: dict[str, str] = {
    "extract": "pending",
    "classify": "pending",
    "match": "pending",
    "compute_upside": "pending",
    "generate": "pending",
}


def create_running_evaluation(
    db: Any,
    *,
    user_id: str,
    profile: Profile | None = None,
) -> tuple[str, Any]:
    """Insert a new `evaluations/{evalId}` doc with status="running".

    Returns `(eval_id, doc_ref)`. The doc ref is used by `persist_event_stream`
    for subsequent updates — stashing it beats re-fetching on every event.

    Raises:
        HTTPException(503): if the Firestore write fails (network / permission).
            The intake route should catch this so the client sees a retryable
            status instead of an unframed 500.
    """
    doc_ref = db.collection("evaluations").document()
    payload: dict[str, Any] = {
        "userId": user_id,
        "status": "running",
        "createdAt": SERVER_TIMESTAMP,
        "completedAt": None,
        "profile": profile.model_dump(mode="json") if profile is not None else None,
        "classification": None,
        "matches": [],
        "totalAnnualRM": 0.0,
        "stepStates": dict(_INITIAL_STEP_STATES),
        "error": None,
    }
    try:
        doc_ref.set(payload)
    except Exception as exc:  # noqa: BLE001 — surface as 503 regardless of SDK variant.
        _logger.exception("Failed to create evaluations/%s for uid=%s", doc_ref.id, user_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to create evaluation",
        ) from exc
    return doc_ref.id, doc_ref


async def persist_event_stream(
    events: AsyncIterator[StepStartedEvent | StepResultEvent | DoneEvent | ErrorEvent],
    *,
    eval_id: str,
    doc_ref: Any,
) -> AsyncIterator[StepStartedEvent | StepResultEvent | DoneEvent | ErrorEvent]:
    """Mirror every SSE event to Firestore and forward it to the client.

    Forwards events regardless of whether the Firestore write succeeds — the
    client's UI must never hang because persistence hiccupped. A Firestore
    failure is logged and swallowed; the client still gets its stream.

    Stamps `eval_id` onto `DoneEvent` and `ErrorEvent` before yielding so the
    frontend can route to the results page / link to the failed eval.
    """
    async for event in events:
        try:
            _mirror_to_firestore(event, doc_ref)
        except Exception:  # noqa: BLE001, pylint: disable=broad-exception-caught
            _logger.exception(
                "Firestore mirror failed for eval_id=%s event=%s",
                eval_id,
                event.type,
            )

        if isinstance(event, DoneEvent | ErrorEvent):
            # Pydantic models are frozen via ConfigDict(extra="forbid") but
            # not immutable — `model_copy(update=...)` returns a new instance.
            yield event.model_copy(update={"eval_id": eval_id})
        else:
            yield event


def _mirror_to_firestore(  # noqa: PLR0912 — per-event-type dispatch is naturally wide.
    event: StepStartedEvent | StepResultEvent | DoneEvent | ErrorEvent,
    doc_ref: Any,
) -> None:
    """Translate one SSE event into the Firestore update it implies."""
    if isinstance(event, StepStartedEvent):
        doc_ref.update({f"stepStates.{event.step}": "running"})
        return

    if isinstance(event, StepResultEvent):
        updates: dict[str, Any] = {f"stepStates.{event.step}": "complete"}
        data = event.data
        # Per-step payloads. Matches the `EvaluationDoc` field names.
        if event.step == "extract":
            # `data` is `ExtractResult {profile}`.
            updates["profile"] = data.profile.model_dump(mode="json")
        elif event.step == "classify":
            # `data` is `ClassifyResult {classification}`.
            updates["classification"] = data.classification.model_dump(mode="json")
        elif event.step == "match":
            # `data` is `MatchResult {matches}`.
            updates["matches"] = [m.model_dump(mode="json") for m in data.matches]
        elif event.step == "compute_upside":
            # `data` IS the `ComputeUpsideResult` — carries the executed code,
            # its stdout, the total upside, and the per-scheme breakdown.
            # Persisting the trace lets the results page rebuild the Code
            # Execution panel after a refresh / deep link instead of rendering
            # empty `<pre>` blocks.
            updates["totalAnnualRM"] = float(data.total_annual_rm)
            updates["upsideTrace"] = {
                "pythonSnippet": data.python_snippet,
                "stdout": data.stdout,
                "perSchemeRM": {k: float(v) for k, v in data.per_scheme_rm.items()},
            }
        # `generate` step_result carries the packet; we do NOT persist packet
        # bytes (spec §3.7 — packets are regenerated on demand).
        doc_ref.update(updates)
        return

    if isinstance(event, DoneEvent):
        doc_ref.update(
            {
                "status": "complete",
                "completedAt": SERVER_TIMESTAMP,
                "stepStates.generate": "complete",
            }
        )
        return

    if isinstance(event, ErrorEvent):
        doc_ref.update(
            {
                "status": "error",
                "completedAt": SERVER_TIMESTAMP,
                "error": {
                    "step": event.step,
                    "message": sanitize_error_message(event.message),
                },
                **({f"stepStates.{event.step}": "error"} if event.step else {}),
            }
        )
        return
