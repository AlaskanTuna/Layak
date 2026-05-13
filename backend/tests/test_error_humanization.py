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
    humanize_error,
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
    raw = "ClientError: 429 RESOURCE_EXHAUSTED. caller exhausted per-minute project quota"
    out = humanize_error_message(raw)
    # Static remediation copy — verbatim from the English table (default language).
    assert out == ERROR_CATEGORY_MESSAGES["en"]["quota_exhausted"]
    # The post-Phase 6 copy leads with a wait-and-retry CTA (the SDK already
    # retries 429s on its own); Manual Entry is no longer a relevant escape
    # hatch for non-extract steps so it's been dropped from this string.
    lowered = out.lower()
    assert "wait" in lowered
    assert any(token in lowered for token in ("retry", "retries", "try again"))
    assert "free-tier" not in out


def test_humanize_falls_through_to_sanitize_on_unknown_error() -> None:
    raw = "Pydantic ValidationError: monthly_income_rm=1234567890 outside [0, 1000000]"
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
    for language, by_category in ERROR_CATEGORY_MESSAGES.items():
        for category, copy in by_category.items():
            assert sanitize_error_message(copy) == copy[: 240 - 1] + "…" if len(copy) > 240 else copy, (
                f"lang {language!r} category {category!r} contains digits the sanitiser would redact"
            )


def test_humanize_truncation_still_applied_on_unknown_error() -> None:
    raw = "Some generic boom " * 50  # >> 240 chars
    out = humanize_error_message(raw, max_len=240)
    assert len(out) == 240
    assert out.endswith("…")


# ----------------------------------------------------------------------------
# `humanize_error` tuple helper feeding the SSE ErrorEvent
# ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    "raw, expected_category",
    [
        ("ClientError: 429 RESOURCE_EXHAUSTED.", "quota_exhausted"),
        ("503 SERVICE_UNAVAILABLE", "service_unavailable"),
        ("DEADLINE_EXCEEDED: timed out", "deadline_exceeded"),
        ("PermissionDenied: 403", "permission_denied"),
        ("ValidationError: 1 validation error for Profile", "extract_validation"),
    ],
)
def test_humanize_error_returns_message_and_category_for_known_categories(
    raw: str, expected_category: str
) -> None:
    """Each known category → `(static_copy, slug)`; slug mirrors the Literal in events.py."""
    message, category = humanize_error(raw)
    assert category == expected_category
    assert message == ERROR_CATEGORY_MESSAGES["en"][expected_category]


def test_humanize_error_returns_none_category_for_unknown_error() -> None:
    """Unknown error → `(sanitized_raw, None)` so the frontend falls through
    to the generic recovery card. `None` is the sentinel the SSE ErrorEvent
    sends across the wire."""
    raw = "RuntimeError: unexpected internal state, IC 900324064321 leaked"
    message, category = humanize_error(raw)
    assert category is None
    # Unknown path still runs through sanitisation — the IC digits are redacted.
    assert message == sanitize_error_message(raw)
    assert "[redacted]" in message


def test_humanize_error_tuple_agrees_with_humanize_error_message() -> None:
    """Regression guard — the tuple form and the string form must return the
    same user-facing message for every known category plus the unknown path.
    If they drift, the SSE error card would show one copy on first render and
    a different copy on Firestore-rehydrate."""
    cases = [
        "ClientError: 429 RESOURCE_EXHAUSTED",
        "503 SERVICE_UNAVAILABLE",
        "DEADLINE_EXCEEDED",
        "PermissionDenied: 403",
        "ValidationError: Profile extract broken",
        "asyncio.CancelledError — no idea",
    ]
    for raw in cases:
        tuple_msg, _category = humanize_error(raw)
        assert tuple_msg == humanize_error_message(raw), f"drift on: {raw!r}"


def test_humanize_error_category_slugs_match_events_literal() -> None:
    """The backend's `ErrorCategory` Literal in `app/schema/events.py` must
    enumerate exactly the same slugs `ERROR_CATEGORY_MESSAGES` exposes.
    Adding a category on one side and forgetting the other would let the
    ErrorEvent pass validation locally but reject on the frontend typed
    mirror in `frontend/src/lib/agent-types.ts`."""
    from typing import get_args

    from app.schema.events import ErrorCategory

    schema_slugs = set(get_args(ErrorCategory))
    # Every language's catalog must enumerate the full set of categories
    # (test_rule_copy_coverage covers the rule side; this covers the
    # error-humanization side). Pick any language's inner dict to compare.
    for language, by_category in ERROR_CATEGORY_MESSAGES.items():
        impl_slugs = set(by_category.keys())
        assert schema_slugs == impl_slugs, (
            f"slug drift in language={language!r}: schema={schema_slugs} impl={impl_slugs}"
        )
