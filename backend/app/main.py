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

import os
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
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
from app.auth import CurrentUser  # noqa: E402 — after dotenv load

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


@app.get("/health")
async def health() -> dict[str, str]:
    # Cloud Run / Knative intercepts `/healthz` at the GFE layer before it
    # reaches the container — use `/health` so smoke tests hit the app.
    return {"status": "ok", "version": app.version}


@app.post("/api/agent/intake")
async def intake(
    user: CurrentUser,
    ic: Annotated[UploadFile, File()],
    payslip: Annotated[UploadFile, File()],
    utility: Annotated[UploadFile, File()],
) -> StreamingResponse:
    """Stream the five-step agent pipeline as Server-Sent Events.

    Authed: caller must supply `Authorization: Bearer <firebase-id-token>`.
    `current_user` verifies the token and lazy-creates `users/{uid}` on first
    touch, so the SSE stream that follows already runs in the user's context.
    """
    _ = user  # Phase 3 uses user.uid to scope `evaluations/{evalId}` writes.
    uploads: dict[str, tuple[str, bytes]] = {
        "ic": (ic.filename or "ic.bin", await ic.read()),
        "payslip": (payslip.filename or "payslip.bin", await payslip.read()),
        "utility": (utility.filename or "utility.bin", await utility.read()),
    }

    async def event_stream() -> AsyncIterator[bytes]:
        async for event in stream_agent_events(uploads):
            yield f"data: {event.model_dump_json()}\n\n".encode()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
