"""Tests for `app.agents.gemini.humanize_error_message` + categorize_error_message.

Covers the contract surface used by `root_agent.stream_agent_events` when
catching Gemini SDK exceptions before forwarding them via the SSE error
event. The categorisation must be:
- conservative — only flag errors whose remediation differs from default,
- privacy-preserving — friendly copy never embeds caller data,
- backwards-compatible — anything unrecognised falls through to
  `sanitize_error_message` (digit redaction + truncation).
"""

from __future__ import annotations

import pytest

from app.agents.gemini import (
    ERROR_CATEGORY_MESSAGES,
    categorize_error_message,
    humanize_error_message,
    sanitize_error_message,
)


@pytest.mark.parametrize(
    "raw, expected_category",
    [
        ("ClientError: 429 RESOURCE_EXHAUSTED. {...quota...}", "quota_exhausted"),
        ("ResourceExhausted: quota exceeded for project foo", "quota_exhausted"),
        ("ClientError: 503 SERVICE_UNAVAILABLE. retry later", "service_unavailable"),
        ("ServiceUnavailable: gemini backend unreachable", "service_unavailable"),
        ("DEADLINE_EXCEEDED: response timed out after 60s", "deadline_exceeded"),
        ("504 Gateway Timeout", "deadline_exceeded"),
        ("PermissionDenied: 403 caller lacks predict.generateContent", "permission_denied"),
        ("Unauthenticated: 401 invalid API key", "permission_denied"),
        (
            "ValidationError: 1 validation error for Profile name field required",
            "extract_validation",
        ),
    ],
)
def test_categorize_error_message_known_categories(raw: str, expected_category: str) -> None:
    assert categorize_error_message(raw) == expected_category


@pytest.mark.parametrize(
    "raw",
    [
        "Some completely unrelated network error",
        "TypeError: 'NoneType' object is not subscriptable",
        "asyncio.CancelledError",
    ],
)
def test_categorize_error_message_unknown_returns_none(raw: str) -> None:
    assert categorize_error_message(raw) is None


def test_humanize_returns_friendly_copy_for_known_category() -> None:
    raw = "ClientError: 429 RESOURCE_EXHAUSTED. caller exhausted free-tier quota"
    out = humanize_error_message(raw)
    # Static remediation copy — verbatim from the table.
    assert out == ERROR_CATEGORY_MESSAGES["quota_exhausted"]
    # And in particular, it suggests Manual Entry as the recovery path.
    assert "Manual Entry" in out


def test_humanize_falls_through_to_sanitize_on_unknown_error() -> None:
    raw = "Pydantic ValidationError: ic_last4=900324064321 not 4 digits"
    out = humanize_error_message(raw)
    # No category match — we get the digit-redacted, truncated raw.
    assert out == sanitize_error_message(raw)
    assert "[redacted]" in out


def test_humanize_friendly_copy_carries_no_caller_data() -> None:
    """Sanity check: the friendly remediation strings contain no digit runs.

    If a static template ever embeds an IC-shaped placeholder, we'd want the
    digit-redaction pass to run on it too. This test guards against that
    silently regressing.
    """
    for category, copy in ERROR_CATEGORY_MESSAGES.items():
        assert sanitize_error_message(copy) == copy[: 240 - 1] + "…" if len(copy) > 240 else copy, (
            f"category {category!r} contains digits the sanitiser would redact"
        )


def test_humanize_truncation_still_applied_on_unknown_error() -> None:
    raw = "Some generic boom " * 50  # >> 240 chars
    out = humanize_error_message(raw, max_len=240)
    assert len(out) == 240
    assert out.endswith("…")
