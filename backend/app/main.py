"""Layak backend — FastAPI entry point.

`POST /api/agent/intake` accepts three multipart uploads (IC, payslip, utility bill)
and streams the five-step agent pipeline as Server-Sent Events.

Locked SSE wire format (see app/schema/events.py):
    step_started { type, step }
    step_result  { type, step, data }
    done         { type, packet }
    error        { type, step, message }

Run locally:
    uvicorn app.main:app --port 8080 --reload
"""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from starlette.responses import StreamingResponse

# Load repo-root .env into os.environ before any agent module reads GEMINI_API_KEY.
# Path: backend/app/main.py -> project root is three levels up.
_DOTENV = Path(__file__).resolve().parent.parent.parent / ".env"
if _DOTENV.is_file():
    for _line in _DOTENV.read_text(encoding="utf-8").splitlines():
        if _line.startswith("#") or "=" not in _line:
            continue
        _k, _v = _line.split("=", 1)
        _k, _v = _k.strip(), _v.strip()
        if _k and _v and _k not in os.environ:
            os.environ[_k] = _v

from app.agents.root_agent import stream_agent_events  # noqa: E402 — after dotenv load
from app.agents.tools.build_profile import build_profile_from_manual_entry  # noqa: E402
from app.auth import CurrentUser, get_firestore  # noqa: E402 — after dotenv load
from app.routes.evaluations import router as evaluations_router  # noqa: E402
from app.schema.manual_entry import DependantInput, ManualEntryPayload  # noqa: E402
from app.services.evaluation_persistence import (  # noqa: E402
    create_running_evaluation,
    persist_event_stream,
)
from app.services.rate_limit import enforce_quota  # noqa: E402

app = FastAPI(title="Layak Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    # Dev: any localhost port. Prod: ONLY the two Cloud Run URLs that back the
    # Layak frontend. A broad `*.run.app` allowlist would let any attacker-hosted
    # Cloud Run service drive the SSE pipeline from a victim's browser and
    # exfiltrate the extracted profile JSON — locked down after the Task 6 audit.
    allow_origins=[
        "https://layak-frontend-297019726346.asia-southeast1.run.app",
        "https://layak-frontend-i2t7hf6seq-as.a.run.app",
    ],
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


app.include_router(evaluations_router)


@app.get("/health")
async def health() -> dict[str, str]:
    # Cloud Run / Knative intercepts `/healthz` at the GFE layer before it
    # reaches the container — use `/health` so smoke tests hit the app.
    return {"status": "ok", "version": app.version}


_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@app.post("/api/agent/intake")
async def intake(
    user: CurrentUser,
    ic: Annotated[UploadFile, File()],
    payslip: Annotated[UploadFile, File()],
    utility: Annotated[UploadFile, File()],
    dependants: Annotated[str | None, Form()] = None,
) -> Response:
    """Stream the five-step agent pipeline as Server-Sent Events.

    Authed: caller must supply `Authorization: Bearer <firebase-id-token>`.
    `current_user` verifies the token and lazy-creates `users/{uid}` on first
    touch, so the SSE stream that follows already runs in the user's context.

    Phase 3 Task 1: creates `evaluations/{evalId}` with `status="running"`
    before opening the stream, then mirrors each SSE event into the Firestore
    doc as it flows through. `DoneEvent.eval_id` carries the id so the
    frontend can route to `/dashboard/evaluation/results/[id]`.

    `dependants` is an optional JSON-encoded list of `DependantInput` rows
    supplied from the UploadWidget's Household section. When present, the
    backend overlays them onto the Gemini-extracted Profile before classify
    runs — MyKad / payslip / utility bills don't disclose dependants, so the
    OCR path otherwise returns an empty household and silently under-matches
    schemes that depend on children / elderly parents.
    """
    uploads: dict[str, tuple[str, bytes]] = {
        "ic": (ic.filename or "ic.bin", await ic.read()),
        "payslip": (payslip.filename or "payslip.bin", await payslip.read()),
        "utility": (utility.filename or "utility.bin", await utility.read()),
    }

    dependants_override: list[DependantInput] | None = None
    if dependants:
        try:
            raw = json.loads(dependants)
            dependants_override = [DependantInput.model_validate(d) for d in raw]
        except (json.JSONDecodeError, ValidationError, TypeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid dependants JSON: {exc}",
            ) from exc

    db = get_firestore()

    # Phase 3 Task 2 preflight — free-tier cap check before any Firestore
    # write or SSE stream opens. Pro tier bypasses.
    limited = enforce_quota(db, user)
    if limited is not None:
        return limited

    # Pre-SSE Firestore write. On failure this raises HTTPException(503) and
    # the client never sees an SSE stream open — consistent with the frontend
    # treating 5xx as retryable.
    eval_id, doc_ref = create_running_evaluation(db, user_id=user.uid)

    events = stream_agent_events(uploads, dependants_override=dependants_override)

    async def event_stream() -> AsyncIterator[bytes]:
        async for event in persist_event_stream(events, eval_id=eval_id, doc_ref=doc_ref):
            yield f"data: {event.model_dump_json()}\n\n".encode()

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=_SSE_HEADERS)


@app.post("/api/agent/intake_manual")
async def intake_manual(
    user: CurrentUser,
    payload: ManualEntryPayload,
) -> Response:
    """Privacy-first alternative to `/api/agent/intake` — JSON body, no OCR.

    Authed: same `current_user` gate as the multipart intake above.

    The client hands us the fields the OCR extract step would have derived,
    we build a `Profile` in pure Python, and the rest of the five-step
    pipeline runs unchanged. The SSE wire still emits all five steps so the
    frontend stepper is unchanged. The built Profile is persisted to
    `evaluations/{evalId}.profile` before the stream opens so the running-
    state results page can render it without waiting for the extract event.

    Contract: docs/prd.md FR-21 + docs/superpowers/specs/2026-04-21-manual-entry-mode-design.md.
    """
    profile = build_profile_from_manual_entry(payload)

    db = get_firestore()

    # Phase 3 Task 2 preflight — free-tier cap check before any Firestore
    # write or SSE stream opens. Pro tier bypasses.
    limited = enforce_quota(db, user)
    if limited is not None:
        return limited

    eval_id, doc_ref = create_running_evaluation(
        db,
        user_id=user.uid,
        profile=profile,
    )

    events = stream_agent_events(prebuilt_profile=profile)

    async def event_stream() -> AsyncIterator[bytes]:
        async for event in persist_event_stream(events, eval_id=eval_id, doc_ref=doc_ref):
            yield f"data: {event.model_dump_json()}\n\n".encode()

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=_SSE_HEADERS)
