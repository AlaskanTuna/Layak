"""Layak v2 — Firebase Auth boundary for the FastAPI backend.

The backend is the **only** writer to Firestore (see `firestore.rules` — every
`allow write: if false` relies on Admin-SDK bypass). This module is the single
gate: every authed route declares `user: UserInfo = Depends(current_user)`,
which verifies the incoming Firebase ID token, lazy-creates the user's
`users/{uid}` document on first touch, and hands the route an immutable
`UserInfo`. Route code never calls `firebase_admin` or `firestore` directly.

Credentials:
    Cloud Run injects the Firebase service-account JSON as `FIREBASE_ADMIN_KEY`
    via `--set-secrets=FIREBASE_ADMIN_KEY=firebase-admin-key:latest`. If the env
    var is missing, `current_user` returns 503 Service Unavailable — not 500
    — so the frontend can distinguish a misconfigured service from a bad token.

Role model:
    Every `users/{uid}` doc carries a `role` field (`"user"` or `"admin"`).
    Sign-ups default to `"user"`. Admins are set by direct Firestore write
    (e.g. via a seed script or the Firebase Console). The backend reads
    `role` from Firestore on every authed request — single source of truth,
    no token-claim mirror. Legacy docs missing the field are backfilled to
    `"user"` on first authed touch so the field is monotonically present.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from threading import Lock
from typing import Annotated, Any, Literal

import firebase_admin
from fastapi import Depends, Header, HTTPException, Request, status
from firebase_admin import auth as fb_auth
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1 import SERVER_TIMESTAMP  # type: ignore[attr-defined, unused-ignore]

_logger = logging.getLogger(__name__)

_FIREBASE_ADMIN_KEY_ENV = "FIREBASE_ADMIN_KEY"
_init_lock = Lock()

# Shared demo account used by the public-access guest sign-in flow. Hackathon
# submission requires the deployed URL to be reachable without Google sign-in,
# so /api/auth/guest-token mints a Firebase custom token for this fixed UID
# and the frontend signs in via signInWithCustomToken. Tier is "pro" so concurrent
# judges aren't gated by the free-tier 24h rate limit.
GUEST_UID = "guest-demo"
GUEST_DISPLAY_NAME = "Guest Demo"
GUEST_EMAIL = "guest@layak.demo"
GUEST_TIER = "pro"


def is_guest(uid: str) -> bool:
    return uid == GUEST_UID


@dataclass(slots=True)
class _FirebaseState:
    app: firebase_admin.App | None = None
    firestore_client: Any | None = None


_state = _FirebaseState()


@dataclass(frozen=True, slots=True)
class UserInfo:
    """Owner identity propagated to every authed route.

    `uid` is the Firebase Auth UID and the single source of truth for
    `request.user_id`. `email` / `display_name` / `photo_url` come from the
    verified ID-token claims and are cached onto `users/{uid}` on first touch
    so later endpoints can read them without calling Firebase Auth again.

    `tier` ("free" | "pro") is read from `users/{uid}.tier` on every auth
    cycle — it's the single field that flips without a re-sign-in, so it
    must be fresh per request rather than cached at sign-in time. Consumed
    for rate-limit decisions; first-touch users default to "free".

    `language` ("en" | "ms" | "zh"). Read from `users/{uid}.language` on
    every auth cycle so the pipeline prompts and `humanize_error` pick up
    the user's current preference. Legacy docs without the field default
    to `"en"`.

    `role` ("user" | "admin"). Read from `users/{uid}.role` on every auth
    cycle. Defaults to `"user"` for fresh sign-ups and legacy docs missing
    the field (backfilled on first authed touch via `_upsert_user_doc`).
    """

    uid: str
    email: str | None
    display_name: str | None
    photo_url: str | None
    tier: str = "free"
    language: str = "en"
    role: Literal["user", "admin"] = "user"


def _init_firebase_admin() -> firebase_admin.App:
    """Initialise `firebase_admin` exactly once per process.

    Raises `HTTPException(503)` when the service-account key env var is
    unset, is not valid JSON, or is JSON that `credentials.Certificate`
    rejects as a malformed service account — all three are "service
    misconfigured" states, not "bad token," so a 401 would mislead the
    client.
    """
    with _init_lock:
        if _state.app is not None:
            return _state.app
        raw = os.environ.get(_FIREBASE_ADMIN_KEY_ENV)
        if not raw:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin not configured",
            )
        try:
            cred_dict = json.loads(raw)
            cred = credentials.Certificate(cred_dict)
            app = firebase_admin.initialize_app(cred)
            _state.app = app
            return app
        except json.JSONDecodeError as exc:
            _logger.exception("FIREBASE_ADMIN_KEY is not valid JSON")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin key is malformed",
            ) from exc
        except (ValueError, TypeError) as exc:
            _logger.exception("FIREBASE_ADMIN_KEY is not a valid service-account credential")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin key is malformed",
            ) from exc
        raise RuntimeError("Firebase Admin initialisation failed unexpectedly")


def _get_firestore() -> Any:
    """Return the process-wide Firestore client, initialising on first use."""
    _init_firebase_admin()
    if _state.firestore_client is None:
        _state.firestore_client = firestore.client()
    return _state.firestore_client


def get_firestore() -> Any:
    """Public re-export of the process-wide Firestore client.

    Route modules import this instead of `_get_firestore` so the boundary
    stays clear: all Firebase surface area flows through this module. Tests
    should stub this by monkey-patching `app.auth.get_firestore` to return
    a mock.
    """
    return _get_firestore()


def mint_guest_custom_token() -> str:
    """Mint a Firebase custom token for the shared demo guest UID.

    Pre-creates `users/guest-demo` with `tier="pro"` and a signed PDPA-consent
    timestamp on first call so the lazy `_upsert_user_doc` path doesn't
    downgrade the demo to free tier on the next authed request. On repeat
    calls, refreshes `lastLoginAt` and re-asserts `tier="pro"` defensively
    in case anything mutated it out-of-band. Returns the Firebase Admin SDK
    token decoded to UTF-8 (the SDK returns bytes).
    """
    _init_firebase_admin()
    db = _get_firestore()
    ref = db.collection("users").document(GUEST_UID)
    snapshot = ref.get()
    if snapshot.exists:
        ref.update({
            "lastLoginAt": SERVER_TIMESTAMP,
            "tier": GUEST_TIER,
        })
    else:
        ref.set({
            "email": GUEST_EMAIL,
            "displayName": GUEST_DISPLAY_NAME,
            "photoURL": None,
            "tier": GUEST_TIER,
            "language": "en",
            "role": "user",
            "createdAt": SERVER_TIMESTAMP,
            "lastLoginAt": SERVER_TIMESTAMP,
            "pdpaConsentAt": SERVER_TIMESTAMP,
            "isGuest": True,
        })

    token = fb_auth.create_custom_token(GUEST_UID)
    if isinstance(token, bytes):
        return token.decode("utf-8")
    return token


def verify_firebase_id_token(id_token: str) -> dict[str, Any]:
    """Verify a Firebase ID token and return the decoded claims.

    Wraps `firebase_admin.auth.verify_id_token` so routes import from this
    module only — keeping the Firebase surface area to one file.
    """
    _init_firebase_admin()
    return fb_auth.verify_id_token(id_token)


_SUPPORTED_LANGUAGES = ("en", "ms", "zh")
_VALID_ROLES: tuple[Literal["user", "admin"], ...] = ("user", "admin")


def _coerce_language(raw: Any) -> str:
    """Clamp a Firestore `language` value to a supported code or `"en"`."""
    if isinstance(raw, str) and raw in _SUPPORTED_LANGUAGES:
        return raw
    return "en"


def _coerce_role(raw: Any) -> Literal["user", "admin"]:
    """Clamp a Firestore `role` value to a known role or `"user"`."""
    if isinstance(raw, str) and raw in _VALID_ROLES:
        return raw  # type: ignore[return-value]
    return "user"


def _upsert_user_doc(
    uid: str, claims: dict[str, Any], has_consent: bool = False
) -> tuple[str, str, Literal["user", "admin"]]:
    """Lazy-create `users/{uid}` on first touch; refresh `lastLoginAt` after.

    Returns `(tier, language, role)` — read from the existing doc, or
    `("free", "en", "user")` on fresh creation. `tier` drives rate-limit
    enforcement, `language` drives pipeline localisation, `role` gates
    admin routes. Legacy docs missing the `role` field are backfilled to
    `"user"` on touch so the field is monotonically present.

    Shape:
        email, displayName, photoURL, tier ∈ {"free", "pro"},
        language ∈ {"en", "ms", "zh"}, role ∈ {"user", "admin"},
        createdAt, lastLoginAt, pdpaConsentAt (null until sign-up consent).

    Two-request race is tolerated (acknowledged-and-accepted): both writers
    would set the same claims on identical creation data, and
    `.set(merge=True)` is idempotent.
    """
    db = _get_firestore()
    ref = db.collection("users").document(uid)
    snapshot = ref.get()

    update_data: dict[str, Any] = {"lastLoginAt": SERVER_TIMESTAMP}
    if has_consent:
        update_data["pdpaConsentAt"] = SERVER_TIMESTAMP

    if snapshot.exists:
        data = snapshot.to_dict() or {}
        tier = data.get("tier", "free")
        tier = tier if tier in ("free", "pro") else "free"
        language = _coerce_language(data.get("language"))
        role = _coerce_role(data.get("role"))
        if data.get("role") not in _VALID_ROLES:
            # Backfill the role field on legacy docs — idempotent on touch.
            update_data["role"] = role
        ref.update(update_data)
        return tier, language, role

    new_doc = {
        "email": claims.get("email"),
        "displayName": claims.get("name"),
        "photoURL": claims.get("picture"),
        "tier": "free",
        "language": "en",
        "role": "user",
        "createdAt": SERVER_TIMESTAMP,
        "lastLoginAt": SERVER_TIMESTAMP,
        "pdpaConsentAt": SERVER_TIMESTAMP if has_consent else None,
    }
    ref.set(new_doc)
    return "free", "en", "user"


async def current_user(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
    x_pdpa_consent: Annotated[str | None, Header()] = None,
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

    has_consent = x_pdpa_consent == "true"
    tier, language, role = _upsert_user_doc(uid, claims, has_consent)

    request.state.user_id = uid
    return UserInfo(
        uid=uid,
        email=claims.get("email"),
        display_name=claims.get("name"),
        photo_url=claims.get("picture"),
        tier=tier,
        language=language,
        role=role,
    )


CurrentUser = Annotated[UserInfo, Depends(current_user)]


async def require_admin(user: CurrentUser) -> UserInfo:
    """FastAPI dependency that 403s any non-admin caller.

    Pairs with `verify_admin_role(user)` for routes that need to check the
    role mid-handler (rather than via `Depends`). Both paths read the same
    `user.role` snapshot.
    """
    verify_admin_role(user)
    return user


def verify_admin_role(user: UserInfo) -> None:
    """Raise 403 when `user.role` is not `"admin"`.

    Imperative-style guard for code paths that already have a `UserInfo`
    in hand. Routes that want dependency-style enforcement should use
    `Depends(require_admin)` instead.
    """
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )


AdminUser = Annotated[UserInfo, Depends(require_admin)]
