"""Unit tests for `app.services.rate_limit.enforce_quota`.

Firestore is mocked with a thin wrapper that lets each test dictate what the
`.where().where().count().get()` chain returns. The order-by/limit/stream
chain (used for the reset-time estimate) is wired the same way.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest

from app.auth import UserInfo
from app.services.rate_limit import FREE_TIER_LIMIT, enforce_quota

_NOW = datetime(2026, 4, 22, 12, 0, 0, tzinfo=UTC)


def _make_count_snapshot(count: int) -> MagicMock:
    """Mirror of the real Firestore `AggregationQuerySnapshot` shape:
    `snapshot[0][0].value` → int. `_extract_count` handles either shape.
    """
    result = MagicMock()
    result.value = count
    return [[result]]


def _wire_firestore_count(count: int) -> MagicMock:
    """Build a Firestore client mock where `.where().where().count().get()` → `count`."""
    db = MagicMock()
    db.collection.return_value.where.return_value.where.return_value.count.return_value.get.return_value = (
        _make_count_snapshot(count)
    )
    return db


def _wire_firestore_with_reset(count: int, oldest_at: datetime | None) -> MagicMock:
    """Build a Firestore client mock that also supports the reset-time lookup.

    The reset lookup is:
        `.collection("evaluations").where().where().order_by().limit(1).stream()`
    """
    db = _wire_firestore_count(count)
    # Reset path uses a different chain that goes through `.order_by`.
    if oldest_at is None:
        oldest_stream: list[MagicMock] = []
    else:
        oldest_snap = MagicMock()
        oldest_snap.to_dict.return_value = {"createdAt": oldest_at}
        oldest_stream = [oldest_snap]

    reset_query = MagicMock()
    reset_query.stream.return_value = iter(oldest_stream)

    # Chain: collection -> where -> where -> order_by -> limit -> stream
    # The same `collection` call returns a fresh MagicMock each time unless we
    # reuse the same one; use `return_value` so count + reset share the root.
    collection_mock = db.collection.return_value
    collection_mock.where.return_value.where.return_value.order_by.return_value.limit.return_value = reset_query
    return db


def _user(tier: str = "free") -> UserInfo:
    return UserInfo(uid="uid-aisyah", email="a@example.com", display_name=None, photo_url=None, tier=tier)


# --- happy paths (caller allowed) ---------------------------------------


def test_pro_tier_bypasses_quota_entirely() -> None:
    # Wire a DB that would 429 Free; Pro should never even query.
    db = _wire_firestore_count(FREE_TIER_LIMIT + 10)
    assert enforce_quota(db, _user("pro"), now=_NOW) is None
    # Pro path must not hit Firestore.
    db.collection.assert_not_called()


def test_free_tier_under_cap_returns_none() -> None:
    db = _wire_firestore_count(FREE_TIER_LIMIT - 1)
    assert enforce_quota(db, _user("free"), now=_NOW) is None


def test_free_tier_at_zero_returns_none() -> None:
    db = _wire_firestore_count(0)
    assert enforce_quota(db, _user("free"), now=_NOW) is None


# --- 429 response shape ---------------------------------------------------


def test_free_tier_at_cap_returns_429_with_headers_and_body() -> None:
    oldest = _NOW - timedelta(hours=22, minutes=30)
    db = _wire_firestore_with_reset(FREE_TIER_LIMIT, oldest_at=oldest)
    resp = enforce_quota(db, _user("free"), now=_NOW)

    assert resp is not None
    assert resp.status_code == 429

    assert resp.headers["X-RateLimit-Limit"] == str(FREE_TIER_LIMIT)
    assert resp.headers["X-RateLimit-Remaining"] == "0"
    expected_reset = oldest + timedelta(hours=24)
    assert resp.headers["X-RateLimit-Reset"] == str(int(expected_reset.timestamp()))
    # Retry-After is positive whole seconds.
    retry_after = int(resp.headers["Retry-After"])
    assert retry_after > 0

    body = json.loads(resp.body)
    assert body["error"] == "rate_limit"
    assert body["tier"] == "free"
    assert body["limit"] == FREE_TIER_LIMIT
    assert body["windowHours"] == 24
    assert body["resetAt"] == expected_reset.isoformat()
    assert str(FREE_TIER_LIMIT) in body["message"]


def test_free_tier_over_cap_returns_429() -> None:
    db = _wire_firestore_with_reset(FREE_TIER_LIMIT + 3, oldest_at=_NOW - timedelta(hours=20))
    resp = enforce_quota(db, _user("free"), now=_NOW)
    assert resp is not None
    assert resp.status_code == 429


# --- reset-time fallbacks ------------------------------------------------


def test_reset_estimate_falls_back_to_24h_when_oldest_missing() -> None:
    """Happens when the count query returns >=limit but the order-by lookup
    yields no rows (timing skew) — worst-case UX; user waits a full 24h."""
    db = _wire_firestore_with_reset(FREE_TIER_LIMIT, oldest_at=None)
    resp = enforce_quota(db, _user("free"), now=_NOW)
    assert resp is not None
    expected_reset = _NOW + timedelta(hours=24)
    assert resp.headers["X-RateLimit-Reset"] == str(int(expected_reset.timestamp()))


def test_reset_estimate_falls_back_on_query_exception() -> None:
    """Firestore hiccup on the reset query — shouldn't prevent the 429, but
    does fall back to the conservative now+24h estimate."""
    db = _wire_firestore_count(FREE_TIER_LIMIT)
    # Make the order_by chain raise.
    collection_mock = db.collection.return_value
    collection_mock.where.return_value.where.return_value.order_by.side_effect = RuntimeError("boom")
    resp = enforce_quota(db, _user("free"), now=_NOW)
    assert resp is not None
    expected_reset = _NOW + timedelta(hours=24)
    assert resp.headers["X-RateLimit-Reset"] == str(int(expected_reset.timestamp()))


# --- fail-open semantics -------------------------------------------------


def test_firestore_count_failure_fails_open() -> None:
    """Spec §3.6 race-condition note — quota is a UX guardrail, not a billing
    boundary. A Firestore outage shouldn't hard-block users; allow through."""
    db = MagicMock()
    # Make the count chain raise.
    db.collection.return_value.where.return_value.where.return_value.count.side_effect = RuntimeError(
        "transient firestore outage"
    )
    assert enforce_quota(db, _user("free"), now=_NOW) is None


