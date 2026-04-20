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

from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse

from app.agents.root_agent import stream_agent_events

app = FastAPI(title="Layak Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    # Dev: regex matches any localhost port (PO2 runs :6767, scaffold default is :3000).
    # Prod: the Cloud Run frontend URL is added to `allow_origins` at Task 6 deploy time.
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok", "version": app.version}


@app.post("/api/agent/intake")
async def intake(
    ic: Annotated[UploadFile, File()],
    payslip: Annotated[UploadFile, File()],
    utility: Annotated[UploadFile, File()],
) -> StreamingResponse:
    """Stream the five-step agent pipeline as Server-Sent Events.

    Task 1 scaffold emits: step_started(extract) → step_result(extract) →
    step_started(match) → step_result(match) → done(empty packet). The full
    five-step pipeline plus Gemini wiring lands in Phase 1 Task 3.
    """
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
