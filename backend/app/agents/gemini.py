"""Shared Gemini client setup — Vertex AI mode.

The AI Studio API key keeps silently demoting the project from Tier 1 to
Free tier even with billing active. Vertex AI uses the GCP project's IAM +
billing directly, bypasses the AI Studio key tier-management bug, and
properly draws on the project's Google Cloud Credit.

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

Model routing (per-step assignment):
    FAST_MODEL      — Gemini 3.1 Flash-Lite — multimodal extract (OCR).
    WORKER_MODEL    — Gemini 3.1 Flash-Lite — structured classify.
    HEAVY_MODEL     — Gemini 2.5 Pro — compute_upside (code_execution tool).
                      `gemini-3.1-flash-lite` availability confirmed via
                      `backend/scripts/probe_gemini_3_1_flash_lite.py`:
                      both `response_mime_type=application/json` and
                      multimodal image input work against the canonical
                      `gemini-3.1-flash-lite` ID in the `global` location.
    ORCHESTRATOR    — Gemini 2.5 Pro   — reserved for an optional ADK orchestrator
                      runner cutover; not currently invoked by the manual
                      `stream_agent_events` loop.

Region pinning: `asia-southeast1` only publishes a subset of the publisher
catalogue, while `global` resolves the full matrix. The `_DEFAULT_LOCATION`
flips to `global` so a single Vertex AI endpoint serves the entire
pipeline. Cloud Run service stays in `asia-southeast1` for co-location with
the user-facing frontend.
"""

from __future__ import annotations

import logging
import os
import random
import re
import time
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

from google import genai
from google.genai import errors as genai_errors

from app.config import getenv, getenv_int
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage

_log = logging.getLogger(__name__)

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


# Per-language instruction block interpolated into worker-model prompts
# (classify, compute_upside). The three values use the same Dewan / 普通话
# registers as `frontend/src/lib/i18n/locales/*.json` so prompt output reads
# consistently with the UI chrome around it.
LANGUAGE_INSTRUCTION_BLOCK: dict[SupportedLanguage, str] = {
    "en": "Respond in plain English.",
    "ms": (
        "Respond in Bahasa Malaysia — use the Dewan register (the same "
        "formal style as government circulars / risalah)."
    ),
    "zh": (
        "Respond in Simplified Chinese (简体中文 / 普通话 register). Use "
        "Mainland-style phrasing; avoid Traditional characters."
    ),
}

# Per-step model assignment — overridable via `LAYAK_*` env vars (see
# `app.config.getenv` and `.env.example`). Resolved at module import; Cloud
# Run env-var injection or `.env` overrides win over these literal defaults.
FAST_MODEL = getenv("LAYAK_FAST_MODEL", "gemini-3.1-flash-lite")
WORKER_MODEL = getenv("LAYAK_WORKER_MODEL", "gemini-3.1-flash-lite")
HEAVY_MODEL = getenv("LAYAK_HEAVY_MODEL", "gemini-2.5-pro")
HEAVY_MODEL_FALLBACK = getenv("LAYAK_HEAVY_MODEL_FALLBACK", "gemini-2.5-pro")
ORCHESTRATOR_MODEL = getenv("LAYAK_ORCHESTRATOR_MODEL", "gemini-2.5-pro")

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


# Retry knobs — overridable via `LAYAK_*` env vars (see `app.config.getenv`).
# Default 2 retries (3 total attempts) with a 2.0 s base. Exponential backoff
# with full jitter rescues the common case observed during the 3-concurrent
# smoke test: a Vertex AI Flash-Lite per-minute quota dip on classify that
# clears within seconds. Anything beyond 3 attempts pushes the SSE pipeline
# past a comfortable 60 s budget and starts blocking client perception of
# progress, so cap defensively rather than waiting out a true outage.
_RETRY_MAX_RETRIES = getenv_int("LAYAK_GEMINI_MAX_RETRIES", 2)
try:
    _RETRY_BASE_DELAY_S = float(getenv("LAYAK_GEMINI_BASE_DELAY_SECONDS", "2.0"))
except ValueError:
    _RETRY_BASE_DELAY_S = 2.0


def _is_retryable_api_error(exc: BaseException) -> bool:
    """Return True for transient Vertex AI errors worth a retry.

    Two paths:
      1. Typed `google.genai.errors.APIError` — definitive. The status code
         tells us exactly what happened, and we trust it without falling back
         to string parsing (a 400 whose body happens to mention "quota" must
         NOT be retried — the request itself is malformed).
      2. Untyped `Exception` whose `str()` carries the magic words — string
         fallback. Defends against transport wrappers (httpx pool errors,
         aiohttp timeouts) that swallow the typed APIError.
    """
    if isinstance(exc, genai_errors.APIError):
        code = getattr(exc, "code", None)
        if code == 429:
            return True
        return isinstance(code, int) and 500 <= code < 600
    return categorize_error_message(str(exc)) in {"quota_exhausted", "service_unavailable", "deadline_exceeded"}


