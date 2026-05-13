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

# Hackathon judges hit /api/auth/guest-token; "pro" tier bypasses the free-tier 24h rate limit.
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
    # tier/language/role are re-read per request — they flip without a re-sign-in.
    uid: str
    email: str | None
    display_name: str | None
    photo_url: str | None
    tier: str = "free"
    language: str = "en"
    role: Literal["user", "admin"] = "user"


def _init_firebase_admin() -> firebase_admin.App:
    # 503 (not 401) on missing/malformed FIREBASE_ADMIN_KEY — service is misconfigured, not the token.
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
    _init_firebase_admin()
    if _state.firestore_client is None:
        _state.firestore_client = firestore.client()
    return _state.firestore_client


def get_firestore() -> Any:
    return _get_firestore()


def mint_guest_custom_token() -> str:
    # Pre-creates users/guest-demo with tier="pro" so _upsert_user_doc doesn't downgrade it.
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
    _init_firebase_admin()
    return fb_auth.verify_id_token(id_token)


_SUPPORTED_LANGUAGES = ("en", "ms", "zh")
_VALID_ROLES: tuple[Literal["user", "admin"], ...] = ("user", "admin")


def _coerce_language(raw: Any) -> str:
    if isinstance(raw, str) and raw in _SUPPORTED_LANGUAGES:
        return raw
    return "en"


def _coerce_role(raw: Any) -> Literal["user", "admin"]:
    if isinstance(raw, str) and raw in _VALID_ROLES:
        return raw  # type: ignore[return-value]
    return "user"


def _upsert_user_doc(
    uid: str, claims: dict[str, Any], has_consent: bool = False
) -> tuple[str, str, Literal["user", "admin"]]:
    # Two-request race is tolerated — .set(merge=True) is idempotent.
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
        # Google cert endpoint transiently unreachable — 503 keeps the client from re-authing pointlessly.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Token verification temporarily unavailable",
        ) from exc

    uid = claims.get("uid")
    if not uid:
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
    verify_admin_role(user)
    return user


def verify_admin_role(user: UserInfo) -> None:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )


AdminUser = Annotated[UserInfo, Depends(require_admin)]
