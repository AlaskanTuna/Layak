"""Coverage guard for `app.rules._i18n` (Phase 9).

Asserts every SchemeId × SupportedLanguage × variant combination has a catalog
entry. Without this test, shipping a new rule without translations would
only explode at runtime on the first non-English evaluation touching that rule.
"""

from __future__ import annotations

from typing import get_args

import pytest

from app.rules._i18n import _CATALOG, scheme_copy
from app.schema.locale import SupportedLanguage
from app.schema.scheme import SchemeId

ALL_SCHEME_IDS: tuple[str, ...] = get_args(SchemeId)
ALL_LANGUAGES: tuple[str, ...] = get_args(SupportedLanguage)
ALL_VARIANTS: tuple[str, ...] = ("qualify", "out_of_scope")


def test_catalog_has_entry_for_every_scheme() -> None:
    missing = set(ALL_SCHEME_IDS) - set(_CATALOG.keys())
    assert not missing, f"Catalog missing entries for schemes: {missing}"


@pytest.mark.parametrize("scheme_id", ALL_SCHEME_IDS)
@pytest.mark.parametrize("variant", ALL_VARIANTS)
def test_catalog_has_every_variant_per_scheme(scheme_id: str, variant: str) -> None:
    assert variant in _CATALOG[scheme_id], (
        f"Scheme {scheme_id!r} is missing variant {variant!r}"
    )


# Canonical `vars` payloads used to invoke the catalog for each scheme.
# Values are realistic so the format strings don't trip on type mismatches.
_QUALIFY_VARS: dict[str, dict[str, object]] = {
    "str_2026": {
        "band": "2501_5000",
        "bucket": "3_4",
        "annual_rm": 700.0,
        "children": 3,
        "income": 2800.0,
    },
    "jkm_warga_emas": {
        "per_capita": 700.0,
        "food_pli_rm": 1236.0,
        "eldest_age": 70,
        "monthly_rm": 600.0,
        "fallback_monthly_rm": 500.0,
        "monthly_income_rm": 2800.0,
        "household_size": 4,
    },
    "jkm_bkk": {
        "per_capita": 700.0,
        "threshold_rm": 1000.0,
        "breakdown": "2 × RM200 (age 7–17)",
        "cap_note": "",
        "capped_monthly": 400.0,
        "annual_rm": 4800.0,
        "monthly_income_rm": 2800.0,
        "household_size": 4,
    },
    "lhdn_form_b": {
        "form_label": "Form B",
        "filer_category": "self-employed",
        "annual_income": 33600.0,
        "total_relief": 22500.0,
        "saving": 558.0,
        "applied": "individual (RM9,000), parent_medical (RM8,000)",
        "deadline": "30 June 2026",
    },
    "lhdn_form_be": {
        "form_label": "Form BE",
        "filer_category": "salaried",
        "annual_income": 50166.0,
        "total_relief": 22500.0,
        "saving": 1200.0,
        "applied": "individual (RM9,000)",
        "deadline": "30 April 2026",
    },
    "i_saraan": {
        "age": 34,
        "match_rate_pct": 20.0,
        "annual_match_cap_rm": 500.0,
        "min_age": 18,
        "max_age": 60,
        "annual_contribution_to_max_match_rm": 2500.0,
    },
    "perkeso_sksps": {
        "plan_label": "Plan 2",
        "monthly_rm": 24.90,
        "annual_rm": 298.80,
        "ceiling_note": "(income ≤ RM1,550)",
        "age": 34,
        "monthly_income_rm": 1400.0,
        "portal_url": "https://www.perkeso.gov.my",
    },
    "budi95": {
        "age": 34,
        "subsidised_price_rm": 1.99,
        "monthly_quota_l": 200,
    },
    "mykasih": {
        "age": 34,
        "credit_amount_rm": 100.0,
    },
    "peka_b40": {
        "age": 45,
        "band": "b40_household_with_children",
    },
    "bap": {
        "child_count": 2,
        "per_child_rm": 150.0,
        "annual_rm": 300.0,
    },
    "bantuan_elektrik": {
        "monthly_rebate": 40.0,
        "monthly_cost": 95.0,
        "annual_rm": 480.0,
        "rebate_cap": 40.0,
    },
    "i_suri": {
        "spouse_age": 30,
        "annual_incentive_rm": 300.0,
        "lifetime_cap_rm": 3000.0,
        "max_age": 60,
    },
    "mysalam": {
        "age": 34,
        "lump_sum_rm": 8000.0,
        "hospital_daily_rm": 50.0,
        "hospital_max_days": 14,
        "band": "b40_household",
    },
    "sara": {
        "band": "b40_household_with_children",
        "monthly_rm": 100.0,
        "enhanced": False,
        "annual_rm": 1200.0,
    },
    "rmt": {
        "child_count": 2,
        "band": "b40_household_with_children",
    },
    "spbt": {
        "child_count": 2,
        "per_child_value_rm": 250.0,
        "annual_value_rm": 500.0,
    },
    "kwapm": {
        "child_count": 2,
        "per_child_rm": 100.0,
        "annual_rm": 200.0,
        "band": "b40_hardcore",
    },
    "perkeso_sip": {
        "age": 34,
        "first_month_pct": 80,
        "max_monthly_rm": 4800.0,
        "wage_ceiling_rm": 6000.0,
    },
    "taska_permata": {
        "child_count": 1,
        "monthly_subsidy_rm": 180.0,
        "annual_rm": 1980.0,
        "household_income": 3000.0,
    },
}

