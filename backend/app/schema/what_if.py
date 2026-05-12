"""Pydantic models for the What-If Scenario endpoint (Phase 11 Feature 3).

`/api/evaluations/{evalId}/what-if` is a lightweight partial-rerun: it
applies caller-supplied profile overrides on top of a persisted
evaluation, re-runs only the deterministic / cheap steps
(`classify_household → match_schemes → optimize_strategy`), and returns
a delta-annotated match list. The expensive steps (`extract_profile`,
`compute_upside`, `generate_packet`) are skipped — extract has nothing
to re-derive when the profile is already known; compute_upside is just
a sum over the matches; generate_packet is purely cosmetic.

The endpoint is stateless w.r.t. Firestore — it does NOT persist the
what-if response. The original `evaluations/{evalId}` doc remains the
durable record so a slider drag doesn't pollute history.

Rate limit (spec §4.5): free-tier callers get 5 what-if calls per
minute, independent of the daily evaluation quota.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schema.scheme import SchemeId, SchemeMatch
from app.schema.strategy import StrategyAdvice

# Delta status enum.
#   gained         — scheme didn't qualify in the baseline, now does
#   lost           — qualified in the baseline, now doesn't
#   tier_changed   — still qualifies but moved to a new tier within the same
#                    rule (e.g. STR Tier 2 → Tier 1)
#   amount_changed — annual_rm changed without a tier shift
#   unchanged      — no material change vs. baseline
DeltaStatus = Literal["gained", "lost", "tier_changed", "amount_changed", "unchanged"]


class WhatIfRequest(BaseModel):
    """POST body for `/api/evaluations/{evalId}/what-if`.

    `overrides` is a sparse map of Profile field names → new values.
    Only the slider-bound fields are supported in v1 (see
    `_apply_overrides` in `app.services.what_if`):
      - `monthly_income_rm: float`
      - `dependants_count: int`           (number of children-under-18 dependants)
      - `elderly_dependants_count: int`   (number of parent-aged 60+ dependants)

    Unknown keys are silently dropped server-side; callers should not
    rely on validation rejecting typos.
    """

    model_config = ConfigDict(extra="forbid")

    overrides: dict[str, Any] = Field(default_factory=dict)


class SchemeDelta(BaseModel):
    """One scheme's diff between the baseline match and the what-if rerun."""

    model_config = ConfigDict(extra="forbid")

    scheme_id: SchemeId
    status: DeltaStatus
    baseline_annual_rm: float | None = None  # None when status == "gained"
    new_annual_rm: float | None = None  # None when status == "lost"
    delta_rm: float = 0.0  # signed; positive = more money
    note: str | None = Field(default=None, max_length=80)  # e.g. "Tier 2 → Tier 1"


class WhatIfResponse(BaseModel):
    """What-if rerun result — slim, no draft packets.

    `matches` carries the re-ranked qualifying schemes (so the frontend
    can re-animate scheme cards into the new order); `strategy` is the
    re-run optimizer output (the new profile may trip different
    interaction rules); `deltas` is the per-scheme diff vs. baseline so
    the frontend renders delta chips without re-deriving them.
    """

    model_config = ConfigDict(extra="forbid")

    total_annual_rm: float = Field(ge=0)
    matches: list[SchemeMatch] = Field(default_factory=list)
    strategy: list[StrategyAdvice] = Field(default_factory=list)
    deltas: list[SchemeDelta] = Field(default_factory=list)