def generate_with_retry(
    client: genai.Client,
    *,
    model: str,
    contents: Any,
    config: Any,
    max_retries: int | None = None,
    base_delay_seconds: float | None = None,
) -> Any:
    """Call `client.models.generate_content` with exponential-backoff retry.

    Retries only on transient Vertex AI failures (HTTP 429 / 5xx). Permission
    errors, bad-request validation errors, and Pydantic schema drift on the
    response all re-raise immediately so the caller's SSE error path can
    surface a category-tailored CTA without the user waiting through pointless
    retry windows.

    Backoff uses *full jitter* — `random.uniform(0, base * 2**attempt)` —
    so concurrent callers that all 429 don't synchronously retry on the
    exact same wall-clock tick. With defaults (2 retries, 2.0 s base) the
    worst-case added latency is ~6 s before re-raising; a single retry
    typically rescues a per-minute quota blip in <3 s.
    """
    retries = _RETRY_MAX_RETRIES if max_retries is None else max_retries
    base = _RETRY_BASE_DELAY_S if base_delay_seconds is None else base_delay_seconds
    attempt = 0
    while True:
        try:
            return client.models.generate_content(model=model, contents=contents, config=config)
        except Exception as exc:  # noqa: BLE001 — typed re-raise inside
            if attempt >= retries or not _is_retryable_api_error(exc):
                raise
            sleep_for = random.uniform(0, base * (2**attempt))
            _log.warning(
                "Gemini generate_content failed with retryable error (attempt %d/%d, sleeping %.2fs): %s",
                attempt + 1,
                retries + 1,
                sleep_for,
                exc,
            )
            time.sleep(sleep_for)
            attempt += 1


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


# Friendly copy keyed off (language, upstream error category). The category
# slug flows to the frontend on the SSE error event so the UI can surface
# category-aware CTAs (e.g. "Try Manual Entry" only when OCR is rate-limited);
# only the human-readable `message` localises.
ERROR_CATEGORY_MESSAGES: dict[SupportedLanguage, dict[ErrorCategory, str]] = {
    "en": {
        "quota_exhausted": (
            "Gemini is rate-limited right now — the project's per-minute quota "
            "for this model is temporarily exceeded. Please wait about 30 seconds "
            "and try again. The pipeline already retries transient 429s on its own."
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
    },
    "ms": {
        "quota_exhausted": (
            "Gemini sedang dihadkan kadarnya — kuota seminit projek untuk "
            "model ini telah dilampaui buat sementara. Sila tunggu kira-kira "
            "30 saat dan cuba lagi. Saluran paip kami sudah pun mencuba "
            "semula ralat 429 sementara secara automatik."
        ),
        "service_unavailable": (
            "Gemini tidak tersedia buat sementara waktu. Sila cuba lagi "
            "dalam seminit."
        ),
        "deadline_exceeded": (
            "Permintaan Gemini telah tamat masa. Cuba dokumen yang lebih "
            "kecil atau hantar semula."
        ),
        "permission_denied": (
            "Akses Gemini tidak dikonfigurasi dengan betul pada pelayan. "
            "Pasukan kami telah dimaklumkan — sila cuba lagi kemudian."
        ),
        "extract_validation": (
            "Kami berjaya mengekstrak dokumen, tetapi hasilnya tidak "
            "menepati skema kami. Cuba imbasan yang lebih jelas, atau "
            "gunakan mod Kemasukan Manual untuk memintas OCR."
        ),
    },
    "zh": {
        "quota_exhausted": (
            "Gemini 当前正受到限流 —— 此模型的项目每分钟配额已暂时用满。"
            "请稍候约 30 秒后重试。流程本身已会自动重试临时性的 429 错误。"
        ),
        "service_unavailable": (
            "Gemini 服务暂时不可用，请稍后重试。"
        ),
        "deadline_exceeded": (
            "Gemini 请求已超时。请尝试上传更小的文件，或稍后重试。"
        ),
        "permission_denied": (
            "服务器端的 Gemini 访问配置有误。我们已通知团队 —— 请稍后再试。"
        ),
        "extract_validation": (
            "我们已提取文件内容，但结果与我们的字段结构不匹配。请尝试更清晰的扫描件，"
            "或改用手动输入模式以绕过 OCR。"
        ),
    },
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


def humanize_error_message(
    raw: str,
    max_len: int = 240,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> str:
    """User-facing copy for an upstream pipeline error.

    For known categories returns the static remediation copy in the user's
    language — those strings carry no PII so digit redaction is unnecessary.
    For everything else falls through to `sanitize_error_message` so unknown
    errors still get IC redaction + truncation before reaching the UI.
    """
    category = categorize_error_message(raw)
    if category is not None:
        catalog = ERROR_CATEGORY_MESSAGES.get(language) or ERROR_CATEGORY_MESSAGES["en"]
        return catalog[category]
    return sanitize_error_message(raw, max_len)


def humanize_error(
    raw: str,
    max_len: int = 240,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> tuple[str, ErrorCategory | None]:
    """Pair of `(user-facing message, category slug)` for an upstream error.

    Convenience for callers that need both halves at once — the orchestrator
    emits the pair onto the SSE `ErrorEvent` so the frontend renders
    category-tailored CTAs. Categories that don't match a known pattern return
    `(sanitized_raw, None)`; the frontend treats `None` as the generic "start
    over" branch.

    The human-readable message tracks `language`; the category slug stays
    language-neutral (the frontend keys its CTAs off it).
    """
    category = categorize_error_message(raw)
    if category is not None:
        catalog = ERROR_CATEGORY_MESSAGES.get(language) or ERROR_CATEGORY_MESSAGES["en"]
        return catalog[category], category
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
