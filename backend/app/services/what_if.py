"""Phase 11 Feature 3 — What-If partial-rerun service.

Applies caller-supplied profile overrides on top of a persisted
evaluation, re-runs the deterministic / cheap pipeline steps
(classify → match → optimize_strategy), and returns a delta-annotated
match list. Stateless w.r.t. Firestore.

Three sliders mapped to overrides (spec §4.2):
  monthly_income_rm        float ∈ [0, 15_000]
  dependants_count         int ∈ [0, 6]   (children under 18)
  elderly_dependants_count int ∈ [0, 4]   (parents 60+)

Rate limit (spec §4.5): 5 calls / minute / uid for free tier. Pro
tier bypasses. Counter lives in-memory per process — sufficient for
the hackathon footprint (single Cloud Run instance per region). Resets
on cold start; that's acceptable since a cold start clears any
pending abuse.
"""

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
from app.schema.profile import Dependant, HouseholdFlags, Profile
from app.schema.scheme import SchemeMatch
from app.schema.what_if import DeltaStatus, SchemeDelta, WhatIfResponse

_logger = logging.getLogger(__name__)

# Slider bounds (spec §4.2). Server-side clamps so a hostile client
# can't extend the range — Pydantic catches type errors but not
# out-of-range floats.
_INCOME_MIN = 0.0
_INCOME_MAX = 15_000.0
_DEPENDANTS_MAX = 6
_ELDERLY_MAX = 4

# Rate limit knobs.
_WHATIF_WINDOW_SECONDS = 60.0
_WHATIF_MAX_CALLS = 5

# uid → deque of monotonic timestamps within the rolling 60s window.
# Single-process in-memory store; per spec §4.5 deferral, sufficient for
# v1. A v2 hardening pass moves this to Firestore counters or Redis when
# Layak scales beyond one Cloud Run instance.
_recent_calls: dict[str, deque[float]] = {}


class WhatIfRateLimitError(Exception):
    """Raised when the caller exceeded the per-minute what-if quota."""

    def __init__(self, retry_after_seconds: float):
        super().__init__("What-if rate limit exceeded")
        self.retry_after_seconds = retry_after_seconds


def check_rate_limit(uid: str, *, is_pro: bool) -> None:
    """Pro tier bypasses. Free tier: 5 / 60s rolling. Raises on excess."""
    if is_pro:
        return
    now = time.monotonic()
    window = _recent_calls.setdefault(uid, deque(maxlen=_WHATIF_MAX_CALLS * 2))
    # Drop timestamps older than the window before counting.
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
    """Rebuild the dependants list when the sliders override counts.

    Spec §4.2 sliders only adjust counts — not per-dependant ages or IC
    fragments. We re-synthesize with archetypal ages (child=10,
    parent=70) which are what the rule engines actually gate on. Other
    relationship types from the original profile (spouse, sibling) are
    preserved.
    """
    if children_override is None and elderly_override is None:
        return existing
    preserved = [d for d in existing if d.relationship not in ("child", "parent")]
    children: list[Dependant] = []
    if children_override is not None:
        children = [Dependant(relationship="child", age=10) for _ in range(children_override)]
    else:
        children = [d for d in existing if d.relationship == "child"]
    parents: list[Dependant] = []
    if elderly_override is not None:
        parents = [Dependant(relationship="parent", age=70) for _ in range(elderly_override)]
    else:
        parents = [d for d in existing if d.relationship == "parent"]
    return preserved + children + parents


def apply_overrides(profile: Profile, overrides: dict[str, Any]) -> Profile:
    """Clone the profile with the slider-bound overrides applied.

    Unknown override keys are dropped silently (the route doesn't
    surface them — the frontend only sends keys we recognise). Each
    supported key is clamped server-side so a hostile client can't
    push the rule engines past their validated ranges.
    """
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

    new_dependants = _build_dependants(
        existing=profile.dependants,
        children_override=children_count,
        elderly_override=elderly_count,
    )

    # Re-derive flags so the income_band stays consistent with the new
    # numbers (this is what the rule modules read).
    new_flags: HouseholdFlags = derive_household_flags(new_income, new_dependants)

    return profile.model_copy(
        update={
            "monthly_income_rm": new_income,
            "household_monthly_income_rm": new_income,
            "dependants": new_dependants,
            "household_size": 1 + len(new_dependants),
            "household_flags": new_flags,
        }
    )


