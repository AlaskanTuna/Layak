"""Tests for `app.routes.quota`."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import app.routes.quota as quota_module
from app import auth as auth_module
from app.routes.quota import QuotaResponse

_OWNER_UID = "uid-aisyah"
_NOW = datetime(2026, 4, 22, 12, 0, 0, tzinfo=UTC)


def _make_count_snapshot(count: int) -> MagicMock:
    result = MagicMock()
    result.value = count
    return [[result]]


def _wire_quota_db(count: int, *, oldest_at: datetime | None = None) -> MagicMock:
    db = MagicMock()
    collection = db.collection.return_value
    collection.where.return_value.where.return_value.count.return_value.get.return_value = (
        _make_count_snapshot(count)
    )
    if oldest_at is not None:
        oldest_snap = MagicMock()
        oldest_snap.to_dict.return_value = {"createdAt": oldest_at}
        limit_query = collection.where.return_value.where.return_value.order_by.return_value.limit.return_value
        limit_query.stream.return_value = iter([oldest_snap])
    return db


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, MagicMock, MagicMock, MagicMock, datetime]:
    monkeypatch.setenv("FIREBASE_ADMIN_KEY", json.dumps({"type": "service_account"}))
    monkeypatch.setattr(auth_module, "_init_firebase_admin", lambda: MagicMock())

    verify_mock = MagicMock(return_value={"uid": _OWNER_UID, "email": "a@example.com"})
    monkeypatch.setattr(auth_module, "verify_firebase_id_token", verify_mock)

    upsert_mock = MagicMock(return_value=("free", "en"))
    monkeypatch.setattr(auth_module, "_upsert_user_doc", upsert_mock)

    class _FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz: Any = None) -> datetime:  # type: ignore[override]
            del tz
            return _NOW

    monkeypatch.setattr(quota_module, "datetime", _FrozenDateTime)

    db = MagicMock()
    get_firestore_mock = MagicMock(return_value=db)
    monkeypatch.setattr(quota_module, "get_firestore", get_firestore_mock)

    from app.main import app

    return TestClient(app), db, get_firestore_mock, upsert_mock, _NOW


def test_get_quota_requires_bearer_token(client: tuple[TestClient, MagicMock, MagicMock, MagicMock, datetime]) -> None:
    tc, _, _, _, _ = client
    resp = tc.get("/api/quota")
    assert resp.status_code == 401


def test_get_quota_returns_pro_sentinel_without_firestore_touch(
    client: tuple[TestClient, MagicMock, MagicMock, MagicMock, datetime],
) -> None:
    tc, _, get_firestore_mock, upsert_mock, _ = client
    upsert_mock.return_value = ("pro", "en")

    resp = tc.get("/api/quota", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    body = resp.json()
    assert body == {
        "tier": "pro",
        "limit": -1,
        "used": 0,
        "remaining": -1,
        "windowHours": 24,
        "resetAt": _NOW.isoformat(),
    }
    get_firestore_mock.assert_not_called()


def test_get_quota_free_under_cap_returns_iso_reset(
    client: tuple[TestClient, MagicMock, MagicMock, MagicMock, datetime],
) -> None:
    tc, _db, get_firestore_mock, upsert_mock, _ = client
    upsert_mock.return_value = ("free", "en")
    db_mock = _wire_quota_db(3, oldest_at=_NOW - timedelta(hours=20))
    get_firestore_mock.return_value = db_mock

    resp = tc.get("/api/quota", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["tier"] == "free"
    assert body["limit"] == 5
    assert body["used"] == 3
    assert body["remaining"] == 2
    assert body["windowHours"] == 24
    assert datetime.fromisoformat(body["resetAt"])
    assert set(body) == {"tier", "limit", "used", "remaining", "windowHours", "resetAt"}
    get_firestore_mock.assert_called_once()


def test_get_quota_free_with_zero_usage_resets_in_24h(
    client: tuple[TestClient, MagicMock, MagicMock, MagicMock, datetime],
) -> None:
    tc, _db, get_firestore_mock, upsert_mock, fixed_now = client
    upsert_mock.return_value = ("free", "en")
    db_mock = _wire_quota_db(0)
    get_firestore_mock.return_value = db_mock

    resp = tc.get("/api/quota", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    body = resp.json()
    reset_at = datetime.fromisoformat(body["resetAt"])
    expected = fixed_now + timedelta(hours=24)
    assert abs((reset_at - expected).total_seconds()) <= 5


def test_get_quota_free_at_cap_uses_estimate_reset_at(
    client: tuple[TestClient, MagicMock, MagicMock, MagicMock, datetime],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tc, _db, get_firestore_mock, upsert_mock, fixed_now = client
    upsert_mock.return_value = ("free", "en")
    db_mock = _wire_quota_db(5)
    get_firestore_mock.return_value = db_mock

    reset_at = fixed_now + timedelta(hours=7, minutes=30)
    estimate_mock = MagicMock(return_value=reset_at)
    monkeypatch.setattr(quota_module, "estimate_reset_at", estimate_mock)

    resp = tc.get("/api/quota", headers={"Authorization": "Bearer valid"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["remaining"] == 0
    assert body["resetAt"] == reset_at.isoformat()
    estimate_mock.assert_called_once_with(
        db_mock,
        auth_module.UserInfo(_OWNER_UID, "a@example.com", None, None, "free"),
        fixed_now,
    )


def test_quota_response_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        QuotaResponse.model_validate(
            {
                "tier": "free",
                "limit": 5,
                "used": 1,
                "remaining": 4,
                "windowHours": 24,
                "resetAt": _NOW.isoformat(),
                "unexpected": "nope",
            }
        )
