"""Tests for the public helpers in `app.services.rate_limit`."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest

import app.services.rate_limit as rate_limit_module
from app.auth import UserInfo
from app.services.rate_limit import estimate_reset_at, get_used_count

_NOW = datetime(2026, 4, 22, 12, 0, 0, tzinfo=UTC)


def _make_count_snapshot(count: int) -> MagicMock:
    result = MagicMock()
    result.value = count
    return [[result]]


def _wire_firestore_count(count: int) -> MagicMock:
    db = MagicMock()
    db.collection.return_value.where.return_value.where.return_value.count.return_value.get.return_value = (
        _make_count_snapshot(count)
    )
    return db


def _user(tier: str = "free") -> UserInfo:
    return UserInfo(uid="uid-aisyah", email="a@example.com", display_name=None, photo_url=None, tier=tier)


def test_get_used_count_returns_zero_for_pro_without_touching_db() -> None:
    db = MagicMock()
    assert get_used_count(db, _user("pro"), now=_NOW) == 0
    db.collection.assert_not_called()


def test_get_used_count_returns_extracted_count_for_free() -> None:
    db = _wire_firestore_count(4)
    assert get_used_count(db, _user("free"), now=_NOW) == 4


def test_get_used_count_fails_open_when_count_query_raises() -> None:
    db = MagicMock()
    db.collection.return_value.where.return_value.where.return_value.count.side_effect = RuntimeError("boom")
    assert get_used_count(db, _user("free"), now=_NOW) == 0


def test_get_used_count_uses_supplied_now_for_window_cutoff() -> None:
    db = _wire_firestore_count(1)
    user = _user("free")
    expected_window_start = _NOW - timedelta(hours=24)

    assert get_used_count(db, user, now=_NOW) == 1
    db.collection.return_value.where.return_value.where.assert_called_once_with(
        "createdAt", ">=", expected_window_start
    )


def test_estimate_reset_at_delegates_to_private_helper(monkeypatch: pytest.MonkeyPatch) -> None:
    db = MagicMock()
    user = _user("free")
    expected = _NOW + timedelta(hours=7)
    helper = MagicMock(return_value=expected)
    monkeypatch.setattr(rate_limit_module, "_estimate_reset_at", helper)

    assert estimate_reset_at(db, user, _NOW) is expected
    helper.assert_called_once_with(db, user, _NOW)
