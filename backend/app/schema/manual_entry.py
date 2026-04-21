"""Pydantic models for the manual-entry intake path (FR-21).

A privacy-cautious user can type the fields the OCR `extract` step would
otherwise derive from their MyKad / payslip / utility-bill uploads. The
pipeline reuses the same `Profile` downstream; only the intake payload
shape is new.

Design contract: docs/superpowers/specs/2026-04-21-manual-entry-mode-design.md §3.
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schema.profile import Relationship

EmploymentType = str  # narrowed via Literal below
# Using a Literal directly in the field annotation rather than a type alias so
# Pydantic emits the expected JSON-schema enum for a nicer 422 payload.


class DependantInput(BaseModel):
    """One household-member row submitted from the manual-entry form."""

    model_config = ConfigDict(extra="forbid")

    relationship: Relationship
    age: int = Field(ge=0, le=130)
    ic_last4: str | None = Field(default=None, pattern=r"^\d{4}$")


class ManualEntryPayload(BaseModel):
    """The JSON body accepted by `POST /api/agent/intake_manual`.

    The payload deliberately omits fields that are either derived
    (`household_size = 1 + len(dependants)`, `age = f(date_of_birth)`,
    `household_flags`) or out of scope for manual entry (`form_type` is
    mapped from the two-value `employment_type` on the wire).
    """

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    date_of_birth: date
    ic_last4: str = Field(pattern=r"^\d{4}$")
    monthly_income_rm: float = Field(ge=0, le=1_000_000)
    employment_type: str = Field(pattern=r"^(gig|salaried)$")
    address: str | None = Field(default=None, max_length=500)
    # Monthly electricity consumption in kWh from the utility bill. Optional —
    # reserved for a future electricity-subsidy rule; no current rule gates on it.
    monthly_kwh: int | None = Field(default=None, ge=0, le=10_000)
    dependants: list[DependantInput] = Field(default_factory=list, max_length=15)
