"""Pydantic models for scheme matches and rule provenance.

Every numeric value surfaced in the UI must carry at least one RuleCitation —
this is the grounding invariant.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SchemeId = Literal[
    "str_2026",
    "jkm_warga_emas",
    "jkm_bkk",
    "lhdn_form_b",
    "lhdn_form_be",
    "perkeso_sksps",
    "i_saraan",
    # `"budi95"` + `"mykasih"` added in Phase 12 Features 4 + 5 alongside
    # their rule modules + i18n catalog entries so the rule_copy_coverage
    # tests stay green.
]

# `SchemeKind` taxonomy:
# - `upside`: user RECEIVES money; `annual_rm` sums into the headline upside
#   total. Default so every legacy rule keeps its existing semantics.
# - `required_contribution`: user PAYS money (e.g. PERKESO SKSPS mandatory
#   self-employed social-security contributions). Renders in a separate UI
#   block so it doesn't misleadingly stack into "annual relief" totals.
# - `subsidy_credit` (Phase 12): user holds a subsidy / MyKad credit (BUDI95
#   RON95 quota, MyKasih SARA RM100). Info-only — does NOT stack into the
#   headline upside total because Layak can't confirm remaining balance via
#   any public API (`compute_upside` filters on `kind == "upside"`).
#   `annual_rm` is conventionally `0.0` for these schemes. Optional
#   `expires_at_iso` carries the forfeit date for time-bound credits.
SchemeKind = Literal["upside", "required_contribution", "subsidy_credit"]


class RuleCitation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rule_id: str = Field(min_length=1)
    source_pdf: str = Field(min_length=1)
    page_ref: str = Field(min_length=1)
    passage: str = Field(min_length=1)
    source_url: str | None = None


class SchemeMatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scheme_id: SchemeId
    scheme_name: str = Field(min_length=1)
    qualifies: bool
    annual_rm: float = Field(ge=0)
    summary: str = Field(min_length=1)
    why_qualify: str = Field(min_length=1)
    agency: str = Field(min_length=1)
    portal_url: str = Field(min_length=1)
    rule_citations: list[RuleCitation] = Field(default_factory=list)
    # Defaults preserve the prior shape so every earlier rule + persisted
    # Firestore doc validates without migration.
    kind: SchemeKind = "upside"
    # The annualised RM amount the user would PAY under this scheme; set only
    # when `kind == "required_contribution"`. The frontend renders this in the
    # "Required contributions" block instead of stacking it into the upside.
    annual_contribution_rm: float | None = Field(default=None, ge=0)
    # ISO-8601 date string (e.g. "2026-12-31") when the scheme's benefit
    # expires / is forfeited. Set on time-bound `subsidy_credit` schemes
    # (MyKasih RM100 → "2026-12-31"); `None` for rolling / open-ended schemes
    # (BUDI95 monthly quota; all `upside` and `required_contribution` rules).
    # The frontend renders this in bold on the card so users see the deadline
    # at a glance.
    expires_at_iso: str | None = Field(default=None)
