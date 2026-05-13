# Vertex AI mode (not AI Studio) — AI Studio API key silently demotes billing tier.
# Location pinned to "global" because asia-southeast1 only publishes a subset of the model catalogue.

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

# Surfaced on SSE ErrorEvent.category so the frontend can render category-aware CTAs.
ErrorCategory = Literal[
    "quota_exhausted",
    "service_unavailable",
    "deadline_exceeded",
    "permission_denied",
    "extract_validation",
]


# Register choice (Dewan / 普通话) mirrors frontend/src/lib/i18n/locales/*.json.
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
    # Local-dev fallback for uvicorn started outside `pnpm dev`; Cloud Run never hits this.
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
    return genai.Client(
        vertexai=True,
        project=_resolve_project(),
        location=_resolve_location(),
    )


# 3 total attempts (2 retries) caps worst-case latency around the SSE 60s budget.
_RETRY_MAX_RETRIES = getenv_int("LAYAK_GEMINI_MAX_RETRIES", 2)
try:
    _RETRY_BASE_DELAY_S = float(getenv("LAYAK_GEMINI_BASE_DELAY_SECONDS", "2.0"))
except ValueError:
    _RETRY_BASE_DELAY_S = 2.0


def _is_retryable_api_error(exc: BaseException) -> bool:
    # Prefer the typed APIError code; string fallback defends against transport wrappers that swallow it.
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
    # Full jitter so concurrent 429s don't synchronously retry on the same tick.
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
    # Gemini occasionally emits ```json fences despite response_mime_type=application/json.
    stripped = text.strip()
    m = _FENCE_RE.match(stripped)
    if m:
        return m.group(1).strip()
    return stripped


# Dashed MyKad form first — otherwise \d{5,} would only redact the first chunk.
_DIGIT_RUN_RE = re.compile(r"\b\d{6}[\s-]?\d{2}[\s-]?\d{4}\b|\b\d{5,}\b")


def sanitize_error_message(message: str, max_len: int = 240) -> str:
    # Pydantic ValidationError embeds the offending input — redact ICs before SSE.
    redacted = _DIGIT_RUN_RE.sub("[redacted]", message)
    if len(redacted) > max_len:
        redacted = redacted[: max_len - 1] + "…"
    return redacted


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
    # String-match because google-genai exposes no stable error-code object across versions.
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
    if "validationerror" in lowered and ("profile" in lowered or "extract" in lowered):
        return "extract_validation"
    return None


def humanize_error_message(
    raw: str,
    max_len: int = 240,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> str:
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
    category = categorize_error_message(raw)
    if category is not None:
        catalog = ERROR_CATEGORY_MESSAGES.get(language) or ERROR_CATEGORY_MESSAGES["en"]
        return catalog[category], category
    return sanitize_error_message(raw, max_len), None


def detect_mime(filename: str, data: bytes) -> str:
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