def _round2(v: float) -> float:
    return round(v, 2)


def _delta_status(baseline: SchemeMatch | None, rerun: SchemeMatch | None) -> DeltaStatus:
    """Categorise the change between a baseline and rerun match.

    `tier_changed` is detected by checking whether the scheme_id is the
    same but the `summary` text differs (rule modules embed the tier
    label in `summary`). Falls back to `amount_changed` when summaries
    are identical but `annual_rm` changed.
    """
    baseline_qualifies = baseline is not None and baseline.qualifies
    rerun_qualifies = rerun is not None and rerun.qualifies
    if rerun_qualifies and not baseline_qualifies:
        return "gained"
    if baseline_qualifies and not rerun_qualifies:
        return "lost"
    if not baseline_qualifies and not rerun_qualifies:
        return "unchanged"
    assert baseline is not None and rerun is not None  # narrowed by the two early returns
    if baseline.summary != rerun.summary:
        return "tier_changed"
    if not _floats_close(baseline.annual_rm, rerun.annual_rm):
        return "amount_changed"
    return "unchanged"


def _floats_close(a: float, b: float, *, tol: float = 0.5) -> bool:
    return abs(a - b) <= tol


def compute_deltas(
    baseline: list[SchemeMatch],
    rerun: list[SchemeMatch],
) -> list[SchemeDelta]:
    """Diff baseline vs rerun matches keyed by scheme_id.

    Emits a `SchemeDelta` for every scheme that appears on EITHER side
    so the frontend can render "now ineligible" + "newly eligible"
    chips. `unchanged` rows are emitted too — the client filters them
    out for display but they make idempotency tests easier.
    """
    baseline_by_id = {m.scheme_id: m for m in baseline}
    rerun_by_id = {m.scheme_id: m for m in rerun}
    all_ids = sorted(baseline_by_id.keys() | rerun_by_id.keys())
    deltas: list[SchemeDelta] = []
    for scheme_id in all_ids:
        b = baseline_by_id.get(scheme_id)
        r = rerun_by_id.get(scheme_id)
        status = _delta_status(b, r)
        b_rm = b.annual_rm if (b and b.qualifies) else None
        r_rm = r.annual_rm if (r and r.qualifies) else None
        delta_rm = _round2((r_rm or 0.0) - (b_rm or 0.0))
        note: str | None = None
        if status == "tier_changed" and b and r:
            note = f"{b.summary[:36]} → {r.summary[:36]}"
        deltas.append(
            SchemeDelta(
                scheme_id=scheme_id,
                status=status,
                baseline_annual_rm=_round2(b_rm) if b_rm is not None else None,
                new_annual_rm=_round2(r_rm) if r_rm is not None else None,
                delta_rm=delta_rm,
                note=note,
            )
        )
    return deltas


async def run_what_if(
    *,
    baseline_profile: Profile,
    baseline_matches: list[SchemeMatch],
    overrides: dict[str, Any],
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> WhatIfResponse:
    """End-to-end partial rerun.

    1. Apply overrides → new Profile.
    2. classify_household on the new profile.
    3. match_schemes on the new profile.
    4. optimize_strategy on the new profile + matches (fail-open to [] on
       Gemini failure, just like the live pipeline).
    5. Compute deltas vs `baseline_matches`.
    6. Sum upside (we skip the Code Execution step — the math is just
       `sum(m.annual_rm for m in matches if m.qualifies and m.kind == "upside")`).
    """
    new_profile = apply_overrides(baseline_profile, overrides)

    classification = await classify_household(new_profile, language=language)
    rerun_matches = await match_schemes(new_profile, language=language)

    try:
        strategy = await optimize_strategy(
            new_profile, rerun_matches, classification, language=language
        )
    except Exception:  # noqa: BLE001 — strategy is optional; failure shouldn't break the rerun
        _logger.exception("what-if optimize_strategy failed; returning empty advisories")
        strategy = []

    deltas = compute_deltas(baseline_matches, rerun_matches)

    total_annual_rm = _round2(
        sum(m.annual_rm for m in rerun_matches if m.qualifies and m.kind == "upside")
    )

    return WhatIfResponse(
        total_annual_rm=total_annual_rm,
        matches=rerun_matches,
        strategy=strategy,
        deltas=deltas,
    )
