"""Phase 3 Task 2 — free-tier rate limit preflight.

Free-tier users are capped at **5 evaluations per rolling 24 hours**. Pro-tier
users bypass the check entirely. The preflight runs BEFORE `/api/agent/intake`
(or `intake_manual`) opens the SSE stream so a blocked request never burns
model time.

Spec: docs/superpowers/specs/2026-04-21-v2-saas-pivot-design.md §3.6.

Response contract when capped:
    HTTP 429 Too Many Requests
    Content-Type: application/json
    Headers:
        X-RateLimit-Limit: 5
        X-RateLimit-Remaining: 0
        X-RateLimit-Reset: <unix-seconds-until-oldest-eval-ages-out>
        Retry-After: <seconds-until-reset>
    Body:
        {
            "error": "rate_limit",
            "tier": "free",
            "limit": 5,
            "windowHours": 24,
            "resetAt": "<ISO-8601 UTC>",
            "message": "..."
        }

The frontend waitlist modal + QuotaMeter read `resetAt` + `limit` from the
body; `Retry-After` is a courtesy for curl / non-UI clients.

Race-condition note (spec §3.6): concurrent submissions can squeeze past the
cap by 1-2. Accepted trade — this is a UX guardrail, not a billing boundary.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from starlette.responses import JSONResponse

from app.auth import UserInfo

_logger = logging.getLogger(__name__)

FREE_TIER_LIMIT = 5
FREE_TIER_WINDOW = timedelta(hours=24)


def enforce_quota(db: Any, user: UserInfo, *, now: datetime | None = None) -> JSONResponse | None:
    """Preflight quota check.

    Returns a `JSONResponse` with HTTP 429 when the caller has hit the cap;
    returns `None` when the caller is cleared to proceed. The intake route
    short-circuits on the 429 and never opens its SSE stream.

    Pro-tier users bypass the check — spec §3.6 reserves the cap to Free.

    Firestore query failures are **logged and treated as "allow"** — we'd
    rather let a user through during a transient outage than hard-block them.
    The race-condition trade-off already accepts 1-2 over-cap submissions;
    this is the same category.
    """
    if user.tier != "free":
        return None

    current_time = now if now is not None else datetime.now(UTC)
    window_start = current_time - FREE_TIER_WINDOW

    try:
        count_snapshot = (
            db.collection("evaluations")
            .where("userId", "==", user.uid)
            .where("createdAt", ">=", window_start)
            .count()
            .get()
        )
    except Exception:  # noqa: BLE001 — never hard-block on a Firestore hiccup.
        _logger.exception("Rate-limit count query failed for uid=%s; allowing request", user.uid)
        return None

    used = _extract_count(count_snapshot)
    if used < FREE_TIER_LIMIT:
        return None

    reset_at = _estimate_reset_at(db, user, current_time)
    retry_after_s = max(1, int((reset_at - current_time).total_seconds()))
    headers = {
        "X-RateLimit-Limit": str(FREE_TIER_LIMIT),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": str(int(reset_at.timestamp())),
        "Retry-After": str(retry_after_s),
    }
    body = {
        "error": "rate_limit",
        "tier": "free",
        "limit": FREE_TIER_LIMIT,
        "windowHours": int(FREE_TIER_WINDOW.total_seconds() // 3600),
        "resetAt": reset_at.isoformat(),
        "message": (
            f"You have reached the free-tier cap of {FREE_TIER_LIMIT} "
            f"evaluations per 24 hours. Your quota resets at {reset_at.isoformat()}."
        ),
    }
    return JSONResponse(status_code=429, content=body, headers=headers)


def _extract_count(snapshot: Any) -> int:
    """Firestore `.count().get()` returns an `AggregationQuerySnapshot` whose
    payload varies slightly between SDK minor versions. This helper descends
    up to three levels (snapshot → list → list → `AggregationResult`) and
    returns the first `.value` it can convert to an int. Falls back to 0 so
    a shape surprise never hard-blocks a user.
    """
    obj: Any = snapshot
    for _ in range(3):
        value = getattr(obj, "value", None)
        if value is not None:
            try:
                return int(value)
            except (TypeError, ValueError):
                pass
        try:
            obj = obj[0]
        except (TypeError, IndexError, KeyError):
            break
    try:
        return int(obj)
    except (TypeError, ValueError):
        return 0


def _estimate_reset_at(db: Any, user: UserInfo, now: datetime) -> datetime:
    """Conservative reset timer: the timestamp at which the OLDEST eval in
    the current window ages out. Falls back to `now + 24h` if the lookup
    fails or returns nothing (worst-case UX; test covers it).
    """
    try:
        window_start = now - FREE_TIER_WINDOW
        oldest_query = (
            db.collection("evaluations")
            .where("userId", "==", user.uid)
            .where("createdAt", ">=", window_start)
            .order_by("createdAt")
            .limit(1)
        )
        for snap in oldest_query.stream():
            data = snap.to_dict() or {}
            oldest = data.get("createdAt")
            if isinstance(oldest, datetime):
                return oldest + FREE_TIER_WINDOW
    except Exception:  # noqa: BLE001 — fall through to the worst-case estimate.
        _logger.exception("Rate-limit reset lookup failed for uid=%s", user.uid)
    return now + FREE_TIER_WINDOW
