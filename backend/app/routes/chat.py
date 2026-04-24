"""`POST /api/evaluations/{eval_id}/chat` SSE endpoint.

Streams a single grounded chat turn against the loaded evaluation. Auth +
ownership-gating mirrors `routes/evaluations.py::_load_owned_evaluation` —
wrong-owner returns 404 (NOT 403) so the response shape doesn't leak
existence to a guesser.

Wire shape: see `app/schema/chat.py` for the locked Pydantic models.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, HTTPException, status
from starlette.responses import StreamingResponse

from app.auth import CurrentUser, get_firestore
from app.schema.chat import ChatRequest
from app.services.chat import stream_chat_response

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/evaluations", tags=["chat"])

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.post("/{eval_id}/chat")
async def chat_with_evaluation(
    user: CurrentUser,
    eval_id: str,
    payload: ChatRequest,
) -> StreamingResponse:
    """Stream a chat turn grounded on the loaded evaluation.

    Authed: caller must supply `Authorization: Bearer <firebase-id-token>`.
    Owner-gated: 404 (not 403) on wrong-owner, mirroring `get_evaluation`.

    The free-tier rate limit on `/api/agent/intake` doesn't apply here —
    chat turns are cheap relative to the OCR pipeline, and a free-tier user
    who's reached the chat surface has already paid the eval-cost gate.
    Pro / guest callers always pass through.
    """
    db = get_firestore()
    doc_ref = db.collection("evaluations").document(eval_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    eval_doc: dict[str, Any] = snap.to_dict() or {}
    if eval_doc.get("userId") != user.uid:
        # 404 not 403 — see _load_owned_evaluation's reasoning.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")

    # Chat needs the full eval context — running evals are a no-op until done.
    if eval_doc.get("status") == "running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evaluation is still running. Try again once the pipeline completes.",
        )

    async def event_stream() -> AsyncIterator[bytes]:
        async for event in stream_chat_response(eval_doc, payload):
            yield f"data: {event.model_dump_json()}\n\n".encode()

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=_SSE_HEADERS)
