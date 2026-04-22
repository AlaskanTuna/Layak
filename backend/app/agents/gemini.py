"""Shared Gemini client setup — Vertex AI mode.

Phase 6 Task 6 cutover: the AI Studio API key keeps silently demoting the
project from Tier 1 to Free tier even with billing active. Vertex AI uses the
GCP project's IAM + billing directly, bypasses the AI Studio key tier-management
bug, and properly draws on the project's $25 Google Cloud Credit.

Auth flow:
    Local dev: `gcloud auth application-default login` once. The SDK picks up
        Application Default Credentials automatically.
    Cloud Run: the service account attached to `layak-backend` is the
        runtime identity. It needs `roles/aiplatform.user` (or anything that
        grants `aiplatform.endpoints.predict`); the project default Compute SA
        already inherits this via `roles/editor`.

Configuration:
    `GOOGLE_CLOUD_PROJECT`  — required. The GCP project ID for billing/quota.
    `GOOGLE_CLOUD_LOCATION` — optional. The Vertex AI region. Defaults to
                              `asia-southeast1` so requests stay co-located
                              with the Cloud Run service.

Model routing (Phase 8 Task 4 — per-step assignment, see docs/trd.md §5.1):
    FAST_MODEL      — Gemini 2.5 Flash — multimodal extract (OCR-critical, GA-only).
    WORKER_MODEL    — Gemini 2.5 Flash-Lite — structured classify (~5x cheaper than Flash).
    HEAVY_MODEL     — Gemini 3 Flash Preview — compute_upside (code_execution tool).
                      Cleared by Phase 8 Task 1 probe (2026-04-23):
                      `backend/scripts/probe_gemini_3_flash.py` confirmed both
                      `code_execution` and `response_mime_type=application/json`
                      work against this model in the `global` location. Fallback
                      to `gemini-2.5-pro` if the preview model is ever yanked.
    ORCHESTRATOR    — Gemini 2.5 Pro   — kept for the documented ADK orchestrator
                      role; not currently invoked by the manual `stream_agent_events`
                      loop. Reserved for the optional Move 2b ADK runner cutover.

Region pinning: Phase 8 Task 1 probe found `asia-southeast1` only publishes
`gemini-2.5-flash`, while `global` resolves all four models above. The
`_DEFAULT_LOCATION` flips to `global` so a single Vertex AI endpoint serves
the entire pipeline. Cloud Run service stays in `asia-southeast1` for
co-location with the user-facing frontend.
"""

from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Literal

from google import genai

# Error-recovery category slugs surfaced on the SSE `ErrorEvent.category` so
# the frontend can render category-aware CTAs without substring-matching the
# humanised message. `None` (unknown) triggers the generic "start over" card.
ErrorCategory = Literal[
    "quota_exhausted",
    "service_unavailable",
    "deadline_exceeded",
    "permission_denied",
    "extract_validation",
]

FAST_MODEL = "gemini-2.5-flash"
WORKER_MODEL = "gemini-2.5-flash-lite"
HEAVY_MODEL = "gemini-3-flash-preview"
HEAVY_MODEL_FALLBACK = "gemini-2.5-pro"
ORCHESTRATOR_MODEL = "gemini-2.5-pro"

_DEFAULT_LOCATION = "global"

_DOTENV_CANDIDATES = (
    Path(__file__).resolve().parent.parent.parent.parent / ".env",
    Path.cwd() / ".env",
    Path.cwd().parent / ".env",
)


def _load_var_from_dotenv(key: str) -> str | None:
    """Read `key=value` for the given key from the first dotenv we find.

    Used as a fallback for local dev — uvicorn started outside `pnpm dev`
    won't have the parent shell's env. Production never hits this path because
    Cloud Run injects env vars at deploy time.
    """
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


def _resolve_project() -> str:
    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or _load_var_from_dotenv("GOOGLE_CLOUD_PROJECT")
    if not project:
        raise RuntimeError(
            "GOOGLE_CLOUD_PROJECT not set. Populate the repo-root .env "
            "(see .env.example) or `gcloud config set project <id>` and "
            "export GOOGLE_CLOUD_PROJECT before starting uvicorn."
        )
    return project


def _resolve_location() -> str:
    return (
        os.environ.get("GOOGLE_CLOUD_LOCATION")
        or _load_var_from_dotenv("GOOGLE_CLOUD_LOCATION")
        or _DEFAULT_LOCATION
    )


@lru_cache(maxsize=1)
def get_client() -> genai.Client:
    """Return a cached `google.genai.Client` bound to the project's Vertex AI.

    Credentials resolve through Application Default Credentials — locally via
    `gcloud auth application-default login`, on Cloud Run via the attached
    service account.

    Raises:
        RuntimeError: if `GOOGLE_CLOUD_PROJECT` isn't reachable from env or
            the dotenv fallback.
    """
    return genai.Client(
        vertexai=True,
        project=_resolve_project(),
        location=_resolve_location(),
    )


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


