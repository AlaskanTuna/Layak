"""Pydantic models for What-If scenario preview and advisory refresh."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schema.profile import HouseholdClassification
from app.schema.scheme import SchemeId, SchemeMatch
from app.schema.strategy import StrategyAdvice

DeltaStatus = Literal["gained", "lost", "tier_changed", "amount_changed", "unchanged"]


class WhatIfRequest(BaseModel):
    """POST body for `/api/evaluations/{evalId}/what-if`."""

    model_config = ConfigDict(extra="forbid")

    overrides: dict[str, Any] = Field(default_factory=dict)


class SchemeDelta(BaseModel):
    """One scheme's diff between the baseline match and the What-If rerun."""

    model_config = ConfigDict(extra="forbid")

    scheme_id: SchemeId
    status: DeltaStatus
    baseline_annual_rm: float | None = None
    new_annual_rm: float | None = None
    delta_rm: float = 0.0
    # When status == "tier_changed", these carry the raw baseline + rerun
    # summary strings so the frontend can render the diff however it likes
    # (line-clamp, hover tooltip, etc.) without backend pre-truncation. Both
    # `None` for other statuses.
    baseline_summary: str | None = Field(default=None, max_length=400)
    rerun_summary: str | None = Field(default=None, max_length=400)


class WhatIfSuggestion(BaseModel):
    """One nearby deterministic breakpoint worth trying from the active scenario."""

    model_config = ConfigDict(extra="forbid")

    field: Literal["monthly_income_rm", "dependants_count", "elderly_dependants_count"]
    suggested_value: float
    label: str = Field(min_length=1, max_length=160)
    scheme_id: SchemeId | None = None


class WhatIfResponse(BaseModel):
    """Fast deterministic scenario preview. Strategy may refresh separately."""

    model_config = ConfigDict(extra="forbid")

    total_annual_rm: float = Field(ge=0)
    matches: list[SchemeMatch] = Field(default_factory=list)
    strategy: list[StrategyAdvice] = Field(default_factory=list)
    deltas: list[SchemeDelta] = Field(default_factory=list)
    classification: HouseholdClassification
    suggestions: list[WhatIfSuggestion] = Field(default_factory=list)


class WhatIfStrategyRequest(BaseModel):
    """POST body for `/api/evaluations/{evalId}/what-if/strategy`."""

    model_config = ConfigDict(extra="forbid")

    overrides: dict[str, Any] = Field(default_factory=dict)


class WhatIfStrategyResponse(BaseModel):
    """Model-backed advisory enrichment for a deterministic What-If preview."""

    model_config = ConfigDict(extra="forbid")

    strategy: list[StrategyAdvice] = Field(default_factory=list)