# --- count extractor shape tolerance -------------------------------------


def test_count_extraction_handles_bare_value_shape() -> None:
    """Older SDK variants return a single AggregationResult instead of a list-of-lists.
    `_extract_count` must handle both."""
    db = MagicMock()
    bare = MagicMock()
    bare.value = FREE_TIER_LIMIT
    db.collection.return_value.where.return_value.where.return_value.count.return_value.get.return_value = bare
    # Reset lookup for the 429 branch.
    reset_query = MagicMock()
    reset_query.stream.return_value = iter([])
    collection_mock = db.collection.return_value
    collection_mock.where.return_value.where.return_value.order_by.return_value.limit.return_value = reset_query
    resp = enforce_quota(db, _user("free"), now=_NOW)
    assert resp is not None
    assert resp.status_code == 429


# --- integration: intake route should 429 under cap ---------------------


def test_intake_manual_route_returns_429_when_at_cap(monkeypatch: pytest.MonkeyPatch) -> None:
    """End-to-end check: the intake route short-circuits on enforce_quota=429
    without opening an SSE stream or writing the evaluations doc."""
    from fastapi.testclient import TestClient

    from app import auth as auth_module

    monkeypatch.setenv("FIREBASE_ADMIN_KEY", json.dumps({"type": "service_account"}))
    monkeypatch.setattr(auth_module, "_init_firebase_admin", lambda: MagicMock())

    # Auth user-doc mock.
    users_snap = MagicMock()
    users_snap.exists = True
    users_snap.to_dict.return_value = {"tier": "free"}
    users_doc = MagicMock()
    users_doc.get.return_value = users_snap
    users_collection = MagicMock()
    users_collection.document.return_value = users_doc

    # Evaluations collection mock: count query returns 5 (AT CAP).
    # The reset query returns a clean oldest-eval.
    oldest = _NOW - timedelta(hours=22)
    oldest_snap = MagicMock()
    oldest_snap.to_dict.return_value = {"createdAt": oldest}
    reset_query = MagicMock()
    reset_query.stream.return_value = iter([oldest_snap])

    eval_collection = MagicMock()
    eval_collection.where.return_value.where.return_value.count.return_value.get.return_value = (
        _make_count_snapshot(FREE_TIER_LIMIT)
    )
    eval_collection.where.return_value.where.return_value.order_by.return_value.limit.return_value = (
        reset_query
    )

    db = MagicMock()
    db.collection.side_effect = lambda name: (
        eval_collection if name == "evaluations" else users_collection
    )
    monkeypatch.setattr(auth_module, "_get_firestore", lambda: db)
    monkeypatch.setattr(
        auth_module,
        "verify_firebase_id_token",
        MagicMock(return_value={"uid": "uid-aisyah", "email": "a@example.com"}),
    )

    from app.main import app

    client = TestClient(app)
    resp = client.post(
        "/api/agent/intake_manual",
        headers={"Authorization": "Bearer valid"},
        json={
            "name": "Aisyah",
            "date_of_birth": "1992-03-24",
            "ic_last4": "4321",
            "monthly_income_rm": 2800,
            "employment_type": "gig",
            "address": None,
            "monthly_kwh": None,
            "dependants": [],
        },
    )

    assert resp.status_code == 429
    assert resp.headers.get("X-RateLimit-Limit") == str(FREE_TIER_LIMIT)
    assert resp.headers.get("Retry-After")
    body = resp.json()
    assert body["error"] == "rate_limit"
    # The evaluations doc must NOT be created on a rate-limited request.
    eval_collection.document.assert_not_called()
