from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, status
from firebase_admin import auth as fb_auth
from pydantic import BaseModel, ConfigDict
from starlette.responses import Response

from app.auth import CurrentUser, get_firestore, is_guest
from app.schema.locale import SupportedLanguage

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user"])

# Firestore batch.commit() caps at 500 ops; leave headroom for the final user-doc delete.
_BATCH_MAX_OPS = 450


class _UserMeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    uid: str
    email: str | None
    displayName: str | None  # noqa: N815 — matches Firestore field casing.
    photoURL: str | None  # noqa: N815
    tier: str
    language: SupportedLanguage
    role: Literal["user", "admin"]


class _PreferencesPatch(BaseModel):
    # extra="forbid" so a typo like {"lang": "ms"} 422s instead of silently no-op'ing.
    model_config = ConfigDict(extra="forbid")

    language: SupportedLanguage


@router.get("/me")
async def get_user_me(user: CurrentUser) -> _UserMeResponse:
    return _UserMeResponse(
        uid=user.uid,
        email=user.email,
        displayName=user.display_name,
        photoURL=user.photo_url,
        tier=user.tier,
        language=user.language,  # type: ignore[arg-type]
        role=user.role,
    )


@router.patch("/preferences", status_code=status.HTTP_204_NO_CONTENT)
async def patch_user_preferences(payload: _PreferencesPatch, user: CurrentUser) -> Response:
    db = get_firestore()
    db.collection("users").document(user.uid).update({"language": payload.language})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/export")
async def export_user_data(user: CurrentUser) -> Response:
    # PDPA §26 data-subject access. Cache-Control: no-store because the body is personal data.
    db = get_firestore()
    user_ref = db.collection("users").document(user.uid)
    user_snap = user_ref.get()
    user_payload: dict[str, Any] | None = None
    if user_snap.exists:
        user_payload = _serialise_doc(user_snap.to_dict() or {})

    eval_rows: list[dict[str, Any]] = []
    eval_query = (
        db.collection("evaluations")
        .where("userId", "==", user.uid)
        .order_by("createdAt", direction="DESCENDING")
    )
    for snap in eval_query.stream():
        row: dict[str, Any] = {"id": snap.id}
        row.update(_serialise_doc(snap.to_dict() or {}))
        eval_rows.append(row)

    bundle = {
        "uid": user.uid,
        "exportedAt": datetime.now(UTC).isoformat(),
        "schemaVersion": 1,
        "user": user_payload,
        "evaluations": eval_rows,
    }

    body = json.dumps(bundle, ensure_ascii=False, indent=2)
    filename = f"layak-export-{user.uid}.json"
    return Response(
        content=body,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(user: CurrentUser) -> Response:
    # PDPA §34 right-to-erasure. Firestore first, then Auth — partial failure never strands records.
    if is_guest(user.uid):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The shared demo guest account cannot be deleted.",
        )
    db = get_firestore()
    try:
        _cascade_delete_firestore(db, user.uid)
    except Exception as exc:  # noqa: BLE001 — surface as 500 so the client retries.
        _logger.exception("Firestore cascade delete failed for uid=%s", user.uid)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete Firestore data",
        ) from exc

    try:
        fb_auth.delete_user(user.uid)
    except fb_auth.UserNotFoundError:
        # Idempotent on prior partial-success retry — Firestore cleanup already landed.
        _logger.info("Firebase user %s already removed; Firestore was cleaned up", user.uid)
    except Exception as exc:  # noqa: BLE001
        _logger.exception("Firebase Auth delete failed for uid=%s", user.uid)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firestore data removed; Firebase Auth deletion failed, please retry",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _cascade_delete_firestore(db: Any, uid: str) -> None:
    eval_query = db.collection("evaluations").where("userId", "==", uid)
    batch = db.batch()
    ops_in_batch = 0
    for snap in eval_query.stream():
        batch.delete(snap.reference)
        ops_in_batch += 1
        if ops_in_batch >= _BATCH_MAX_OPS:
            batch.commit()
            batch = db.batch()
            ops_in_batch = 0
    batch.delete(db.collection("users").document(uid))
    batch.commit()


def _serialise_doc(data: dict[str, Any]) -> dict[str, Any]:
    # Firestore Admin SDK returns DatetimeWithNanoseconds — duck-types as datetime.
    return {key: _serialise_value(value) for key, value in data.items()}


def _serialise_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return _serialise_doc(value)
    if isinstance(value, list):
        return [_serialise_value(v) for v in value]
    return value


__all__ = [
    "router",
    "export_user_data",
    "delete_user_account",
    "get_user_me",
    "patch_user_preferences",
]
