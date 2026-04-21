"""Aisyah canned fixture — Grab driver, Kuantan, Form B filer (docs/prd.md §3.1).

Used by:
  - Demo-mode fallback path (FR-10) surfaced by the frontend.
  - Rule-engine unit tests (docs/plan.md Phase 1 Task 4) as the baseline profile
    the engine is known to produce eligible matches for.
  - The Task 1 extract-stub (`app/agents/tools/extract.py`) while real Gemini
    wiring is deferred to Phase 1 Task 3.

`AISYAH_SCHEME_MATCHES` is **computed live** by running the Task 4 rule engine
against `AISYAH_PROFILE` at module load — the fixture and the engine output can
never drift. The three locked rules produce ≥RM7,000/year upside, clearing the
docs/plan.md Task 4 headline sanity target.
"""

from __future__ import annotations

from app.rules import jkm_warga_emas, lhdn_form_b, str_2026
from app.schema.profile import Dependant, HouseholdFlags, Profile
from app.schema.scheme import SchemeMatch

AISYAH_PROFILE = Profile(
    name="Aisyah binti Ahmad",
    ic_last4="4321",
    age=34,
    monthly_income_rm=2800.0,
    household_size=4,
    dependants=[
        Dependant(relationship="child", age=10),
        Dependant(relationship="child", age=7),
        Dependant(relationship="parent", age=70),
    ],
    household_flags=HouseholdFlags(
        has_children_under_18=True,
        has_elderly_dependant=True,
        income_band="b40_household_with_children",
    ),
    form_type="form_b",
    address="No. 42, Jalan IM 7/10, Bandar Indera Mahkota, 25200 Kuantan, Pahang",
)


def _compute_aisyah_matches() -> list[SchemeMatch]:
    results = [
        str_2026.match(AISYAH_PROFILE),
        jkm_warga_emas.match(AISYAH_PROFILE),
        lhdn_form_b.match(AISYAH_PROFILE),
    ]
    qualifying = [m for m in results if m.qualifies]
    qualifying.sort(key=lambda m: m.annual_rm, reverse=True)
    return qualifying


AISYAH_SCHEME_MATCHES: list[SchemeMatch] = _compute_aisyah_matches()
