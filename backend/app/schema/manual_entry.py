"""Pydantic models for the manual-entry intake path.

A privacy-cautious user can type the fields the OCR `extract` step would
otherwise derive from their MyKad / payslip / utility-bill uploads. The
pipeline reuses the same `Profile` downstream; only the intake payload
shape is new.

Sanitisation contract: see `app/schema/sanitize.py` — `name` and `address`
are run through `sanitize_free_text` before reaching any Gemini prompt or
WeasyPrint template.

IC contract (Phase 12): the manual-entry path **does not collect any IC
information**. The form asks for `age` directly (integer years) and the
built `Profile` carries `ic_last6=None`. None of the existing rules read
`ic_last6` for eligibility — they gate on `age`, `monthly_income_rm`, and
`household_flags`. The IC was only retained on `Profile` for chat-
personalisation ("IC ends in 064321") and the masked IC line in PDF
packets; both render with a "manual entry; IC not collected" placeholder
on this path. The upload path is unchanged — Gemini OCR still extracts
`ic_last6` from the MyKad image because that's the user's affirmative
choice to share an IC photo.
"""

from __future__ import annotations

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


class ManualEntryPayload(BaseModel):
    """The JSON body accepted by `POST /api/agent/intake_manual`.

    The payload deliberately omits fields that are either derived
    (`household_size = 1 + len(dependants)`, `household_flags`) or out of
    scope for manual entry (`form_type` is mapped from the two-value
    `employment_type` on the wire).

    No IC information is collected on this path — `age` is supplied
    directly as an integer. See module docstring for the rationale.
    """

    model_config = ConfigDict(extra="forbid")

    # `min_length=1` runs BEFORE the sanitiser. `sanitize_name` raises on an
    # empty post-clean string, so a name that's only whitespace or control
    # characters still 422s — belt-and-braces.
    name: _SanitisedName = Field(min_length=1, max_length=200)
    # Age in whole years. Phase 12 swap: previously the manual path took a
    # full 12-digit IC and derived `age` server-side from the YYMMDD prefix.
    # Since no rule reads `ic_last6` for eligibility, we drop the IC entirely
    # and take `age` directly — strictly tighter PDPA posture.
    age: int = Field(ge=0, le=130)
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
