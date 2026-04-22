"""Public auth endpoints — currently the guest sign-in token mint.

Hackathon submission requires the deployed URL to be reachable without a
Google sign-in. The frontend's "Continue as Guest" button POSTs here to
obtain a Firebase custom token bound to the shared demo UID
(`auth.GUEST_UID`); the client then calls `signInWithCustomToken(...)` so
the rest of the app keeps using the existing `Authorization: Bearer ...`
flow unchanged.

This endpoint is intentionally unauthenticated. Mitigations:
    - Pre-creates the `users/guest-demo` doc with `tier="pro"` so abuse
      can't cap out a real user's quota.
    - The shared account is sandboxed: `routes/user.py` blocks DELETE for
      the guest UID, so a malicious caller can't wipe the demo account.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from app.auth import mint_guest_custom_token

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/guest-token")
async def guest_token() -> dict[str, str]:
    """Mint a Firebase custom token for the shared demo guest UID."""
    try:
        token = mint_guest_custom_token()
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 — surface as 503 so the client can retry.
        _logger.exception("Guest custom-token mint failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Guest sign-in temporarily unavailable",
        ) from exc
    return {"customToken": token}


__all__ = ["router", "guest_token"]
