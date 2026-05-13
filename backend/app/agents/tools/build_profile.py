"""Manual-entry Profile builder.

Bypasses the Gemini OCR `extract` step: takes a validated `ManualEntryPayload`
and returns a `Profile` ready for the classify → match → compute_upside →
generate chain. The income-band heuristic below is a pure-Python twin of the
prompt in `backend/app/agents/tools/extract.py:42-47`; if that prompt changes,
this function must change in the same direction or the manual and upload paths
will produce drifting `Profile.household_flags.income_band` values for the
same inputs.
"""

from __future__ import annotations

from datetime import date

from app.schema.manual_entry import ManualEntryPayload
from app.schema.profile import Dependant, HouseholdFlags, IncomeBand, Profile


def _classify_income_band(monthly_income_rm: float, has_children_under_18: bool) -> IncomeBand:
    """Twin of the extract prompt bands (extract.py:42-47).

    | band                          | monthly RM      | extra condition              |
    | b40_hardcore                  | < 1,500         | —                            |
    | b40_household                 | 1,500 – 2,500   | —                            |
    | b40_household_with_children   | 2,501 – 5,000   | has_children_under_18=True   |
    | b40_household (fallback)      | 2,501 – 5,000   | no children under 18         |
    | m40                           | 5,001 – 10,000  | —                            |
    | t20                           | > 10,000        | —                            |
    """
    if monthly_income_rm < 1500:
        return "b40_hardcore"
    if monthly_income_rm <= 2500:
        return "b40_household"
    if monthly_income_rm <= 5000:
        return "b40_household_with_children" if has_children_under_18 else "b40_household"
    if monthly_income_rm <= 10000:
        return "m40"
    return "t20"


def derive_household_flags(
    monthly_income_rm: float,
    dependants: list[Dependant],
) -> HouseholdFlags:
    """Pure-Python reimplementation of the extract prompt's household_flags logic."""
    has_children_under_18 = any(d.relationship == "child" and d.age < 18 for d in dependants)
    has_elderly_dependant = any(d.relationship == "parent" and d.age >= 60 for d in dependants)
    return HouseholdFlags(
        has_children_under_18=has_children_under_18,
        has_elderly_dependant=has_elderly_dependant,
        income_band=_classify_income_band(monthly_income_rm, has_children_under_18),
    )


def _age_from_dob(dob: date, today: date | None = None) -> int:
    """Whole years between DOB and today, clamped at 0.

    `today` is injectable for deterministic tests; production callers pass
    `date.today()` implicitly. The MYT timezone assumption is documented in
    the design spec §3.4 — at the single-day granularity of age-in-years,
    the MYT/UTC skew is irrelevant until someone is born or has a birthday
    at exactly midnight MYT, which the rule engine never gates on.
    """
    ref = today if today is not None else date.today()
    years = ref.year - dob.year - ((ref.month, ref.day) < (dob.month, dob.day))
    return max(years, 0)


def build_profile_from_manual_entry(
    payload: ManualEntryPayload,
    *,
    today: date | None = None,
) -> Profile:
    """Deterministic ManualEntryPayload → Profile mapper (no Gemini call)."""
    dependants = [Dependant(**d.model_dump()) for d in payload.dependants]
    adult_household_income_rm = sum(d.monthly_income_rm or 0.0 for d in dependants if d.age >= 18)
    household_monthly_income_rm = payload.monthly_income_rm + adult_household_income_rm
    return Profile(
        # Preserve user casing; AISYAH_PROFILE stores the name in mixed case, and
        # changing the fixture would ripple through the demo UI. Extract still
        # uppercases per its prompt, so the two paths produce names of identical
        # identity-semantics but different presentation — acceptable for v1.
        name=payload.name.strip(),
        ic_last4=payload.ic_last4,
        age=_age_from_dob(payload.date_of_birth, today=today),
        monthly_income_rm=household_monthly_income_rm,
        applicant_monthly_income_rm=payload.monthly_income_rm,
        household_monthly_income_rm=household_monthly_income_rm,
        household_size=1 + len(dependants),
        dependants=dependants,
        household_flags=derive_household_flags(household_monthly_income_rm, dependants),
        form_type="form_b" if payload.employment_type == "gig" else "form_be",
        address=payload.address,
        monthly_cost_rm=payload.monthly_cost_rm,
        monthly_kwh=payload.monthly_kwh,
    )
