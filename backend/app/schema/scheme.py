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
]

# `SchemeKind` splits upside schemes (user RECEIVES money, annual_rm sums
# into the headline upside total) from required-contribution schemes (user
# PAYS money — e.g. PERKESO SKSPS mandatory social-security contributions).
# Required contributions render in a separate UI block so they don't
# misleadingly stack into the "annual relief" total. Defaults to `"upside"`
# so every legacy rule keeps its existing semantics without touching each
# match() call site.
SchemeKind = Literal["upside", "required_contribution"]


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
