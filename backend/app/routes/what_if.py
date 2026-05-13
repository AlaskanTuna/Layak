"""POST /api/evaluations/{evalId}/what-if — Phase 11 Feature 3 endpoint.

Authed: caller must own the evaluation. Rate-limited separately from
the evaluation quota: 5 calls / minute / uid for free tier (spec §4.5).

The endpoint loads the persisted eval doc, reconstructs the baseline
Profile + SchemeMatch list, runs the partial rerun service, and
returns the delta-annotated result. It does NOT persist anything —
the original evaluations/{evalId} doc remains the durable record.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, HTTPException, Response, status
from fastapi import Path as PathParam
from pydantic import ValidationError

from app.auth import CurrentUser, get_firestore
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import SchemeMatch
from app.schema.what_if import (
    WhatIfRequest,
    WhatIfResponse,
    WhatIfStrategyRequest,
    WhatIfStrategyResponse,
)
from app.services.what_if import (
    WhatIfRateLimitError,
    check_rate_limit,
    run_what_if,
    run_what_if_strategy_refresh,
)

_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/evaluations", tags=["what-if"])

_SUPPORTED_LANGUAGES: tuple[SupportedLanguage, ...] = ("en", "ms", "zh")


def _coerce_language(raw: str | None) -> SupportedLanguage:
    if raw in _SUPPORTED_LANGUAGES:
        return raw  # type: ignore[return-value]
    return DEFAULT_LANGUAGE


@router.post(
    "/{eval_id}/what-if",
    response_model=WhatIfResponse,
)
async def what_if(
    user: CurrentUser,
    payload: WhatIfRequest,
    eval_id: Annotated[str, PathParam(min_length=1)],
) -> WhatIfResponse | Response:
    """Run a what-if partial rerun on a persisted evaluation."""
    # Rate limit BEFORE we hit Firestore — cheap fast-fail for abuse.
    try:
        check_rate_limit(user.uid, is_pro=user.tier == "pro")
    except WhatIfRateLimitError as exc:
        return Response(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            headers={"Retry-After": str(int(exc.retry_after_seconds))},
            content="What-if rate limit exceeded; try again shortly.",
            media_type="text/plain",
        )

    db = get_firestore()
    snap = db.collection("evaluations").document(eval_id).get()
    if not getattr(snap, "exists", False):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    doc = snap.to_dict() or {}

    # Ownership gate — 404 (not 403) to avoid leaking eval-id existence.
    if doc.get("userId") != user.uid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")

    if doc.get("status") == "running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evaluation is still running — wait until it completes.",
        )

    raw_profile = doc.get("profile")
    if not isinstance(raw_profile, dict):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evaluation has no profile to vary against.",
        )
    try:
        baseline_profile = Profile.model_validate(raw_profile)
    except ValidationError as exc:
        _logger.exception("baseline profile validation failed for eval=%s", eval_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored evaluation profile is malformed",
        ) from exc

    raw_matches = doc.get("matches") or []
    baseline_matches: list[SchemeMatch] = []
    for entry in raw_matches:
        if not isinstance(entry, dict):
            continue
        try:
            baseline_matches.append(SchemeMatch.model_validate(entry))
        except ValidationError:
            # Skip the bad entry; the rerun still works on a partial baseline.
            _logger.warning("skipping malformed baseline match in eval=%s", eval_id)

    language = _coerce_language(doc.get("language"))

    return await run_what_if(
        baseline_profile=baseline_profile,
        baseline_matches=baseline_matches,
        overrides=payload.overrides,
        language=language,
    )


@router.post(
    "/{eval_id}/what-if/strategy",
    response_model=WhatIfStrategyResponse,
)
async def refresh_what_if_strategy(
    user: CurrentUser,
    payload: WhatIfStrategyRequest,
    eval_id: Annotated[str, PathParam(min_length=1)],
) -> WhatIfStrategyResponse:
    db = get_firestore()
    snap = db.collection("evaluations").document(eval_id).get()
    if not getattr(snap, "exists", False):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    doc = snap.to_dict() or {}
    if doc.get("userId") != user.uid:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")
    if doc.get("status") == "running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evaluation is still running — wait until it completes.",
        )
    raw_profile = doc.get("profile")
    if not isinstance(raw_profile, dict):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evaluation has no profile to vary against.",
        )
    try:
        baseline_profile = Profile.model_validate(raw_profile)
    except ValidationError as exc:
        _logger.exception("baseline profile validation failed for eval=%s", eval_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stored evaluation profile is malformed",
        ) from exc
    language = _coerce_language(doc.get("language"))
    return await run_what_if_strategy_refresh(
        baseline_profile=baseline_profile,
        overrides=payload.overrides,
        language=language,
    )
