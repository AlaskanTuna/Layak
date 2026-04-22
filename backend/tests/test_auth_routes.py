"""Tests for `app.routes.auth` — public guest sign-in token mint.

The guest endpoint is unauthenticated by design (the frontend's "Continue as
guest" button calls it before signing in via `signInWithCustomToken`). These
tests stub `firebase_admin.auth.create_custom_token` plus the Firestore client
so CI never touches GCP.
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from firebase_admin import auth as fb_auth

from app import auth as auth_module


@pytest.fixture(autouse=True)
def _reset_module_state() -> None:
    auth_module._state.app = None
    auth_module._state.firestore_client = None


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, MagicMock, MagicMock]:
    """Stub Firebase Admin + Firestore. Returns `(client, db, users_doc)` so
    individual tests can inspect the writes the endpoint makes against
    `users/guest-demo`.
    """
    monkeypatch.setenv("FIREBASE_ADMIN_KEY", json.dumps({"type": "service_account"}))
    monkeypatch.setattr(auth_module, "_init_firebase_admin", lambda: MagicMock())

    snap = MagicMock()
    snap.exists = False  # default: first-time mint creates the doc

    users_doc = MagicMock()
    users_doc.get.return_value = snap
    users_col = MagicMock()
    users_col.document.return_value = users_doc

    db = MagicMock()
    db.collection.side_effect = lambda name: users_col if name == "users" else MagicMock()
    monkeypatch.setattr(auth_module, "_get_firestore", lambda: db)

    from app.main import app

    return TestClient(app), db, users_doc


def test_guest_token_first_call_creates_doc_and_returns_token(
    client: tuple[TestClient, MagicMock, MagicMock],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tc, _db, users_doc = client
    monkeypatch.setattr(fb_auth, "create_custom_token", MagicMock(return_value=b"signed.guest.token"))

    resp = tc.post("/api/auth/guest-token")

    assert resp.status_code == 200
    body = resp.json()
    assert body == {"customToken": "signed.guest.token"}

    # Pre-creation must seed tier="pro" so the guest bypasses the free-tier rate limit.
    assert users_doc.set.call_count == 1
    payload = users_doc.set.call_args.args[0]
    assert payload["tier"] == "pro"
    assert payload["isGuest"] is True
    assert payload["email"] == auth_module.GUEST_EMAIL
    assert payload["displayName"] == auth_module.GUEST_DISPLAY_NAME

    # The custom token must bind to the canonical guest UID.
    fb_auth.create_custom_token.assert_called_once_with(auth_module.GUEST_UID)


def test_guest_token_repeat_call_refreshes_login_and_reasserts_tier(
    client: tuple[TestClient, MagicMock, MagicMock],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tc, _db, users_doc = client
    # Existing doc — should hit the update branch, not set.
    snap = MagicMock()
    snap.exists = True
    snap.to_dict.return_value = {"tier": "pro"}
    users_doc.get.return_value = snap

    monkeypatch.setattr(fb_auth, "create_custom_token", MagicMock(return_value=b"another.token"))

    resp = tc.post("/api/auth/guest-token")

    assert resp.status_code == 200
    users_doc.set.assert_not_called()
    users_doc.update.assert_called_once()
    update_payload = users_doc.update.call_args.args[0]
    assert update_payload["tier"] == "pro"
    assert "lastLoginAt" in update_payload


def test_guest_token_returns_503_when_firebase_admin_throws(
    client: tuple[TestClient, MagicMock, MagicMock],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tc, _db, _users_doc = client
    monkeypatch.setattr(
        fb_auth,
        "create_custom_token",
        MagicMock(side_effect=RuntimeError("IAM signer unavailable")),
    )

    resp = tc.post("/api/auth/guest-token")

    assert resp.status_code == 503
    assert "Guest sign-in temporarily unavailable" in resp.json()["detail"]
