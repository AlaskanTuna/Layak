"""Shared Gemini API client setup.

Loads `GEMINI_API_KEY` from the repo-root `.env` on first client construction
(the backend cwd is `backend/`, so the key lives at `../.env`). The client is
cached so every tool shares one HTTPS connection pool.

Model routing (see docs/trd.md §5.1):
    FAST_MODEL      — Gemini 2.5 Flash — multimodal extract, structured classify, code execution.
    ORCHESTRATOR    — Gemini 2.5 Pro   — ADK RootAgent in Task 3 Path 2+. In practice the
                      hackathon free-tier quota on `gemini-2.5-pro` is tight (429
                      RESOURCE_EXHAUSTED), so Path 2 falls back to Flash for `compute_upside`
                      until we switch to a paid Vertex AI project.
"""

from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path

from google import genai

FAST_MODEL = "gemini-2.5-flash"
ORCHESTRATOR_MODEL = "gemini-2.5-pro"

_DOTENV_CANDIDATES = (
    Path(__file__).resolve().parent.parent.parent.parent / ".env",
    Path.cwd() / ".env",
    Path.cwd().parent / ".env",
)


def _load_key_from_dotenv() -> str | None:
    for candidate in _DOTENV_CANDIDATES:
        if not candidate.is_file():
            continue
        try:
            for line in candidate.read_text(encoding="utf-8").splitlines():
                if line.startswith("GEMINI_API_KEY=") and len(line) > len("GEMINI_API_KEY="):
                    return line.split("=", 1)[1].strip()
        except OSError:
            continue
    return None


@lru_cache(maxsize=1)
def get_client() -> genai.Client:
    """Return a cached `google.genai.Client` authenticated via `GEMINI_API_KEY`.

    Raises:
        RuntimeError: if the key is missing from both the environment and the
            committed dotenv candidates.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or _load_key_from_dotenv()
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY not set. Populate repo-root .env from Secret Manager "
            "(see docs/trd.md §7) or export the env var before starting uvicorn."
        )
    return genai.Client(api_key=api_key)


_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*\n(.*?)\n```\s*$", re.DOTALL | re.IGNORECASE)


def strip_json_fences(text: str) -> str:
    """Remove Markdown ```json ... ``` fences from a Gemini response if present.

    Gemini with `response_mime_type="application/json"` almost always returns bare
    JSON, but occasional drift puts fences around the object. This strips them so
    `Model.model_validate_json()` sees the raw JSON.
    """
    stripped = text.strip()
    m = _FENCE_RE.match(stripped)
    if m:
        return m.group(1).strip()
    return stripped


_DIGIT_RUN_RE = re.compile(r"\b\d{5,}\b")


def sanitize_error_message(message: str, max_len: int = 240) -> str:
    """Redact anything that looks like a long digit run (IC numbers, phone numbers)
    from an error message before it crosses the SSE boundary.

    Pydantic `ValidationError.__str__` can embed the offending input — if Gemini
    hallucinates a 12-digit MyKad IC into a field that fails validation, the raw
    IC would otherwise stream to the browser. Any run of 5+ digits gets replaced
    with `[redacted]`. Also truncates to `max_len` characters so a verbose stack
    trace doesn't flood the UI.
    """
    redacted = _DIGIT_RUN_RE.sub("[redacted]", message)
    if len(redacted) > max_len:
        redacted = redacted[: max_len - 1] + "…"
    return redacted


def detect_mime(filename: str, data: bytes) -> str:
    """Infer a MIME type from file magic bytes with filename-extension fallback."""
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
        return "image/webp"
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return "application/pdf"
    if lower.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    return "application/octet-stream"
