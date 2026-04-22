"""Pydantic models for scheme matches and rule provenance (docs/trd.md §3, FR-6/7/9).

Every numeric value surfaced in the UI must carry at least one RuleCitation — this is
the grounding invariant from docs/prd.md NFR-2.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SchemeId = Literal["str_2026", "jkm_warga_emas", "lhdn_form_b", "lhdn_form_be"]


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
