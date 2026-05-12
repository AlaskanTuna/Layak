"""Public scheme verification surface.

`GET /api/schemes/verified` returns a slim map of `scheme_id → verified_at`
read from the `verified_schemes` Firestore collection. The frontend uses
this to render the "Source verified DD MMM YYYY via automated discovery"
badge on every scheme card across `/dashboard/schemes` and the results
page, without exposing the full discovery-pipeline payload.

This endpoint is intentionally unauthenticated: the verification timestamp
is a public trust signal — it is the same data we surface on the marketing
landing — and unauthed access avoids gating the schemes overview behind a
sign-in for unauthenticated visitors.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from app.auth import get_firestore

router = APIRouter(prefix="/api/schemes", tags=["schemes"])


class VerifiedSchemeRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scheme_id: str
    verified_at: str | None


class VerifiedSchemesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[VerifiedSchemeRow]


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()  # type: ignore[no-any-return]
        except Exception:  # noqa: BLE001
            return None
    return None


@router.get("/verified", response_model=VerifiedSchemesResponse)
async def list_verified() -> VerifiedSchemesResponse:
    """Return `verified_at` per scheme_id for every scheme in the collection."""
    db = get_firestore()
    items: list[VerifiedSchemeRow] = []
    for doc in db.collection("verified_schemes").stream():
        data = doc.to_dict() or {}
        items.append(
            VerifiedSchemeRow(
                scheme_id=data.get("schemeId", doc.id),
                verified_at=_iso(data.get("verifiedAt")),
            )
        )
    return VerifiedSchemesResponse(items=items)
