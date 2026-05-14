"""What-If preview services: fast deterministic loop + optional advisory refresh."""

from __future__ import annotations

import logging
import time
from collections import deque
from typing import Any

from app.agents.tools.build_profile import derive_household_flags
from app.agents.tools.classify import classify_household
from app.agents.tools.match import match_schemes
from app.agents.tools.optimize_strategy import optimize_strategy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Dependant, HouseholdClassification, HouseholdFlags, Profile
from app.schema.scheme import SchemeMatch
from app.schema.what_if import (
    DeltaStatus,
    SchemeDelta,
    WhatIfResponse,
    WhatIfStrategyResponse,
)
from app.services.vertex_ai_search import disable_vertex_ai_search

_logger = logging.getLogger(__name__)

_INCOME_MIN = 0.0
_INCOME_MAX = 15_000.0
_DEPENDANTS_MAX = 6
_ELDERLY_MAX = 4
_WHATIF_WINDOW_SECONDS = 60.0
_WHATIF_MAX_CALLS = 5
_recent_calls: dict[str, deque[float]] = {}


class WhatIfRateLimitError(Exception):
    def __init__(self, retry_after_seconds: float):
        super().__init__("What-if rate limit exceeded")
        self.retry_after_seconds = retry_after_seconds


def check_rate_limit(uid: str, *, is_pro: bool) -> None:
    if is_pro:
        return
    now = time.monotonic()
    window = _recent_calls.setdefault(uid, deque(maxlen=_WHATIF_MAX_CALLS * 2))
    while window and (now - window[0]) > _WHATIF_WINDOW_SECONDS:
        window.popleft()
    if len(window) >= _WHATIF_MAX_CALLS:
        retry_after = _WHATIF_WINDOW_SECONDS - (now - window[0])
        raise WhatIfRateLimitError(retry_after_seconds=max(retry_after, 1.0))
    window.append(now)


def _build_dependants(
    *,
    existing: list[Dependant],
    children_override: int | None,
    elderly_override: int | None,
) -> list[Dependant]:
    if children_override is None and elderly_override is None:
        return existing
    preserved = [
        dependant
        for dependant in existing
        if dependant.relationship not in ("child", "sibling", "parent", "grandparent")
    ]
    children = (
        [Dependant(relationship="child", age=10) for _ in range(children_override)]
        if children_override is not None
        else [d for d in existing if d.relationship in ("child", "sibling")]
    )
    elderly = (
        [Dependant(relationship="parent", age=70) for _ in range(elderly_override)]
        if elderly_override is not None
        else [d for d in existing if d.relationship in ("parent", "grandparent")]
    )
    return preserved + children + elderly


def apply_overrides(profile: Profile, overrides: dict[str, Any]) -> Profile:
    raw_income = overrides.get("monthly_income_rm")
    raw_children = overrides.get("dependants_count")
    raw_elderly = overrides.get("elderly_dependants_count")

    new_income = (
        max(_INCOME_MIN, min(_INCOME_MAX, float(raw_income)))
        if isinstance(raw_income, int | float)
        else profile.monthly_income_rm
    )
    children_count = (
        max(0, min(_DEPENDANTS_MAX, int(raw_children)))
        if isinstance(raw_children, int | float)
        else None
    )
    elderly_count = (
        max(0, min(_ELDERLY_MAX, int(raw_elderly)))
        if isinstance(raw_elderly, int | float)
        else None
    )

    dependants = _build_dependants(
        existing=profile.dependants,
        children_override=children_count,
        elderly_override=elderly_count,
    )
    flags: HouseholdFlags = derive_household_flags(new_income, dependants)
    return profile.model_copy(
        update={
            "monthly_income_rm": new_income,
            "household_monthly_income_rm": new_income,
            "dependants": dependants,
            "household_size": 1 + len(dependants),
            "household_flags": flags,
        }
    )


def classify_household_deterministic(profile: Profile) -> HouseholdClassification:
    flags = profile.household_flags
    per_capita = round(profile.monthly_income_rm / max(profile.household_size, 1), 2)
    return HouseholdClassification(
        has_children_under_18=flags.has_children_under_18,
        has_elderly_dependant=flags.has_elderly_dependant,
        income_band=flags.income_band,
        per_capita_monthly_rm=per_capita,
        notes=[],
    )


def _round2(value: float) -> float:
    return round(value, 2)


def _floats_close(a: float, b: float, *, tol: float = 0.5) -> bool:
    return abs(a - b) <= tol


