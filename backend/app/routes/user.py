"""PDPA endpoints — export + delete the caller's data (Phase 4 Task 4).

Users exercise their PDPA 2010 access-and-deletion rights here:

    GET    /api/user/export  — JSON attachment of `users/{uid}` + all `evaluations`
    DELETE /api/user         — cascade-delete all evaluations, the user doc, and the
                               Firebase Auth record

Both endpoints are authed via `CurrentUser`; only the caller's own data is
touched. No admin-impersonation path is exposed here — tier flips live outside
the product (gcloud / one-off script per v2 non-goals).

Delete ordering:
    1. Firestore batch: delete every `evaluations/{evalId}` where
       userId == uid, then `users/{uid}`.
    2. `firebase_admin.auth.delete_user(uid)` — revokes the Auth record.

If step 2 fails after step 1 succeeded, the caller keeps an Auth session but
the `users/{uid}` doc is gone; `auth.py::_upsert_user_doc` will lazy-create a
fresh empty one on next authed request. The cascade is one-way, so a
half-success still honours the deletion intent.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status
from firebase_admin import auth as fb_auth
from starlette.responses import Response

from app.auth import CurrentUser, get_firestore, is_guest

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user"])

# Firestore batch.commit() caps at 500 ops per batch. For free-tier users the
# cap of 5 evaluations / 24h + prune means delete is well under this, but the
# batch loop below still chunks so a Pro user with months of history can be
# removed without special casing.
_BATCH_MAX_OPS = 450  # leave headroom for the final user-doc delete


@router.get("/export")
async def export_user_data(user: CurrentUser) -> Response:
    """PDPA §26 data-subject access — hand the caller a JSON bundle of everything
    the backend knows about them.

    Shape:
        {
          "uid": "<firebase uid>",
          "exportedAt": "<ISO-8601 UTC>",
          "schemaVersion": 1,
          "user": { ... users/{uid} doc ... } | null,
          "evaluations": [ { "id": "<evalId>", ...doc... }, ... ]
        }

    Returned as `application/json` with a `Content-Disposition: attachment`
    header so the browser saves rather than renders. `Cache-Control: no-store`
    because the body is personal data.
    """
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
    """PDPA §34 right-to-erasure — cascade-delete the caller's Firestore data
    and Firebase Auth record.

    Firestore writes are batched; the Auth delete runs after. A failure at the
    Auth step is logged but surfaces as 500 to the client so the frontend can
    retry (the Firestore delete has already succeeded). Ordering is deliberate:
    wiping data first and revoking Auth second means a partial failure never
    leaves the user with a locked-out session AND live records.

    The shared demo guest account is protected — deleting it would wipe the
    public-access demo for every other judge. Guests get a 403.
    """
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
        # Auth side already gone (maybe a prior partial-success retry) —
        # Firestore cleanup still landed, treat the delete as complete.
        _logger.info("Firebase user %s already removed; Firestore was cleaned up", user.uid)
    except Exception as exc:  # noqa: BLE001
        _logger.exception("Firebase Auth delete failed for uid=%s", user.uid)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Firestore data removed; Firebase Auth deletion failed, please retry",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _cascade_delete_firestore(db: Any, uid: str) -> None:
    """Delete every `evaluations/{evalId}` where userId == uid, then `users/{uid}`.

    Runs in batches of `_BATCH_MAX_OPS` so a Pro user with hundreds of evals
    still completes under Firestore's 500-ops-per-batch cap.
    """
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
    """Convert Firestore-returned fields to JSON-serialisable primitives.

    The Admin SDK returns `DatetimeWithNanoseconds` for timestamp fields —
    those quack like `datetime` and serialise via `.isoformat()`. Everything
    else passes through unchanged; nested dicts / lists recurse.
    """
    return {key: _serialise_value(value) for key, value in data.items()}


def _serialise_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return _serialise_doc(value)
    if isinstance(value, list):
        return [_serialise_value(v) for v in value]
    return value


__all__ = ["router", "export_user_data", "delete_user_account"]
