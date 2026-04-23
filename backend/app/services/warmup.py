"""Phase 10 polish — pre-warm the chat dependencies on FastAPI startup.

Fires two best-effort sync calls during the FastAPI lifespan startup so the
first user-facing chat request doesn't pay cold-start cost on either:

    1. Gemini (`gemini-2.5-flash`) — Vertex AI model warm-up. Cold first-token
       can be 3-5 s after a few minutes of idle traffic in the project.
    2. Discovery Engine (`layak-schemes-v1`) — the retrieval Tool's cold-path
       can add ~500 ms - 2 s on the first query of a session.

Both calls run via `asyncio.to_thread` because the underlying SDKs are sync.
Failures are logged and swallowed — warm-up never breaks startup. Toggleable
via `LAYAK_WARMUP_ENABLED` env var (default `"true"`); tests set it to
`"false"` via `monkeypatch.setenv` to keep the suite fast and offline.

The lifespan handler in `app/main.py` schedules `warmup_chat_dependencies()`
as a background task (`asyncio.create_task`) so uvicorn becomes ready to
accept traffic immediately. A user who hits chat <3 s after boot may still
see cold-path latency; one who waits longer benefits.
"""

from __future__ import annotations

import asyncio
import logging
import time

from app.config import getenv

_logger = logging.getLogger(__name__)


def _is_enabled() -> bool:
    return getenv("LAYAK_WARMUP_ENABLED", "true").lower() in ("1", "true", "yes")


def _warmup_gemini() -> float:
    """Fire one minimal `generate_content` against the chat model.

    `max_output_tokens=1` + `temperature=0` keeps the call sub-second under
    normal conditions while still triggering the model + Vertex AI auth
    handshake that dominates first-call latency.
    """
    from google.genai import types

    from app.agents.gemini import get_client
    from app.services.chat import CHAT_MODEL

    start = time.perf_counter()
    client = get_client()
    client.models.generate_content(
        model=CHAT_MODEL,
        contents="ping",
        config=types.GenerateContentConfig(
            max_output_tokens=1,
            temperature=0.0,
        ),
    )
    return time.perf_counter() - start


def _warmup_discovery_engine() -> float:
    """Fire one tiny Discovery Engine query so the data store is hot.

    Reuses `search_passage` (the helper rule modules already use) so the
    cached `SearchServiceClient` is the one chat will hit at request time.
    """
    from app.services.vertex_ai_search import search_passage

    start = time.perf_counter()
    search_passage("STR", top_k=1)
    return time.perf_counter() - start


async def warmup_chat_dependencies() -> None:
    """Schedule the two warm-ups in parallel; log result of each.

    Designed to be fired via `asyncio.create_task(warmup_chat_dependencies())`
    from the FastAPI lifespan startup so the event loop is free to serve
    requests while warm-up completes.
    """
    if not _is_enabled():
        _logger.info("Chat warmup skipped (LAYAK_WARMUP_ENABLED is false)")
        return

    _logger.info("Chat warmup starting (Gemini + Discovery Engine)")
    results = await asyncio.gather(
        asyncio.to_thread(_warmup_gemini),
        asyncio.to_thread(_warmup_discovery_engine),
        return_exceptions=True,
    )
    for name, res in zip(("gemini", "discovery_engine"), results, strict=True):
        if isinstance(res, BaseException):
            _logger.warning("Chat warmup %s failed (non-fatal): %s", name, res)
        else:
            _logger.info("Chat warmup %s OK in %.2f s", name, res)
