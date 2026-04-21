"""Layak v2 — Firebase Auth boundary for the FastAPI backend.

The backend is the **only** writer to Firestore (see `firestore.rules` — every
`allow write: if false` relies on Admin-SDK bypass). This module is the single
gate: every authed route declares `user: UserInfo = Depends(current_user)`,
which verifies the incoming Firebase ID token, lazy-creates the user's
`users/{uid}` document on first touch, and hands the route an immutable
`UserInfo`. Route code never calls `firebase_admin` or `firestore` directly.

Credentials:
    Cloud Run injects the Firebase service-account JSON as `FIREBASE_ADMIN_KEY`
    via `--set-secrets=FIREBASE_ADMIN_KEY=firebase-admin-key:latest` (see
    `docs/runbook.md` §2, landing alongside Phase 2 Task 2 deploy). If the env
    var is missing, `current_user` returns 503 Service Unavailable — not 500
    — so the frontend can distinguish a misconfigured service from a bad token.

Contract sources:
    docs/superpowers/specs/2026-04-21-v2-saas-pivot-design.md §3.3 (user doc
    shape) and §3.4 (rules contract); docs/trd.md §5.5 (schema summary).
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from threading import Lock
from typing import Annotated, Any

import firebase_admin
from fastapi import Depends, Header, HTTPException, Request, status
from firebase_admin import auth as fb_auth
from firebase_admin import credentials, firestore

_logger = logging.getLogger(__name__)

_FIREBASE_ADMIN_KEY_ENV = "FIREBASE_ADMIN_KEY"
_init_lock = Lock()
_app: firebase_admin.App | None = None
_firestore_client: Any | None = None


@dataclass(frozen=True, slots=True)
class UserInfo:
    """Owner identity propagated to every authed route.

    `uid` is the Firebase Auth UID and the single source of truth for
    `request.user_id`. `email` / `display_name` / `photo_url` come from the
    verified ID-token claims and are cached onto `users/{uid}` on first touch
    so later endpoints can read them without calling Firebase Auth again.

    `tier` ("free" | "pro") is read from `users/{uid}.tier` on every auth
    cycle — it's the single field that flips without a re-sign-in, so it
    must be fresh per request rather than cached at sign-in time. Phase 3
    Task 2 consumes it for rate-limit decisions; first-touch users default
    to "free".
    """

    uid: str
    email: str | None
    display_name: str | None
    photo_url: str | None
    tier: str = "free"


def _init_firebase_admin() -> firebase_admin.App:
    """Initialise `firebase_admin` exactly once per process.

    Raises `HTTPException(503)` when the service-account key env var is
    unset, is not valid JSON, or is JSON that `credentials.Certificate`
    rejects as a malformed service account — all three are "service
    misconfigured" states, not "bad token," so a 401 would mislead the
    client.
    """
    global _app
    if _app is not None:
        return _app
    with _init_lock:
        if _app is not None:
            return _app
        raw = os.environ.get(_FIREBASE_ADMIN_KEY_ENV)
        if not raw:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin not configured",
            )
        try:
            cred_dict = json.loads(raw)
            cred = credentials.Certificate(cred_dict)
            _app = firebase_admin.initialize_app(cred)
        except json.JSONDecodeError as exc:
            _logger.exception("FIREBASE_ADMIN_KEY is not valid JSON")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin key is malformed",
            ) from exc
        except (ValueError, TypeError) as exc:
            # `credentials.Certificate` raises ValueError on missing keys
            # (e.g. no "private_key") and TypeError on wrong-shape inputs.
            _logger.exception("FIREBASE_ADMIN_KEY is not a valid service-account credential")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin key is malformed",
            ) from exc
        return _app


def _get_firestore() -> Any:
    """Return the process-wide Firestore client, initialising on first use."""
    global _firestore_client
    _init_firebase_admin()
    if _firestore_client is None:
        _firestore_client = firestore.client()
    return _firestore_client


def get_firestore() -> Any:
    """Public re-export of the process-wide Firestore client.

    Route modules (e.g. Phase 3's `evaluations.py`) import this instead of
    `_get_firestore` so the boundary stays clear: all Firebase surface area
    flows through this module. Tests should stub this by monkey-patching
    `app.auth.get_firestore` to return a mock.
    """
    return _get_firestore()


def verify_firebase_id_token(id_token: str) -> dict[str, Any]:
    """Verify a Firebase ID token and return the decoded claims.

    Wraps `firebase_admin.auth.verify_id_token` so routes import from this
    module only — keeping the Firebase surface area to one file.
    """
    _init_firebase_admin()
    return fb_auth.verify_id_token(id_token)


def _upsert_user_doc(uid: str, claims: dict[str, Any]) -> str:
    """Lazy-create `users/{uid}` on first touch; refresh `lastLoginAt` after.

    Returns the user's current `tier` ("free" or "pro") — read from the
    existing doc, or `"free"` on fresh creation. Phase 3 Task 2 consumes it
    for rate-limit enforcement, so piggybacking on the snapshot we already
    fetched beats a second round-trip per request.

    Shape per spec §3.3:
        email, displayName, photoURL, tier ∈ {"free", "pro"},
        createdAt, lastLoginAt, pdpaConsentAt (null until sign-up consent).

    Two-request race is tolerated (spec §3.5 "acknowledged-and-accepted"):
    both writers would set the same claims on identical creation data, and
    `.set(merge=True)` is idempotent.
    """
    db = _get_firestore()
    ref = db.collection("users").document(uid)
    snapshot = ref.get()
    if snapshot.exists:
        ref.update({"lastLoginAt": firestore.SERVER_TIMESTAMP})
        data = snapshot.to_dict() or {}
        tier = data.get("tier", "free")
        return tier if tier in ("free", "pro") else "free"
    ref.set(
        {
            "email": claims.get("email"),
            "displayName": claims.get("name"),
            "photoURL": claims.get("picture"),
            "tier": "free",
            "createdAt": firestore.SERVER_TIMESTAMP,
            "lastLoginAt": firestore.SERVER_TIMESTAMP,
            "pdpaConsentAt": None,
        }
    )
    return "free"


async def current_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
) -> UserInfo:
    """FastAPI dependency — verify the bearer token, lazy-create the user doc.

    Raises:
        HTTPException(401): missing header, malformed header, invalid token,
            or expired token. The client retries after re-auth.
        HTTPException(503): Firebase Admin is not configured. Operations
            problem, not a client problem.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    id_token = authorization.split(" ", 1)[1].strip()
    if not id_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = verify_firebase_id_token(id_token)
    except (
        fb_auth.InvalidIdTokenError,
        fb_auth.ExpiredIdTokenError,
        fb_auth.RevokedIdTokenError,
        fb_auth.UserDisabledError,
    ) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase ID token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except fb_auth.CertificateFetchError as exc:
        # Google cert endpoint is transiently unreachable — retryable, so 503
        # beats 401 (which would make the client re-auth for no reason).
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Token verification temporarily unavailable",
        ) from exc

    uid = claims.get("uid")
    if not uid:
        # `verify_id_token` always sets `uid` for Firebase-minted tokens.
        # If this ever fires, something returned a non-Firebase JWT.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing uid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    tier = _upsert_user_doc(uid, claims)

    request.state.user_id = uid
    return UserInfo(
        uid=uid,
        email=claims.get("email"),
        display_name=claims.get("name"),
        photo_url=claims.get("picture"),
        tier=tier,
    )


CurrentUser = Annotated[UserInfo, Depends(current_user)]
