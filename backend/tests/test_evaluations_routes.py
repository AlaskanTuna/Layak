"""Tests for `app.routes.evaluations` — list, get-by-id, packet regen.

All tests stub the Firestore client at `app.auth._get_firestore` (which the
public `get_firestore` re-exports) so Firebase creds never leave test scope.
Owner-gating is enforced at the route layer — tests for that path must be
present because Firestore rules only protect client reads; Admin SDK bypasses
them.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app import auth as auth_module
from app.fixtures.aisyah import AISYAH_PROFILE, AISYAH_SCHEME_MATCHES

# --- fixtures ------------------------------------------------------------


_OWNER_UID = "uid-aisyah"


def _make_eval_snapshot(
    *,
    exists: bool = True,
    user_id: str = _OWNER_UID,
    status: str = "complete",
    total_rm: float = 8208.0,
    profile: Any = None,
    matches: list[Any] | None = None,
) -> MagicMock:
    snap = MagicMock()
    snap.exists = exists
    if exists:
        snap.to_dict.return_value = {
            "userId": user_id,
            "status": status,
            "createdAt": datetime(2026, 4, 21, 12, 0, 0, tzinfo=UTC),
            "completedAt": datetime(2026, 4, 21, 12, 0, 30, tzinfo=UTC),
            "profile": (profile or AISYAH_PROFILE).model_dump(mode="json") if profile is not False else None,
            "classification": None,
            "matches": [m.model_dump(mode="json") for m in (matches or AISYAH_SCHEME_MATCHES)],
            "totalAnnualRM": total_rm,
            "stepStates": {
                "extract": "complete",
                "classify": "complete",
                "match": "complete",
                "compute_upside": "complete",
                "generate": "complete",
            },
            "error": None,
        }
    else:
        snap.to_dict.return_value = None
    return snap


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, MagicMock]:
    """TestClient + a Firestore client mock for the tests to poke.

    Returns `(client, db_mock)`. The caller sets up `db_mock.collection(...)`
    behaviour per-test because list vs get-by-id have different query shapes.
    """
    monkeypatch.setenv("FIREBASE_ADMIN_KEY", json.dumps({"type": "service_account"}))
    monkeypatch.setattr(auth_module, "_init_firebase_admin", lambda: MagicMock())

    # Auth user-doc mock — upsert path, snapshot.exists=True (user already exists).
    # `to_dict` supplies the `tier` field that `_upsert_user_doc` now returns.
    users_snap = MagicMock()
    users_snap.exists = True
    users_snap.to_dict.return_value = {"tier": "free"}
    users_doc = MagicMock()
    users_doc.get.return_value = users_snap
    users_collection = MagicMock()
    users_collection.document.return_value = users_doc

    db = MagicMock()
    # Tests override `.collection(...)` via side_effect below.
    db.collection.side_effect = lambda name: users_collection if name == "users" else MagicMock()

    monkeypatch.setattr(auth_module, "_get_firestore", lambda: db)
    monkeypatch.setattr(
        auth_module,
        "verify_firebase_id_token",
        MagicMock(return_value={"uid": _OWNER_UID, "email": "a@example.com"}),
    )

    from app.main import app

    return TestClient(app), db


# --- /api/evaluations (list) --------------------------------------------


def test_list_evaluations_requires_auth(client: tuple[TestClient, MagicMock]) -> None:
    tc, _ = client
    resp = tc.get("/api/evaluations")
    assert resp.status_code == 401


def test_list_evaluations_returns_rows_scoped_to_uid(client: tuple[TestClient, MagicMock]) -> None:
    tc, db = client

    # Two of the caller's evals, newest first.
    snap_a = MagicMock()
    snap_a.id = "eval-a"
    snap_a.to_dict.return_value = {
        "userId": _OWNER_UID,
        "status": "complete",
        "totalAnnualRM": 8208.0,
        "createdAt": datetime(2026, 4, 21, 12, 0, 0, tzinfo=UTC),
        "completedAt": datetime(2026, 4, 21, 12, 0, 30, tzinfo=UTC),
    }
    snap_b = MagicMock()
    snap_b.id = "eval-b"
    snap_b.to_dict.return_value = {
        "userId": _OWNER_UID,
        "status": "running",
        "totalAnnualRM": 0,
        "createdAt": datetime(2026, 4, 20, 9, 0, 0, tzinfo=UTC),
        "completedAt": None,
    }

    query = MagicMock()
    query.stream.return_value = iter([snap_a, snap_b])

    eval_collection = MagicMock()
    eval_collection.where.return_value.order_by.return_value.limit.return_value = query

    users_snap = MagicMock()
    users_snap.exists = True
    users_doc = MagicMock()
    users_doc.get.return_value = users_snap
    users_collection = MagicMock()
    users_collection.document.return_value = users_doc

    db.collection.side_effect = lambda name: (
        eval_collection if name == "evaluations" else users_collection
    )

    resp = tc.get("/api/evaluations", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 2
    assert body["items"][0]["id"] == "eval-a"
    assert body["items"][0]["status"] == "complete"
    assert body["items"][0]["totalAnnualRM"] == 8208.0
    # Confirm the query is scoped to the caller's uid.
    eval_collection.where.assert_called_once_with("userId", "==", _OWNER_UID)


def test_list_evaluations_respects_limit(client: tuple[TestClient, MagicMock]) -> None:
    tc, db = client
    query = MagicMock()
    query.stream.return_value = iter([])
    eval_collection = MagicMock()
    eval_collection.where.return_value.order_by.return_value.limit.return_value = query

    users_snap = MagicMock()
    users_snap.exists = True
    users_snap.to_dict.return_value = {"tier": "free"}
    users_doc = MagicMock()
    users_doc.get.return_value = users_snap
    users_collection = MagicMock()
    users_collection.document.return_value = users_doc
    db.collection.side_effect = lambda name: (
        eval_collection if name == "evaluations" else users_collection
    )

    resp = tc.get("/api/evaluations?limit=5", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    # The final `.limit(5)` call confirms the query builder saw our limit.
    eval_collection.where.return_value.order_by.return_value.limit.assert_called_with(5)


# --- /api/evaluations/{id} (get-by-id) -----------------------------------


def _wire_get_by_id(db: MagicMock, snap: MagicMock) -> MagicMock:
    eval_doc = MagicMock()
    eval_doc.get.return_value = snap
    eval_collection = MagicMock()
    eval_collection.document.return_value = eval_doc

    users_snap = MagicMock()
    users_snap.exists = True
    users_doc = MagicMock()
    users_doc.get.return_value = users_snap
    users_collection = MagicMock()
    users_collection.document.return_value = users_doc

    db.collection.side_effect = lambda name: (
        eval_collection if name == "evaluations" else users_collection
    )
    return eval_doc


def test_get_evaluation_requires_auth(client: tuple[TestClient, MagicMock]) -> None:
    tc, _ = client
    resp = tc.get("/api/evaluations/abc")
    assert resp.status_code == 401


def test_get_evaluation_returns_owned_doc(client: tuple[TestClient, MagicMock]) -> None:
    tc, db = client
    _wire_get_by_id(db, _make_eval_snapshot())
    resp = tc.get("/api/evaluations/eval-xyz", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["userId"] == _OWNER_UID
    assert body["status"] == "complete"
    assert body["totalAnnualRM"] == 8208.0
    assert body["profile"]["name"] == AISYAH_PROFILE.name


def test_get_evaluation_404_when_missing(client: tuple[TestClient, MagicMock]) -> None:
    tc, db = client
    _wire_get_by_id(db, _make_eval_snapshot(exists=False))
    resp = tc.get("/api/evaluations/does-not-exist", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 404


def test_get_evaluation_404_when_owned_by_someone_else(client: tuple[TestClient, MagicMock]) -> None:
    """Deliberately 404, not 403 — do not leak the existence of another user's eval."""
    tc, db = client
    _wire_get_by_id(db, _make_eval_snapshot(user_id="different-uid"))
    resp = tc.get("/api/evaluations/eval-xyz", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 404


# --- /api/evaluations/{id}/packet -----------------------------------------


def test_get_packet_requires_auth(client: tuple[TestClient, MagicMock]) -> None:
    tc, _ = client
    resp = tc.get("/api/evaluations/abc/packet")
    assert resp.status_code == 401


def test_get_packet_404_when_not_owned(client: tuple[TestClient, MagicMock]) -> None:
    tc, db = client
    _wire_get_by_id(db, _make_eval_snapshot(user_id="someone-else"))
    resp = tc.get("/api/evaluations/eval-xyz/packet", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 404


def test_get_packet_409_when_profile_missing(client: tuple[TestClient, MagicMock]) -> None:
    """If extract hasn't populated the profile yet, regen can't run."""
    tc, db = client
    # `profile: False` sentinel → `_make_eval_snapshot` writes `profile: None`.
    _wire_get_by_id(db, _make_eval_snapshot(profile=False))
    resp = tc.get("/api/evaluations/eval-xyz/packet", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 409


def test_get_packet_regenerates_zip(client: tuple[TestClient, MagicMock], monkeypatch: pytest.MonkeyPatch) -> None:
    """Happy path: profile + matches present → generate_packet called → zip returned."""
    tc, db = client
    _wire_get_by_id(db, _make_eval_snapshot())

    # Stub `generate_packet` to return a tiny packet without hitting WeasyPrint.
    import base64

    from app.routes import evaluations as evaluations_module
    from app.schema.packet import Packet, PacketDraft

    fake_pdf_bytes = b"%PDF-1.4 fake packet\n"
    fake_b64 = base64.b64encode(fake_pdf_bytes).decode()
    fake_packet = Packet(
        drafts=[
            PacketDraft(scheme_id="str_2026", filename="str.pdf", blob_bytes_b64=fake_b64),
            PacketDraft(scheme_id="jkm_warga_emas", filename="jkm.pdf", blob_bytes_b64=fake_b64),
            PacketDraft(scheme_id="lhdn_form_b", filename="lhdn.pdf", blob_bytes_b64=fake_b64),
        ],
        generated_at=datetime(2026, 4, 21, 12, 0, 0, tzinfo=UTC),
    )

    async def _fake_generate(*_args: Any, **_kwargs: Any) -> Packet:
        return fake_packet

    monkeypatch.setattr(evaluations_module, "generate_packet", _fake_generate)

    resp = tc.get("/api/evaluations/eval-xyz/packet", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"
    assert "attachment" in resp.headers.get("content-disposition", "")
    assert "eval-xyz" in resp.headers.get("content-disposition", "")

    # Verify the zip contains the three named drafts.
    import io
    import zipfile

    with zipfile.ZipFile(io.BytesIO(resp.content), "r") as zf:
        names = set(zf.namelist())
    assert names == {"str.pdf", "jkm.pdf", "lhdn.pdf"}


# --- /api/evaluations/{id} (delete) --------------------------------------


def test_delete_evaluation_requires_auth(client: tuple[TestClient, MagicMock]) -> None:
    tc, _ = client
    resp = tc.delete("/api/evaluations/abc")
    assert resp.status_code == 401


def test_delete_evaluation_204_when_owned(client: tuple[TestClient, MagicMock]) -> None:
    tc, db = client
    eval_doc = _wire_get_by_id(db, _make_eval_snapshot())
    resp = tc.delete("/api/evaluations/eval-xyz", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 204
    assert resp.content == b""
    eval_doc.delete.assert_called_once()


def test_delete_evaluation_404_when_missing(client: tuple[TestClient, MagicMock]) -> None:
    tc, db = client
    eval_doc = _wire_get_by_id(db, _make_eval_snapshot(exists=False))
    resp = tc.delete("/api/evaluations/does-not-exist", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 404
    eval_doc.delete.assert_not_called()


def test_delete_evaluation_404_when_not_owned(client: tuple[TestClient, MagicMock]) -> None:
    """Deliberately 404, not 403 — never reveal another user's eval to a guesser."""
    tc, db = client
    eval_doc = _wire_get_by_id(db, _make_eval_snapshot(user_id="someone-else"))
    resp = tc.delete("/api/evaluations/eval-xyz", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 404
    eval_doc.delete.assert_not_called()


def test_delete_evaluation_503_when_firestore_raises(client: tuple[TestClient, MagicMock]) -> None:
    """Firestore failure surfaces as 503 with a retry-friendly detail."""
    tc, db = client
    eval_doc = _wire_get_by_id(db, _make_eval_snapshot())
    eval_doc.delete.side_effect = RuntimeError("firestore unavailable")
    resp = tc.delete("/api/evaluations/eval-xyz", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 503
    assert "delete" in resp.json()["detail"].lower()
