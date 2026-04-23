"""Tests for `app.agents.gemini.generate_with_retry`.

The retry helper exists to rescue the per-minute Vertex AI quota dips we hit
during the 3-concurrent-user smoke test on classify (Flash-Lite). Contract:

  - Success on the first try → no sleep, return value passed through.
  - Retryable transient error (429, 503, 504) → sleep with jittered exponential
    backoff and retry up to `max_retries` times.
  - Exhaustion → re-raise the last exception so the SSE error pipeline can
    humanise it for the user.
  - Non-retryable error (400, 401/403, Pydantic ValidationError, etc.) → no
    retry, immediate re-raise. Retrying these would only delay user feedback.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest

from app.agents import gemini as gemini_module
from app.agents.gemini import generate_with_retry
from google.genai import errors as genai_errors


def _api_error(code: int) -> genai_errors.APIError:
    """Build an APIError with the given HTTP status. Mirrors what `raise_error`
    constructs from a real Vertex AI response body."""
    body = {"error": {"code": code, "status": "RESOURCE_EXHAUSTED", "message": "quota"}}
    if 400 <= code < 500:
        return genai_errors.ClientError(code, body, None)
    return genai_errors.ServerError(code, body, None)


@pytest.fixture(autouse=True)
def _no_real_sleep(monkeypatch: pytest.MonkeyPatch) -> list[float]:
    """Replace `time.sleep` with a recording stub so tests don't actually wait."""
    sleeps: list[float] = []
    monkeypatch.setattr(gemini_module.time, "sleep", lambda s: sleeps.append(s))
    return sleeps


def _client_with(side_effect: Any) -> MagicMock:
    """Build a mock `genai.Client` whose `.models.generate_content` follows
    the given side_effect (return value, exception, or list)."""
    client = MagicMock()
    client.models.generate_content.side_effect = side_effect
    return client


def test_returns_first_response_on_success(_no_real_sleep: list[float]) -> None:
    sentinel = object()
    client = _client_with([sentinel])

    result = generate_with_retry(client, model="m", contents="c", config="cfg")

    assert result is sentinel
    assert client.models.generate_content.call_count == 1
    assert _no_real_sleep == []  # no retry → no sleep


def test_retries_on_429_then_succeeds(_no_real_sleep: list[float]) -> None:
    sentinel = object()
    client = _client_with([_api_error(429), sentinel])

    result = generate_with_retry(client, model="m", contents="c", config="cfg")

    assert result is sentinel
    assert client.models.generate_content.call_count == 2
    assert len(_no_real_sleep) == 1  # one sleep between the two attempts


def test_retries_on_503_then_succeeds(_no_real_sleep: list[float]) -> None:
    sentinel = object()
    client = _client_with([_api_error(503), sentinel])

    result = generate_with_retry(client, model="m", contents="c", config="cfg")

    assert result is sentinel
    assert client.models.generate_content.call_count == 2


def test_reraises_after_exhausting_retries(_no_real_sleep: list[float]) -> None:
    err = _api_error(429)
    # Force 3 attempts total (max_retries=2 default + initial = 3 calls all 429).
    client = _client_with([err, err, err])

    with pytest.raises(genai_errors.ClientError) as excinfo:
        generate_with_retry(client, model="m", contents="c", config="cfg")

    assert excinfo.value is err
    assert client.models.generate_content.call_count == 3  # 1 initial + 2 retries
    assert len(_no_real_sleep) == 2  # one sleep between each retry pair


def test_does_not_retry_400_bad_request(_no_real_sleep: list[float]) -> None:
    """400-level errors (other than 429) are caller mistakes, not transient.
    Retrying them would just delay the user feedback."""
    err = _api_error(400)
    client = _client_with([err])

    with pytest.raises(genai_errors.ClientError):
        generate_with_retry(client, model="m", contents="c", config="cfg")

    assert client.models.generate_content.call_count == 1
    assert _no_real_sleep == []


def test_does_not_retry_403_permission_denied(_no_real_sleep: list[float]) -> None:
    """IAM misconfig won't fix itself between attempts."""
    err = _api_error(403)
    client = _client_with([err])

    with pytest.raises(genai_errors.ClientError):
        generate_with_retry(client, model="m", contents="c", config="cfg")

    assert client.models.generate_content.call_count == 1


def test_does_not_retry_arbitrary_runtime_error(_no_real_sleep: list[float]) -> None:
    """Pydantic ValidationError, AttributeError, TypeError etc. shouldn't
    trigger retry — they'd just fail the same way next attempt."""
    client = _client_with([RuntimeError("bug in our code, not a transient issue")])

    with pytest.raises(RuntimeError):
        generate_with_retry(client, model="m", contents="c", config="cfg")

    assert client.models.generate_content.call_count == 1
    assert _no_real_sleep == []


def test_string_match_fallback_for_untyped_quota_error(_no_real_sleep: list[float]) -> None:
    """If a transport wrapper hides the typed APIError but the str() still
    carries the magic words, the helper should still retry. Defends against
    SDK-version drift that might wrap the underlying error differently."""
    sentinel = object()
    untyped = Exception("ResourceExhausted: 429 quota exceeded for project")
    client = _client_with([untyped, sentinel])

    result = generate_with_retry(client, model="m", contents="c", config="cfg")

    assert result is sentinel
    assert client.models.generate_content.call_count == 2


def test_max_retries_zero_disables_retry(_no_real_sleep: list[float]) -> None:
    """Operator override path — `max_retries=0` reduces to a bare passthrough
    of the SDK call, useful for the smoke-test scripts that want to see real
    quota errors raw without backoff hiding the issue."""
    err = _api_error(429)
    client = _client_with([err])

    with pytest.raises(genai_errors.ClientError):
        generate_with_retry(client, model="m", contents="c", config="cfg", max_retries=0)

    assert client.models.generate_content.call_count == 1
    assert _no_real_sleep == []


def test_passes_kwargs_through_to_sdk(_no_real_sleep: list[float]) -> None:
    """Ensure model/contents/config flow through unchanged to the SDK call —
    the helper must be a transparent wrapper, not a transformer."""
    client = _client_with([object()])

    cfg = MagicMock()
    contents = ["one", "two"]
    generate_with_retry(client, model="gemini-2.5-flash-lite", contents=contents, config=cfg)

    client.models.generate_content.assert_called_once_with(
        model="gemini-2.5-flash-lite", contents=contents, config=cfg
    )
