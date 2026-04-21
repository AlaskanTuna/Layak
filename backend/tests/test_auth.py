"""Unit tests for `app.auth` — the Firebase Auth boundary.

These tests stub `firebase_admin` and the Firestore client so they run in CI
without needing real Firebase credentials. The integration test against a live
Firebase project lives in Phase 2 Task 4.
"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from firebase_admin import auth as fb_auth

from app import auth as auth_module


@pytest.fixture(autouse=True)
def _reset_module_state() -> None:
    """Clear process-wide `firebase_admin` + Firestore singletons between tests."""
    auth_module._state.app = None
    auth_module._state.firestore_client = None


@pytest.fixture
def stub_firebase(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """Install a fake Firebase Admin + Firestore so `current_user` never touches GCP.

    Returns a dict of hooks the tests can poke:
        verify:     MagicMock standing in for `verify_id_token` (set .return_value / .side_effect).
        users_ref:  MagicMock for `db.collection("users").document(uid)`.
        snapshot:   MagicMock for `users_ref.get()` — toggle `.exists`.
        set_calls:  list of payloads passed to `.set(...)`.
        update_calls: list of payloads passed to `.update(...)`.
    """
    monkeypatch.setenv("FIREBASE_ADMIN_KEY", json.dumps({"type": "service_account"}))
    # Pretend initialize succeeded.
    monkeypatch.setattr(auth_module, "_init_firebase_admin", lambda: MagicMock())

    snapshot = MagicMock()
    snapshot.exists = False

    set_calls: list[dict[str, Any]] = []
    update_calls: list[dict[str, Any]] = []

    users_ref = MagicMock()
    users_ref.get = MagicMock(return_value=snapshot)
    users_ref.set = MagicMock(side_effect=lambda payload: set_calls.append(payload))
    users_ref.update = MagicMock(side_effect=lambda payload: update_calls.append(payload))

    db = MagicMock()
    db.collection.return_value.document.return_value = users_ref
    monkeypatch.setattr(auth_module, "_get_firestore", lambda: db)

    verify = MagicMock()
    monkeypatch.setattr(auth_module, "verify_firebase_id_token", verify)

    return {
        "verify": verify,
        "users_ref": users_ref,
        "snapshot": snapshot,
        "set_calls": set_calls,
        "update_calls": update_calls,
    }


def _make_app() -> FastAPI:
    app = FastAPI()

    @app.get("/whoami")
    async def whoami(user: auth_module.CurrentUser) -> dict[str, Any]:
        return {"uid": user.uid, "email": user.email, "display_name": user.display_name}

    return app


# --- header validation ---------------------------------------------------


def test_missing_authorization_returns_401(stub_firebase: dict[str, Any]) -> None:
    del stub_firebase
    client = TestClient(_make_app())
    resp = client.get("/whoami")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Missing bearer token"
    assert resp.headers.get("www-authenticate") == "Bearer"


def test_non_bearer_scheme_returns_401(stub_firebase: dict[str, Any]) -> None:
    del stub_firebase
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Basic dXNlcjpwYXNz"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Missing bearer token"


def test_empty_bearer_token_returns_401(stub_firebase: dict[str, Any]) -> None:
    del stub_firebase
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer "})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Empty bearer token"


# --- token verification --------------------------------------------------


def test_invalid_token_returns_401(stub_firebase: dict[str, Any]) -> None:
    stub_firebase["verify"].side_effect = fb_auth.InvalidIdTokenError("bad token")
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid Firebase ID token"


def test_expired_token_returns_401(stub_firebase: dict[str, Any]) -> None:
    stub_firebase["verify"].side_effect = fb_auth.ExpiredIdTokenError("expired", cause=None)
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer expired"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid Firebase ID token"


def test_revoked_token_returns_401(stub_firebase: dict[str, Any]) -> None:
    stub_firebase["verify"].side_effect = fb_auth.RevokedIdTokenError("revoked")
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer revoked"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid Firebase ID token"


def test_disabled_user_returns_401(stub_firebase: dict[str, Any]) -> None:
    stub_firebase["verify"].side_effect = fb_auth.UserDisabledError("disabled")
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer disabled"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid Firebase ID token"


def test_certificate_fetch_failure_returns_503(stub_firebase: dict[str, Any]) -> None:
    stub_firebase["verify"].side_effect = fb_auth.CertificateFetchError("network", cause=None)
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer t"})
    assert resp.status_code == 503
    assert resp.json()["detail"] == "Token verification temporarily unavailable"


def test_token_without_uid_returns_401(stub_firebase: dict[str, Any]) -> None:
    stub_firebase["verify"].return_value = {"email": "x@y.com"}  # no uid
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer t"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Token missing uid"


# --- happy path + lazy user doc ------------------------------------------


def test_valid_token_returns_userinfo_and_lazy_creates_user_doc(
    stub_firebase: dict[str, Any],
) -> None:
    stub_firebase["verify"].return_value = {
        "uid": "aisyah-uid",
        "email": "aisyah@example.com",
        "name": "Aisyah binti Ahmad",
        "picture": "https://lh3.googleusercontent.com/aisyah",
    }
    stub_firebase["snapshot"].exists = False

    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer valid-token"})

    assert resp.status_code == 200
    assert resp.json() == {
        "uid": "aisyah-uid",
        "email": "aisyah@example.com",
        "display_name": "Aisyah binti Ahmad",
    }

    assert len(stub_firebase["set_calls"]) == 1
    payload = stub_firebase["set_calls"][0]
    assert payload["email"] == "aisyah@example.com"
    assert payload["displayName"] == "Aisyah binti Ahmad"
    assert payload["photoURL"] == "https://lh3.googleusercontent.com/aisyah"
    assert payload["tier"] == "free"
    assert payload["pdpaConsentAt"] is None
    assert "createdAt" in payload
    assert "lastLoginAt" in payload
    # No update call on a first-touch create.
    assert stub_firebase["update_calls"] == []


def test_returning_user_updates_last_login_only(stub_firebase: dict[str, Any]) -> None:
    stub_firebase["verify"].return_value = {"uid": "aisyah-uid", "email": "aisyah@example.com"}
    stub_firebase["snapshot"].exists = True

    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer valid-token"})

    assert resp.status_code == 200
    assert stub_firebase["set_calls"] == []
    assert len(stub_firebase["update_calls"]) == 1
    # Only `lastLoginAt` is touched on a returning-user path.
    assert list(stub_firebase["update_calls"][0].keys()) == ["lastLoginAt"]


def test_request_state_user_id_is_populated(stub_firebase: dict[str, Any]) -> None:
    """Downstream middleware expects `request.state.user_id` to carry the uid."""
    stub_firebase["verify"].return_value = {"uid": "state-uid", "email": "x@y.com"}
    stub_firebase["snapshot"].exists = True

    app = FastAPI()

    @app.get("/echo-state")
    async def echo_state(request: Request, user: auth_module.CurrentUser) -> dict[str, str]:
        return {"state_uid": request.state.user_id, "dep_uid": user.uid}

    client = TestClient(app)
    resp = client.get("/echo-state", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"state_uid": "state-uid", "dep_uid": "state-uid"}


def test_extra_whitespace_in_bearer_header_is_tolerated(stub_firebase: dict[str, Any]) -> None:
    stub_firebase["verify"].return_value = {"uid": "ws-uid"}
    stub_firebase["snapshot"].exists = True
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer   padded-token  "})
    assert resp.status_code == 200
    # The verifier must see the token stripped of surrounding whitespace.
    stub_firebase["verify"].assert_called_once_with("padded-token")


# --- misconfiguration path -----------------------------------------------


def test_missing_admin_key_returns_503(monkeypatch: pytest.MonkeyPatch) -> None:
    """When `FIREBASE_ADMIN_KEY` is unset the init path raises 503, not 500."""
    monkeypatch.delenv("FIREBASE_ADMIN_KEY", raising=False)
    # Do NOT stub `_init_firebase_admin` here — we want the real path to run.
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer anything"})
    assert resp.status_code == 503
    assert resp.json()["detail"] == "Firebase Admin not configured"


def test_malformed_admin_key_returns_503(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FIREBASE_ADMIN_KEY", "{not valid json")
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer anything"})
    assert resp.status_code == 503
    assert resp.json()["detail"] == "Firebase Admin key is malformed"


def test_admin_key_json_missing_service_account_fields_returns_503(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """JSON is valid but `credentials.Certificate` rejects the shape."""
    # Real `credentials.Certificate` raises ValueError on missing "private_key" etc.
    monkeypatch.setenv("FIREBASE_ADMIN_KEY", json.dumps({"type": "service_account"}))
    client = TestClient(_make_app())
    resp = client.get("/whoami", headers={"Authorization": "Bearer anything"})
    assert resp.status_code == 503
    assert resp.json()["detail"] == "Firebase Admin key is malformed"
