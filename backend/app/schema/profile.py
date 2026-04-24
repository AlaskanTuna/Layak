"""Pydantic models for the citizen profile extracted from uploaded documents.

Privacy invariant: `ic_last4` is the ONLY representation of the citizen's IC that may
appear in SSE payloads, logs, or draft PDFs. Full IC never leaves request-scope memory.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

FormType = Literal["form_b", "form_be"]
IncomeBand = Literal[
    "b40_hardcore",
    "b40_household",
    "b40_household_with_children",
    "m40",
    "t20",
]
Relationship = Literal["child", "parent", "spouse", "sibling", "other"]


class Dependant(BaseModel):
    # Gemini OCR (extract.py) "helpfully" tags each dependant with their given
    # name when the source document lists one (Farhan's payslip surfaces
    # "Nurul Hidayah / Adam Hakim / Aleesya Sofea"). The rule engine only
    # reads `relationship` + `age` + `ic_last4`, so we silently drop anything
    # else rather than fail the whole extract on an unused field. The prompt
    # still asks Gemini to emit only the listed fields — this is defense in
    # depth against model drift.
    model_config = ConfigDict(extra="ignore")

    relationship: Relationship
    age: int = Field(ge=0, le=130)
    ic_last4: str | None = Field(default=None, pattern=r"^\d{4}$")


class HouseholdFlags(BaseModel):
    model_config = ConfigDict(extra="forbid")

    has_children_under_18: bool
    has_elderly_dependant: bool
    income_band: IncomeBand


class Profile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1)
    ic_last4: str = Field(pattern=r"^\d{4}$")
    age: int = Field(ge=0, le=130)
    monthly_income_rm: float = Field(ge=0)
    household_size: int = Field(ge=1)
    dependants: list[Dependant] = Field(default_factory=list)
    household_flags: HouseholdFlags
    form_type: FormType
    # Freeform address extracted from the IC / utility bill. Optional because
    # some uploads don't carry it legibly; the rule engine doesn't gate on
    # address, but the WeasyPrint packet renders it in the draft forms when set.
    address: str | None = None
    # Monthly electricity cost in RM from the utility bill (TNB). Not
    # currently consumed by any rule — reserved for a future electricity-
    # subsidy match alongside `monthly_kwh`. Users typically recall the RM
    # paid rather than the kWh consumed, so this is the more common input.
    monthly_cost_rm: float | None = Field(default=None, ge=0, le=100_000)
    # Monthly electricity consumption in kWh from the utility bill (TNB). Not
    # currently consumed by any rule — reserved for a future electricity-
    # subsidy match (Bantuan Elektrik Rumah / TNB subsidy tier). Kept on
    # `Profile` so the OCR path and manual path can both populate it without
    # another schema migration when the rule lands.
    monthly_kwh: int | None = Field(default=None, ge=0, le=10_000)


class HouseholdClassification(BaseModel):
    """Output of the classify step."""

    model_config = ConfigDict(extra="forbid")

    has_children_under_18: bool
    has_elderly_dependant: bool
    income_band: IncomeBand
    per_capita_monthly_rm: float = Field(ge=0)
    notes: list[str] = Field(default_factory=list)
