"""Pydantic models for the manual-entry intake path (FR-21).

A privacy-cautious user can type the fields the OCR `extract` step would
otherwise derive from their MyKad / payslip / utility-bill uploads. The
pipeline reuses the same `Profile` downstream; only the intake payload
shape is new.

Design contract: docs/superpowers/specs/2026-04-21-manual-entry-mode-design.md §3.
Sanitisation contract: see `app/schema/sanitize.py` — `name` and `address`
are run through `sanitize_free_text` before reaching any Gemini prompt or
WeasyPrint template.
"""

from __future__ import annotations

from datetime import date
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field

from app.schema.profile import Relationship
from app.schema.sanitize import sanitize_address, sanitize_name

EmploymentType = str  # narrowed via Literal below
# Using a Literal directly in the field annotation rather than a type alias so
# Pydantic emits the expected JSON-schema enum for a nicer 422 payload.

# `Annotated[str, AfterValidator(...)]` runs the sanitiser on every accepted
# payload, so downstream code never sees a raw value. Length caps live inside
# the sanitiser (name: 200, address: 300) — Pydantic's `max_length` alone
# wouldn't strip control characters or Unicode overrides.
_SanitisedName = Annotated[str, AfterValidator(sanitize_name)]
_SanitisedAddress = Annotated[str, AfterValidator(sanitize_address)]


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

    # `min_length=1` runs BEFORE the sanitiser. `sanitize_name` raises on an
    # empty post-clean string, so a name that's only whitespace or control
    # characters still 422s — belt-and-braces.
    name: _SanitisedName = Field(min_length=1, max_length=200)
    date_of_birth: date
    ic_last4: str = Field(pattern=r"^\d{4}$")
    monthly_income_rm: float = Field(ge=0, le=1_000_000)
    employment_type: str = Field(pattern=r"^(gig|salaried)$")
    # Address cap tightened from 500 → 300 to reduce prompt-token footprint.
    # Real MY addresses (unit + street + postcode + state) fit comfortably.
    address: _SanitisedAddress | None = Field(default=None, max_length=300)
    # Monthly electricity cost in RM from the utility bill. Optional. Most
    # users recall the RM paid rather than the kWh consumed; the backend
    # persists whichever (or both) the user provides.
    monthly_cost_rm: float | None = Field(default=None, ge=0, le=100_000)
    # Monthly electricity consumption in kWh from the utility bill. Optional.
    monthly_kwh: int | None = Field(default=None, ge=0, le=10_000)
    dependants: list[DependantInput] = Field(default_factory=list, max_length=15)
