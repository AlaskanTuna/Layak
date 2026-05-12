"""Aisyah canned fixture — Grab driver, Kuantan, Form B filer.

Used by:
  - Demo-mode fallback path surfaced by the frontend.
  - Rule-engine unit tests as the baseline profile the engine is known to
    produce eligible matches for.
  - The extract-stub (`app/agents/tools/extract.py`) fallback path.

`AISYAH_SCHEME_MATCHES` is **computed live** by running the rule engine
against `AISYAH_PROFILE` at module load — the fixture and the engine output
can never drift. The three locked rules produce ≥RM7,000/year upside,
clearing the headline sanity target.
"""

from __future__ import annotations

from app.rules import i_saraan, jkm_bkk, jkm_warga_emas, lhdn_form_b, perkeso_sksps, str_2026
from app.schema.profile import Dependant, HouseholdFlags, Profile
from app.schema.scheme import SchemeMatch

AISYAH_PROFILE = Profile(
    name="Aisyah binti Ahmad",
    ic_last6="064321",
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
        jkm_bkk.match(AISYAH_PROFILE),
        lhdn_form_b.match(AISYAH_PROFILE),
        i_saraan.match(AISYAH_PROFILE),
        perkeso_sksps.match(AISYAH_PROFILE),
    ]
    qualifying = [m for m in results if m.qualifies]
    # Sort: upside schemes first (descending by annual_rm), then required-
    # contribution schemes last. Mirrors `match_schemes.match_schemes()`.
    qualifying.sort(key=lambda m: (m.kind != "upside", -m.annual_rm))
    return qualifying


AISYAH_SCHEME_MATCHES: list[SchemeMatch] = _compute_aisyah_matches()
