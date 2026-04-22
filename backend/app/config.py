"""Centralized environment-variable resolution for operational tuning constants.

Single point of truth for `LAYAK_*`-prefixed env vars that override the
hardcoded defaults shipped in code. Mirrors the `.env` fallback pattern
already used in `app/agents/gemini.py::_load_var_from_dotenv` so module-level
constants resolve correctly whether the process was started via
`uvicorn app.main:app` (which preloads `.env` into `os.environ`) or via
`uv run python <script>` (which does not).

Resolution order, per call:

    1. `os.environ.get(key)` — set by Cloud Run `--set-env-vars`, by
       `uvicorn`'s dotenv preload, or by an explicit shell export.
    2. `_load_var_from_dotenv(key)` — direct read from the repo-root `.env`
       so `uv run` smoke scripts pick up the same values without a wrapper.
    3. Hardcoded default passed by the caller.

What lives here:

    - Gemini per-step model assignments (`LAYAK_FAST_MODEL`,
      `LAYAK_WORKER_MODEL`, `LAYAK_HEAVY_MODEL`,
      `LAYAK_HEAVY_MODEL_FALLBACK`, `LAYAK_ORCHESTRATOR_MODEL`)
    - Free-tier rate-limit knobs (`LAYAK_FREE_TIER_LIMIT`,
      `LAYAK_FREE_TIER_WINDOW_HOURS`)
    - Per-rule Vertex AI Search query strings
      (`LAYAK_RAG_QUERY_<SCHEME_ID>`)

What does NOT live here:

    Regulation-transcribed rule-engine constants (relief caps, tax
    brackets, means-test thresholds, scheme rate schedules). Those are
    asserted verbatim against source PDFs by the test suite — moving them
    out of code would let an operator change a citation-grounded number
    without re-validating against the gazette.
"""

from __future__ import annotations

import os
from pathlib import Path

_DOTENV_CANDIDATES = (
    Path(__file__).resolve().parent.parent.parent / ".env",
    Path.cwd() / ".env",
    Path.cwd().parent / ".env",
)


def _load_var_from_dotenv(key: str) -> str | None:
    """Read `key=value` for the given key from the first dotenv we find."""
    prefix = f"{key}="
    for candidate in _DOTENV_CANDIDATES:
        if not candidate.is_file():
            continue
        try:
            for line in candidate.read_text(encoding="utf-8").splitlines():
                if line.startswith(prefix) and len(line) > len(prefix):
                    return line.split("=", 1)[1].strip()
        except OSError:
            continue
    return None


def getenv(key: str, default: str) -> str:
    """Return the env-var value, .env fallback, or hardcoded default."""
    return os.environ.get(key) or _load_var_from_dotenv(key) or default


def getenv_int(key: str, default: int) -> int:
    """Same as `getenv`, but coerces to int. Falls back to `default` on
    `ValueError` so a typoed override never crashes module import."""
    raw = os.environ.get(key) or _load_var_from_dotenv(key)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default