# Match either a raw 5+-digit run OR a MyKad-formatted IC with dash/space
# separators (`900324-06-4321`, `900324 06 4321`). Ordered so the dashed form
# wins: otherwise a naive `\d{5,}` would only redact `900324` and leave `4321`.
_DIGIT_RUN_RE = re.compile(r"\b\d{6}[\s-]?\d{2}[\s-]?\d{4}\b|\b\d{5,}\b")


def sanitize_error_message(message: str, max_len: int = 240) -> str:
    """Redact anything that looks like a long digit run (IC numbers, phone numbers)
    from an error message before it crosses the SSE boundary.

    Pydantic `ValidationError.__str__` can embed the offending input — if Gemini
    hallucinates a 12-digit MyKad IC into a field that fails validation, the raw
    IC would otherwise stream to the browser. Both the raw 12-digit form and the
    dashed `YYMMDD-PB-####` form get replaced with `[redacted]`. Also truncates
    to `max_len` characters so a verbose stack trace doesn't flood the UI.
    """
    redacted = _DIGIT_RUN_RE.sub("[redacted]", message)
    if len(redacted) > max_len:
        redacted = redacted[: max_len - 1] + "…"
    return redacted


# Friendly copy keyed off the upstream error category. Each entry maps a
# `category` slug to the user-facing message — the slug also flows to the
# frontend on the SSE error event so the UI can surface category-aware CTAs
# (e.g. "Try Manual Entry" only when OCR is rate-limited).
ERROR_CATEGORY_MESSAGES: dict[ErrorCategory, str] = {
    "quota_exhausted": (
        "Gemini's daily free-tier quota is exhausted. Try again later, or "
        "switch to Manual Entry mode — it skips the OCR step and runs the rest "
        "of the pipeline against the values you type in."
    ),
    "service_unavailable": (
        "Gemini is temporarily unavailable. Please retry in a minute."
    ),
    "deadline_exceeded": (
        "The Gemini request timed out. Try smaller documents or retry."
    ),
    "permission_denied": (
        "Gemini access is misconfigured on the server. The team has been "
        "notified — please try again later."
    ),
    "extract_validation": (
        "We extracted the document but the result didn't fit our schema. "
        "Try clearer scans, or use Manual Entry mode to bypass OCR."
    ),
}


def categorize_error_message(raw: str) -> ErrorCategory | None:
    """Return a `ERROR_CATEGORY_MESSAGES` slug for known upstream errors, or `None`.

    Pure string matching — the google-genai SDK doesn't expose a stable error
    code object across versions, so we sniff the formatted exception text.
    Each branch is intentionally conservative: only flag errors whose user-
    facing remediation differs from the default "something broke" path.

    Both google.genai's `ClientError: 429 RESOURCE_EXHAUSTED` form and
    google.api_core's `ResourceExhausted` (no underscore) class-name form
    are matched — the SDK serialises differently across paths.
    """
    lowered = raw.lower()
    if (
        "429" in raw
        or "resource_exhausted" in lowered
        or "resourceexhausted" in lowered
        or "quota" in lowered
    ):
        return "quota_exhausted"
    if (
        "503" in raw
        or "service_unavailable" in lowered
        or "serviceunavailable" in lowered
        or "unavailable" in lowered
    ):
        return "service_unavailable"
    if "504" in raw or "deadline_exceeded" in lowered or "deadlineexceeded" in lowered or "timeout" in lowered:
        return "deadline_exceeded"
    if (
        "401" in raw
        or "403" in raw
        or "permission_denied" in lowered
        or "permissiondenied" in lowered
        or "unauthenticated" in lowered
    ):
        return "permission_denied"
    # Pydantic schema drift on Gemini's structured output. Surface a clearer
    # remediation than the raw `1 validation error for Profile ...` string.
    if "validationerror" in lowered and ("profile" in lowered or "extract" in lowered):
        return "extract_validation"
    return None


def humanize_error_message(raw: str, max_len: int = 240) -> str:
    """User-facing copy for an upstream pipeline error.

    For known categories returns the static remediation copy verbatim — those
    strings carry no PII so digit redaction is unnecessary. For everything else
    falls through to `sanitize_error_message` so unknown errors still get IC
    redaction + truncation before reaching the UI.
    """
    category = categorize_error_message(raw)
    if category is not None:
        return ERROR_CATEGORY_MESSAGES[category]
    return sanitize_error_message(raw, max_len)


def humanize_error(raw: str, max_len: int = 240) -> tuple[str, ErrorCategory | None]:
    """Pair of `(user-facing message, category slug)` for an upstream error.

    Convenience for callers that need both halves at once — the orchestrator
    emits the pair onto the SSE `ErrorEvent` so the frontend renders
    category-tailored CTAs. Categories that don't match a known pattern return
    `(sanitized_raw, None)`; the frontend treats `None` as the generic "start
    over" branch.
    """
    category = categorize_error_message(raw)
    if category is not None:
        return ERROR_CATEGORY_MESSAGES[category], category
    return sanitize_error_message(raw, max_len), None


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