_OUT_OF_SCOPE_VARS: dict[str, dict[str, object]] = {
    "str_2026": {"reasons": ["no child under 18 in household"]},
    "jkm_warga_emas": {"reasons": ["no parent dependant aged ≥60 in household"]},
    "jkm_bkk": {"reasons": ["no child dependant aged <18 in household"]},
    # lhdn_form_b / _be take total_relief + annual_income (the "zero saving" branch).
    "lhdn_form_b": {"total_relief": 22500.0, "annual_income": 10000.0},
    "lhdn_form_be": {"total_relief": 22500.0, "annual_income": 10000.0},
    "i_saraan": {"reasons": ["age 70 outside the i-Saraan window (18-60)"]},
    "perkeso_sksps": {"reasons": ["applicant age 70 outside the Akta 789 window"]},
    "budi95": {"reasons": ["age 14 below the BUDI95 minimum of 16"]},
    "mykasih": {"reasons": ["age 16 below the MyKasih SARA minimum of 18"]},
    "peka_b40": {"reasons": ["age 34 below the PeKa B40 minimum of 40"]},
    "bap": {"reasons": ["no child dependant aged 6–18 in household"]},
    "bantuan_elektrik": {"reasons": ["household income band 'm40' is above eKasih Miskin Tegar"]},
    "i_suri": {"reasons": ["no spouse aged 18–60 with zero declared income"]},
    "mysalam": {"reasons": ["age 70 outside the MySalam window (18–65)"]},
    "sara": {"reasons": ["household income band 'm40' is above the B40 ceiling"]},
    "rmt": {"reasons": ["no primary-school-age child (6–12) in household"]},
    "spbt": {"reasons": ["no school-age child (7–17) in household"]},
    "kwapm": {"reasons": ["household income band 'm40' above b40_hardcore — KWAPM is needs-tested"]},
    "perkeso_sip": {"reasons": ["SIP coverage only applies to salaried (Form BE) filers with employer EIS contributions"]},
    "taska_permata": {"reasons": ["household income RM8,000 exceeds Permata cap RM5,000"]},
}


@pytest.mark.parametrize("scheme_id", ALL_SCHEME_IDS)
@pytest.mark.parametrize("language", ALL_LANGUAGES)
def test_qualify_copy_renders_non_empty(scheme_id: str, language: str) -> None:
    copy = scheme_copy(scheme_id, "qualify", language, **_QUALIFY_VARS[scheme_id])  # type: ignore[arg-type]
    assert copy["summary"], f"empty summary for {scheme_id}/{language}"
    assert copy["why_qualify"], f"empty why_qualify for {scheme_id}/{language}"


@pytest.mark.parametrize("scheme_id", ALL_SCHEME_IDS)
@pytest.mark.parametrize("language", ALL_LANGUAGES)
def test_out_of_scope_copy_renders_non_empty(scheme_id: str, language: str) -> None:
    copy = scheme_copy(scheme_id, "out_of_scope", language, **_OUT_OF_SCOPE_VARS[scheme_id])  # type: ignore[arg-type]
    assert copy["summary"], f"empty out_of_scope summary for {scheme_id}/{language}"
    assert copy["why_qualify"], f"empty out_of_scope why_qualify for {scheme_id}/{language}"


# ---------------------------------------------------------------------------
# Language-signature spot checks — catch accidental English leaking into the
# ms/zh branches (a common regression when copy-pasting from the en block).
# ---------------------------------------------------------------------------


_MS_TOKENS = ("isi rumah", "anda", "pendapatan", "bulan", "tidak", "daftar", "umur")
_ZH_TOKENS = ("家庭", "收入", "申请", "月", "税", "符合", "请", "您")


@pytest.mark.parametrize("scheme_id", ALL_SCHEME_IDS)
def test_ms_copy_contains_bahasa_token(scheme_id: str) -> None:
    copy = scheme_copy(scheme_id, "qualify", "ms", **_QUALIFY_VARS[scheme_id])  # type: ignore[arg-type]
    combined = (copy["summary"] + " " + copy["why_qualify"]).lower()
    assert any(tok in combined for tok in _MS_TOKENS), (
        f"{scheme_id}/ms qualify copy has no BM signature token"
    )


@pytest.mark.parametrize("scheme_id", ALL_SCHEME_IDS)
def test_zh_copy_contains_chinese_character(scheme_id: str) -> None:
    copy = scheme_copy(scheme_id, "qualify", "zh", **_QUALIFY_VARS[scheme_id])  # type: ignore[arg-type]
    combined = copy["summary"] + " " + copy["why_qualify"]
    assert any(tok in combined for tok in _ZH_TOKENS), (
        f"{scheme_id}/zh qualify copy has no Chinese-character signature"
    )
