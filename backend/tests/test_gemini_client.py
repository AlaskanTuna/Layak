"""Pin the `gemini.get_client()` Gemini Developer API (API-key) contract.

`get_client()` must construct a `google.genai.Client` with the API key
resolved from the environment (with a dotenv fallback for local dev). The
previous Vertex AI project/location path is gone; if anyone reintroduces
`vertexai=True` the diff will read suspicious and these tests will fail.
"""

from __future__ import annotations

import importlib
from unittest.mock import patch

import pytest


@pytest.fixture
def gemini_module(monkeypatch: pytest.MonkeyPatch) -> object:
    import app.agents.gemini as mod

    importlib.reload(mod)
    monkeypatch.setattr(mod, "_load_var_from_dotenv", lambda _key: None)
    yield mod
    importlib.reload(mod)


def test_get_client_uses_api_key(monkeypatch: pytest.MonkeyPatch, gemini_module: object) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-123")
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    with patch("app.agents.gemini.genai.Client") as ctor:
        gemini_module.get_client()

    _args, kwargs = ctor.call_args
    assert kwargs["api_key"] == "test-key-123"
    assert "vertexai" not in kwargs
    assert "project" not in kwargs


def test_get_client_accepts_google_api_key_alias(monkeypatch: pytest.MonkeyPatch, gemini_module: object) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("GOOGLE_API_KEY", "alias-key-456")

    with patch("app.agents.gemini.genai.Client") as ctor:
        gemini_module.get_client()

    _args, kwargs = ctor.call_args
    assert kwargs["api_key"] == "alias-key-456"


def test_get_client_raises_runtime_error_when_key_unset(
    monkeypatch: pytest.MonkeyPatch, gemini_module: object
) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    with pytest.raises(RuntimeError, match="GEMINI_API_KEY"):
        gemini_module.get_client()
