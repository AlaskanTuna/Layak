"""GET /api/quota — current quota state for the signed-in user.

Phase 3 Task 4 read-side endpoint. The frontend `QuotaMeter` calls this on
mount + after every evaluation finishes so the meter UI reflects the real
count without re-implementing the rolling-24h aggregate query.

Pro tier responds with sentinels (`limit=-1`, `remaining=-1`) so the UI
hides the meter and shows a "Pro" badge instead. Free tier returns the
real used / remaining + ISO-8601 reset timestamp.

Auth boundary identical to the other endpoints — `current_user` verifies
the bearer token and lazy-creates `users/{uid}` on first touch.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from app.auth import CurrentUser, get_firestore
from app.services.rate_limit import (
    FREE_TIER_LIMIT,
    FREE_TIER_WINDOW,
    estimate_reset_at,
    get_used_count,
)

router = APIRouter(prefix="/api/quota", tags=["quota"])

_PRO_SENTINEL = -1


class QuotaResponse(BaseModel):
    """Response for `GET /api/quota`.

    `limit == -1` and `remaining == -1` are sentinels for "unlimited" — the
    Pro tier. `windowHours` carries the rolling-window size so the frontend
    formats reset countdowns without re-deriving constants.
    """

    model_config = ConfigDict(extra="forbid")

    tier: Literal["free", "pro"]
    limit: int
    used: int
    remaining: int
    windowHours: int  # noqa: N815 — frontend wire is camelCase
    resetAt: str  # noqa: N815 — ISO 8601 UTC


@router.get("", response_model=QuotaResponse)
async def get_quota(user: CurrentUser) -> QuotaResponse:
    now = datetime.now(UTC)
    window_hours = int(FREE_TIER_WINDOW.total_seconds() // 3600)

    if user.tier == "pro":
        return QuotaResponse(
            tier="pro",
            limit=_PRO_SENTINEL,
            used=0,
            remaining=_PRO_SENTINEL,
            windowHours=window_hours,
            resetAt=now.isoformat(),
        )

    db = get_firestore()
    used = get_used_count(db, user, now=now)
    remaining = max(0, FREE_TIER_LIMIT - used)
    reset_at = estimate_reset_at(db, user, now) if used > 0 else now + FREE_TIER_WINDOW

    return QuotaResponse(
        tier="free",
        limit=FREE_TIER_LIMIT,
        used=used,
        remaining=remaining,
        windowHours=window_hours,
        resetAt=reset_at.isoformat(),
    )
