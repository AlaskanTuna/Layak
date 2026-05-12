"""Smoke tests for Phase 11 admin role gating + custom-claim bootstrap."""

from __future__ import annotations

import os

import pytest
from fastapi import HTTPException

from app.auth import (
    UserInfo,
    _admin_email_allowlist,
    _ensure_admin_claim,
    require_admin,
    verify_admin_role,
)


def test_admin_email_allowlist_parses_csv(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("LAYAK_ADMIN_EMAIL_ALLOWLIST", "Alice@example.com, bob@example.com , ")
    parsed = _admin_email_allowlist()
    assert parsed == frozenset({"alice@example.com", "bob@example.com"})


def test_admin_email_allowlist_empty_when_unset(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("LAYAK_ADMIN_EMAIL_ALLOWLIST", raising=False)
    assert _admin_email_allowlist() == frozenset()


def test_ensure_admin_claim_skips_when_allowlist_unset(monkeypatch: pytest.MonkeyPatch):
    """Fail-closed default: no allowlist env var means no promotion."""
    monkeypatch.delenv("LAYAK_ADMIN_EMAIL_ALLOWLIST", raising=False)
    # Clear in-process cache so this uid is freshly evaluated.
    import app.auth as auth_module

    auth_module._admin_promoted_uids.discard("test-uid")
    result = _ensure_admin_claim("test-uid", "alice@example.com")
    assert result is False


def test_verify_admin_role_passes_for_admin():
    user = UserInfo(
        uid="u",
        email="a@example.com",
        display_name=None,
        photo_url=None,
        tier="free",
        language="en",
        role="admin",
    )
    # Should not raise
    verify_admin_role(user)


def test_verify_admin_role_403_for_non_admin():
    user = UserInfo(
        uid="u",
        email="a@example.com",
        display_name=None,
        photo_url=None,
        tier="free",
        language="en",
        role=None,
    )
    with pytest.raises(HTTPException) as exc:
        verify_admin_role(user)
    assert exc.value.status_code == 403


async def test_require_admin_passes_through_admin_user():
    user = UserInfo(
        uid="u",
        email="a@example.com",
        display_name=None,
        photo_url=None,
        tier="free",
        language="en",
        role="admin",
    )
    returned = await require_admin(user)
    assert returned is user


async def test_require_admin_403_when_not_admin():
    user = UserInfo(
        uid="u",
        email="a@example.com",
        display_name=None,
        photo_url=None,
        tier="free",
        language="en",
        role=None,
    )
    with pytest.raises(HTTPException) as exc:
        await require_admin(user)
    assert exc.value.status_code == 403


def test_user_info_role_defaults_to_none():
    """Existing call sites without `role=` continue to validate (legacy compat)."""
    # Ensure env doesn't bleed through.
    _ = os.environ.get("LAYAK_ADMIN_EMAIL_ALLOWLIST")
    user = UserInfo(
        uid="u",
        email=None,
        display_name=None,
        photo_url=None,
    )
    assert user.role is None
    assert user.tier == "free"
    assert user.language == "en"