def _delta_status(baseline: SchemeMatch | None, rerun: SchemeMatch | None) -> DeltaStatus:
    baseline_qualifies = baseline is not None and baseline.qualifies
    rerun_qualifies = rerun is not None and rerun.qualifies
    if rerun_qualifies and not baseline_qualifies:
        return "gained"
    if baseline_qualifies and not rerun_qualifies:
        return "lost"
    if not baseline_qualifies and not rerun_qualifies:
        return "unchanged"
    assert baseline is not None and rerun is not None
    if baseline.summary != rerun.summary:
        return "tier_changed"
    if not _floats_close(baseline.annual_rm, rerun.annual_rm):
        return "amount_changed"
    return "unchanged"


def compute_deltas(baseline: list[SchemeMatch], rerun: list[SchemeMatch]) -> list[SchemeDelta]:
    baseline_by_id = {match.scheme_id: match for match in baseline}
    rerun_by_id = {match.scheme_id: match for match in rerun}
    deltas: list[SchemeDelta] = []
    for scheme_id in sorted(baseline_by_id.keys() | rerun_by_id.keys()):
        baseline_match = baseline_by_id.get(scheme_id)
        rerun_match = rerun_by_id.get(scheme_id)
        status = _delta_status(baseline_match, rerun_match)
        baseline_rm = baseline_match.annual_rm if (baseline_match and baseline_match.qualifies) else None
        rerun_rm = rerun_match.annual_rm if (rerun_match and rerun_match.qualifies) else None
        note = None
        if status == "tier_changed" and baseline_match and rerun_match:
            note = f"{baseline_match.summary[:36]} -> {rerun_match.summary[:36]}"
        deltas.append(
            SchemeDelta(
                scheme_id=scheme_id,
                status=status,
                baseline_annual_rm=_round2(baseline_rm) if baseline_rm is not None else None,
                new_annual_rm=_round2(rerun_rm) if rerun_rm is not None else None,
                delta_rm=_round2((rerun_rm or 0.0) - (baseline_rm or 0.0)),
                note=note,
            )
        )
    return deltas


async def run_what_if_deterministic(
    *,
    baseline_profile: Profile,
    baseline_matches: list[SchemeMatch],
    overrides: dict[str, Any],
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> WhatIfResponse:
    scenario_profile = apply_overrides(baseline_profile, overrides)
    classification = classify_household_deterministic(scenario_profile)
    with disable_vertex_ai_search():
        matches = await match_schemes(scenario_profile, language=language)
    deltas = compute_deltas(baseline_matches, matches)
    total = _round2(sum(match.annual_rm for match in matches if match.qualifies and match.kind == "upside"))
    return WhatIfResponse(
        total_annual_rm=total,
        matches=matches,
        strategy=[],
        deltas=deltas,
        classification=classification,
        suggestions=[],
    )


async def run_what_if_legacy(
    *,
    baseline_profile: Profile,
    baseline_matches: list[SchemeMatch],
    overrides: dict[str, Any],
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> WhatIfResponse:
    scenario_profile = apply_overrides(baseline_profile, overrides)
    classification = await classify_household(scenario_profile, language=language)
    matches = await match_schemes(scenario_profile, language=language)
    try:
        strategy = await optimize_strategy(scenario_profile, matches, classification, language=language)
    except Exception:  # noqa: BLE001
        _logger.exception("legacy what-if optimize_strategy failed")
        strategy = []
    deltas = compute_deltas(baseline_matches, matches)
    total = _round2(sum(match.annual_rm for match in matches if match.qualifies and match.kind == "upside"))
    return WhatIfResponse(
        total_annual_rm=total,
        matches=matches,
        strategy=strategy,
        deltas=deltas,
        classification=classification,
        suggestions=[],
    )


async def run_what_if_strategy_refresh(
    *,
    baseline_profile: Profile,
    overrides: dict[str, Any],
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> WhatIfStrategyResponse:
    scenario_profile = apply_overrides(baseline_profile, overrides)
    classification = classify_household_deterministic(scenario_profile)
    with disable_vertex_ai_search():
        matches = await match_schemes(scenario_profile, language=language)
    try:
        strategy = await optimize_strategy(scenario_profile, matches, classification, language=language)
    except Exception:  # noqa: BLE001
        _logger.exception("what-if strategy refresh failed")
        strategy = []
    return WhatIfStrategyResponse(strategy=strategy)


async def run_what_if(
    *,
    baseline_profile: Profile,
    baseline_matches: list[SchemeMatch],
    overrides: dict[str, Any],
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> WhatIfResponse:
    return await run_what_if_deterministic(
        baseline_profile=baseline_profile,
        baseline_matches=baseline_matches,
        overrides=overrides,
        language=language,
    )
