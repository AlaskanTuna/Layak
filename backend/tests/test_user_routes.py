"""Tests for `app.routes.user` — PDPA export + delete (Phase 4 Task 4).

Firestore and `firebase_admin.auth.delete_user` are stubbed end-to-end so CI
never needs real Firebase creds. The delete cascade is verified both for the
happy path AND the "Firestore succeeded, Auth failed" recovery path — that's
the tricky failure mode where a half-success still honours the erasure
intent but the client needs to retry.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from firebase_admin import auth as fb_auth

from app import auth as auth_module

_UID = "uid-aisyah"


def _users_doc_mock(exists: bool = True) -> tuple[MagicMock, MagicMock]:
    """Return (users_collection_mock, users_doc_mock) wired so `.get()` returns
    a snapshot with the test-friendly tier + whatever `exists` flag we picked.
    """
    snap = MagicMock()
    snap.exists = exists
    snap.to_dict.return_value = {"tier": "free"} if exists else None
    doc = MagicMock()
    doc.get.return_value = snap
    col = MagicMock()
    col.document.return_value = doc
    return col, doc


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, MagicMock, MagicMock]:
    """Return `(client, db_mock, users_doc_mock)` — tests override the
    evaluations collection per-test because export and delete need different
    query shapes.
    """
    monkeypatch.setenv("FIREBASE_ADMIN_KEY", json.dumps({"type": "service_account"}))
    monkeypatch.setattr(auth_module, "_init_firebase_admin", lambda: MagicMock())

    users_col, users_doc = _users_doc_mock(exists=True)

    db = MagicMock()
    # Default: every non-`users` collection returns a bare MagicMock. Tests
    # override `db.collection.side_effect` when they need to sculpt the
    # evaluations query.
    db.collection.side_effect = lambda name: users_col if name == "users" else MagicMock()

    monkeypatch.setattr(auth_module, "_get_firestore", lambda: db)
    monkeypatch.setattr(
        auth_module,
        "verify_firebase_id_token",
        MagicMock(return_value={"uid": _UID, "email": "a@example.com"}),
    )

    from app.main import app

    return TestClient(app), db, users_doc


# ============================================================================
# /api/user/export
# ============================================================================


def test_export_requires_auth(client: tuple[TestClient, MagicMock, MagicMock]) -> None:
    tc, _db, _users_doc = client
    resp = tc.get("/api/user/export")
    assert resp.status_code == 401


def test_export_returns_user_and_evaluations_bundle(
    client: tuple[TestClient, MagicMock, MagicMock],
) -> None:
    tc, db, _users_doc = client

    # users/{uid}
    user_snap = MagicMock()
    user_snap.exists = True
    user_snap.to_dict.return_value = {
        "email": "a@example.com",
        "displayName": "Aisyah",
        "tier": "free",
        "createdAt": datetime(2026, 4, 20, 9, 0, 0, tzinfo=UTC),
        "lastLoginAt": datetime(2026, 4, 22, 15, 0, 0, tzinfo=UTC),
        "pdpaConsentAt": None,
    }
    users_doc = MagicMock()
    users_doc.get.return_value = user_snap
    users_collection = MagicMock()
    users_collection.document.return_value = users_doc

    # Two evaluations, newest first.
    snap_a = MagicMock()
    snap_a.id = "eval-a"
    snap_a.to_dict.return_value = {
        "userId": _UID,
        "status": "complete",
        "totalAnnualRM": 8208.0,
        "createdAt": datetime(2026, 4, 22, 10, 0, 0, tzinfo=UTC),
    }
    snap_b = MagicMock()
    snap_b.id = "eval-b"
    snap_b.to_dict.return_value = {
        "userId": _UID,
        "status": "complete",
        "totalAnnualRM": 5000.0,
        "createdAt": datetime(2026, 4, 21, 10, 0, 0, tzinfo=UTC),
    }

    eval_query = MagicMock()
    eval_query.stream.return_value = iter([snap_a, snap_b])
    eval_collection = MagicMock()
    eval_collection.where.return_value.order_by.return_value = eval_query

    db.collection.side_effect = lambda name: (
        eval_collection if name == "evaluations" else users_collection
    )

    resp = tc.get("/api/user/export", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/json")
    assert "attachment" in resp.headers.get("content-disposition", "")
    assert _UID in resp.headers.get("content-disposition", "")
    assert resp.headers.get("cache-control") == "no-store"

    body = resp.json()
    assert body["uid"] == _UID
    assert body["schemaVersion"] == 1
    assert body["user"]["email"] == "a@example.com"
    assert body["user"]["createdAt"] == "2026-04-20T09:00:00+00:00"
    assert len(body["evaluations"]) == 2
    assert body["evaluations"][0]["id"] == "eval-a"
    assert body["evaluations"][0]["totalAnnualRM"] == 8208.0
    assert body["evaluations"][1]["id"] == "eval-b"

    # Confirm the evaluations query is scoped to the caller's uid.
    eval_collection.where.assert_called_once_with("userId", "==", _UID)


def test_export_handles_user_with_no_evaluations(
    client: tuple[TestClient, MagicMock, MagicMock],
) -> None:
    tc, db, _users_doc = client

    user_snap = MagicMock()
    user_snap.exists = True
    user_snap.to_dict.return_value = {"email": "a@example.com", "tier": "free"}
    users_doc = MagicMock()
    users_doc.get.return_value = user_snap
    users_collection = MagicMock()
    users_collection.document.return_value = users_doc

    eval_query = MagicMock()
    eval_query.stream.return_value = iter([])
    eval_collection = MagicMock()
    eval_collection.where.return_value.order_by.return_value = eval_query

    db.collection.side_effect = lambda name: (
        eval_collection if name == "evaluations" else users_collection
    )

    resp = tc.get("/api/user/export", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["evaluations"] == []


def test_export_handles_missing_user_doc(
    client: tuple[TestClient, MagicMock, MagicMock],
) -> None:
    """If `users/{uid}` somehow vanished (race with delete), export still
    returns 200 with `user: null` rather than 404."""
    tc, db, _users_doc = client

    user_snap = MagicMock()
    user_snap.exists = False
    users_doc = MagicMock()
    users_doc.get.return_value = user_snap
    users_collection = MagicMock()
    users_collection.document.return_value = users_doc

    eval_query = MagicMock()
    eval_query.stream.return_value = iter([])
    eval_collection = MagicMock()
    eval_collection.where.return_value.order_by.return_value = eval_query

    db.collection.side_effect = lambda name: (
        eval_collection if name == "evaluations" else users_collection
    )

    resp = tc.get("/api/user/export", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    # But wait — auth.py upserts on the way in, so `user_snap.exists = False`
    # at this layer is unlikely in practice. Still: export should not 404.
    body = resp.json()
    assert body["uid"] == _UID


# ============================================================================
# DELETE /api/user
# ============================================================================


def _wire_delete_mocks(db: MagicMock, num_evals: int = 3) -> tuple[MagicMock, MagicMock, list[MagicMock]]:
    """Wire the evaluations collection + batch for a delete test.

    Returns `(eval_collection, batch, eval_snaps)` so tests can assert how many
    `batch.delete` calls happened.
    """
    eval_snaps = [MagicMock() for _ in range(num_evals)]
    for i, snap in enumerate(eval_snaps):
        snap.reference = MagicMock(name=f"eval_ref_{i}")

    eval_query = MagicMock()
    eval_query.stream.return_value = iter(eval_snaps)
    eval_collection = MagicMock()
    eval_collection.where.return_value = eval_query

    users_col, _users_doc = _users_doc_mock(exists=True)
    batch = MagicMock()
    db.batch.return_value = batch
    db.collection.side_effect = lambda name: (
        eval_collection if name == "evaluations" else users_col
    )
    return eval_collection, batch, eval_snaps


def test_delete_requires_auth(client: tuple[TestClient, MagicMock, MagicMock]) -> None:
    tc, _db, _users_doc = client
    resp = tc.delete("/api/user")
    assert resp.status_code == 401


def test_delete_cascades_firestore_and_deletes_auth_user(
    client: tuple[TestClient, MagicMock, MagicMock],
) -> None:
    tc, db, _users_doc = client
    eval_collection, batch, eval_snaps = _wire_delete_mocks(db, num_evals=3)

    with patch.object(fb_auth, "delete_user") as mock_delete_user:
        resp = tc.delete("/api/user", headers={"Authorization": "Bearer valid"})

    assert resp.status_code == 204
    assert resp.content == b""

    # Three evaluations + one user doc = four deletes on the batch.
    assert batch.delete.call_count == 4
    # Verify the query was scoped to this user.
    eval_collection.where.assert_called_once_with("userId", "==", _UID)
    # Auth delete runs with the right uid.
    mock_delete_user.assert_called_once_with(_UID)


def test_delete_succeeds_when_firebase_user_already_gone(
    client: tuple[TestClient, MagicMock, MagicMock],
) -> None:
    """Idempotent retry after a prior partial success: Firestore is already
    clean, Auth record is already gone. Should still return 204."""
    tc, db, _users_doc = client
    _wire_delete_mocks(db, num_evals=0)

    with patch.object(fb_auth, "delete_user", side_effect=fb_auth.UserNotFoundError("gone")):
        resp = tc.delete("/api/user", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 204


def test_delete_surfaces_500_when_firestore_fails(
    client: tuple[TestClient, MagicMock, MagicMock],
) -> None:
    tc, db, _users_doc = client
    # Make the evaluations stream raise.
    eval_query = MagicMock()
    eval_query.stream.side_effect = RuntimeError("firestore down")
    eval_collection = MagicMock()
    eval_collection.where.return_value = eval_query
    users_col, _ = _users_doc_mock(exists=True)
    db.collection.side_effect = lambda name: (
        eval_collection if name == "evaluations" else users_col
    )

    with patch.object(fb_auth, "delete_user") as mock_delete_user:
        resp = tc.delete("/api/user", headers={"Authorization": "Bearer valid"})

    assert resp.status_code == 500
    # Critical: if Firestore failed, we must NOT have called auth.delete_user.
    mock_delete_user.assert_not_called()


def test_delete_surfaces_500_when_auth_delete_fails_after_firestore_success(
    client: tuple[TestClient, MagicMock, MagicMock],
) -> None:
    """Firestore cascade succeeded, Auth delete failed — client needs a retry
    path, so we surface 500 with a descriptive detail. The Firestore side is
    already clean; a retry will find zero evals + missing user doc + possibly
    still-present Auth record, and complete the Auth half."""
    tc, db, _users_doc = client
    _wire_delete_mocks(db, num_evals=2)

    with patch.object(fb_auth, "delete_user", side_effect=RuntimeError("iam blip")):
        resp = tc.delete("/api/user", headers={"Authorization": "Bearer valid"})

    assert resp.status_code == 500
    detail = resp.json()["detail"]
    assert "Firestore data removed" in detail
    assert "retry" in detail.lower()


def test_delete_batches_large_eval_counts(
    client: tuple[TestClient, MagicMock, MagicMock],
) -> None:
    """Pro users with hundreds of evals shouldn't blow Firestore's 500-op
    batch cap. The implementation commits every ~450 ops and recommits a
    fresh batch."""
    tc, db, _users_doc = client
    eval_collection, batch, _snaps = _wire_delete_mocks(db, num_evals=950)

    with patch.object(fb_auth, "delete_user"):
        resp = tc.delete("/api/user", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 204

    # 950 evals / 450 per batch = 3 mid-stream commits + 1 final commit = 4 total.
    assert db.batch.call_count >= 2
    # At least 950 deletes (the evals) plus 1 user-doc delete happened.
    assert batch.delete.call_count >= 951
