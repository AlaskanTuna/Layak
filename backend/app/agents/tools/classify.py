"""`classify_household` FunctionTool — stub for Phase 1 Task 3.

Task 3 (sprint start 21 Apr 08:00 MYT) replaces this with a Gemini 2.5 Flash
structured-output call. Until then the stub derives household classification
flags directly from the `Profile` produced by the extract step.

Output conforms to `HouseholdClassification` (see `app/schema/profile.py`).
"""

from __future__ import annotations

from app.schema.profile import HouseholdClassification, Profile


async def classify_household(profile: Profile) -> HouseholdClassification:
    """Classify a profile's household composition, age flags, and income band.

    Args:
        profile: Validated citizen profile from the extract step.

    Returns:
        `HouseholdClassification` with per-capita income and human-readable notes
        the frontend pipeline stepper can surface in the `classify` step result.
    """
    per_capita = profile.monthly_income_rm / max(profile.household_size, 1)
    children_under_18 = sum(1 for d in profile.dependants if d.relationship == "child" and d.age < 18)
    elderly_dependants = sum(1 for d in profile.dependants if d.relationship == "parent" and d.age >= 60)

    notes = [
        f"Household size: {profile.household_size}.",
        f"Per-capita monthly income: RM{per_capita:,.0f}.",
        f"Filer category: {profile.form_type.replace('_', ' ').upper()}.",
    ]
    if children_under_18:
        notes.append(f"{children_under_18} child(ren) under 18 in household.")
    if elderly_dependants:
        notes.append(f"{elderly_dependants} parent dependant(s) aged 60+.")

    return HouseholdClassification(
        has_children_under_18=profile.household_flags.has_children_under_18,
        has_elderly_dependant=profile.household_flags.has_elderly_dependant,
        income_band=profile.household_flags.income_band,
        per_capita_monthly_rm=per_capita,
        notes=notes,
    )
