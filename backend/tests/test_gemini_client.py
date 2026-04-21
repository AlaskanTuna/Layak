"""Pin the `gemini.get_client()` Vertex AI contract — Phase 6 Task 6.

`get_client()` must construct a `google.genai.Client` in Vertex AI mode using
the project + location resolved from the environment (with a dotenv fallback
for local dev). The previous AI-Studio API-key path is gone; if anyone tries
to reintroduce `api_key=…` the diff will read suspicious and these tests will
have to be updated.
"""

from __future__ import annotations

import importlib
from unittest.mock import patch

import pytest


@pytest.fixture
def gemini_module(monkeypatch: pytest.MonkeyPatch) -> object:
    """Reload the module fresh per test so `lru_cache` doesn't leak state.

    Stubs `_load_var_from_dotenv` to always return None so the local
    `.env` (which contains real GOOGLE_CLOUD_PROJECT etc.) doesn't bleed
    into env-var-absent test cases.
    """
    import app.agents.gemini as mod

    importlib.reload(mod)
    monkeypatch.setattr(mod, "_load_var_from_dotenv", lambda _key: None)
    yield mod
    importlib.reload(mod)  # reset for the next test


def test_get_client_uses_vertexai_with_env_project_and_location(
    monkeypatch: pytest.MonkeyPatch, gemini_module: object
) -> None:
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "layak-myaifuturehackathon")
    monkeypatch.setenv("GOOGLE_CLOUD_LOCATION", "asia-southeast1")

    with patch("app.agents.gemini.genai.Client") as ctor:
        gemini_module.get_client()

    ctor.assert_called_once_with(
        vertexai=True,
        project="layak-myaifuturehackathon",
        location="asia-southeast1",
    )


def test_get_client_defaults_location_when_unset(
    monkeypatch: pytest.MonkeyPatch, gemini_module: object
) -> None:
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "some-project")
    monkeypatch.delenv("GOOGLE_CLOUD_LOCATION", raising=False)

    with patch("app.agents.gemini.genai.Client") as ctor:
        gemini_module.get_client()

    _args, kwargs = ctor.call_args
    assert kwargs["vertexai"] is True
    assert kwargs["project"] == "some-project"
    assert kwargs["location"] == "asia-southeast1"


def test_get_client_raises_runtime_error_when_project_unset(
    monkeypatch: pytest.MonkeyPatch, gemini_module: object
) -> None:
    monkeypatch.delenv("GOOGLE_CLOUD_PROJECT", raising=False)

    with pytest.raises(RuntimeError, match="GOOGLE_CLOUD_PROJECT"):
        gemini_module.get_client()


def test_get_client_never_passes_api_key(
    monkeypatch: pytest.MonkeyPatch, gemini_module: object
) -> None:
    """Regression guard — the AI Studio key path is gone for good."""
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "p")
    monkeypatch.setenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    # Even if someone re-exports a stale GEMINI_API_KEY locally, we must not
    # forward it to the SDK constructor.
    monkeypatch.setenv("GEMINI_API_KEY", "should-be-ignored")

    with patch("app.agents.gemini.genai.Client") as ctor:
        gemini_module.get_client()

    _args, kwargs = ctor.call_args
    assert "api_key" not in kwargs
