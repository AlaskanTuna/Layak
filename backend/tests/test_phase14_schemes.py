"""Phase 14 — coverage tests for the 7 new schemes.

Each scheme gets a small set of focused tests:
- one canonical qualify-fires case
- one canonical out-of-scope case
- kind / annual_rm contract sanity

The conftest `aisyah` fixture is the Phase 11 baseline persona:
    34, Form B (Grab driver), RM2,800 applicant income, 2 children (8, 12),
    1 elderly parent (70), b40_household_with_children band.
"""

from __future__ import annotations

import pytest

from app.rules import (
    bantuan_elektrik,
    bap,
    i_suri,
    mysalam,
    peka_b40,
    rmt,
    sara,
)
from app.schema.profile import Dependant, HouseholdFlags, Profile


def _profile(
    *,
    age: int = 34,
    monthly_income_rm: float = 2800.0,
    household_size: int = 4,
    dependants: list[Dependant] | None = None,
    has_children_under_18: bool = True,
    has_elderly_dependant: bool = True,
    income_band: str = "b40_household_with_children",
    form_type: str = "form_b",
    monthly_cost_rm: float | None = 95.0,
) -> Profile:
    return Profile(
        name="Test Citizen",
        age=age,
        monthly_income_rm=monthly_income_rm,
        household_size=household_size,
        dependants=dependants
        if dependants is not None
        else [
            Dependant(relationship="child", age=8),
            Dependant(relationship="child", age=12),
            Dependant(relationship="parent", age=70),
        ],
        household_flags=HouseholdFlags(
            has_children_under_18=has_children_under_18,
            has_elderly_dependant=has_elderly_dependant,
            income_band=income_band,  # type: ignore[arg-type]
        ),
        form_type=form_type,  # type: ignore[arg-type]
        monthly_cost_rm=monthly_cost_rm,
    )


# -------------------------- PeKa B40 ---------------------------------------


def test_peka_b40_aisyah_baseline_does_not_qualify_age_below_40() -> None:
    """Aisyah is 34; PeKa B40 needs age ≥ 40."""
    result = peka_b40.match(_profile(age=34))
    assert result.qualifies is False
    assert result.kind == "subsidy_credit"
    assert result.annual_rm == 0.0
    assert "below" in result.why_qualify.lower() or "PeKa" in result.summary


def test_peka_b40_qualifies_when_b40_and_aged_40_plus() -> None:
    result = peka_b40.match(_profile(age=45))
    assert result.qualifies is True
    assert result.kind == "subsidy_credit"
    assert result.scheme_id == "peka_b40"


def test_peka_b40_rejects_m40_band() -> None:
    result = peka_b40.match(_profile(age=50, income_band="m40"))
    assert result.qualifies is False


# -------------------------- BAP --------------------------------------------


def test_bap_aisyah_baseline_qualifies_for_two_children() -> None:
    """Aisyah has 2 school-age children; BAP pays RM150 × 2 = RM300."""
    result = bap.match(_profile())
    assert result.qualifies is True
    assert result.annual_rm == 300.0
    assert result.kind == "upside"


def test_bap_universal_no_income_gate_in_2026() -> None:
    """BAP is universal in 2026 — m40 households with school children also qualify."""
    result = bap.match(_profile(income_band="m40"))
    assert result.qualifies is True
    assert result.annual_rm == 300.0


def test_bap_does_not_fire_without_school_age_child() -> None:
    result = bap.match(
        _profile(
            dependants=[Dependant(relationship="parent", age=70)],
            has_children_under_18=False,
        )
    )
    assert result.qualifies is False
    assert result.annual_rm == 0.0


# -------------------------- Bantuan Elektrik -------------------------------


def test_bantuan_elektrik_does_not_fire_for_aisyah_b40_household_with_children() -> None:
    """The rebate is eKasih Miskin Tegar only — proxy is b40_hardcore band."""
    result = bantuan_elektrik.match(_profile())
    assert result.qualifies is False
    assert result.kind == "upside"
    assert result.annual_rm == 0.0


def test_bantuan_elektrik_fires_for_b40_hardcore_with_bill() -> None:
    result = bantuan_elektrik.match(
        _profile(
            monthly_income_rm=1100.0,
            income_band="b40_hardcore",
            monthly_cost_rm=95.0,
        )
    )
    assert result.qualifies is True
    # Cap at RM40/month → annualised RM480.
    assert result.annual_rm == 480.0


def test_bantuan_elektrik_caps_rebate_at_bill_when_bill_is_small() -> None:
    """If the bill is RM25/month, the rebate cannot exceed RM25 — annualised RM300."""
    result = bantuan_elektrik.match(
        _profile(
            monthly_income_rm=900.0,
            income_band="b40_hardcore",
            monthly_cost_rm=25.0,
        )
    )
    assert result.qualifies is True
    assert result.annual_rm == 300.0


def test_bantuan_elektrik_no_bill_falls_to_out_of_scope() -> None:
    result = bantuan_elektrik.match(
        _profile(
            monthly_income_rm=1100.0,
            income_band="b40_hardcore",
            monthly_cost_rm=None,
        )
    )
    assert result.qualifies is False


# -------------------------- KWSP i-Suri ------------------------------------


def test_i_suri_does_not_fire_for_aisyah_no_spouse_in_household() -> None:
    result = i_suri.match(_profile())
    assert result.qualifies is False
    assert result.annual_rm == 0.0


def test_i_suri_fires_when_zero_income_spouse_exists() -> None:
    result = i_suri.match(
        _profile(
            age=40,
            dependants=[
                Dependant(relationship="spouse", age=35, monthly_income_rm=0.0),
                Dependant(relationship="child", age=8),
            ],
        )
    )
    assert result.qualifies is True
    assert result.annual_rm == 300.0
    assert result.kind == "upside"


def test_i_suri_skips_spouse_with_income() -> None:
    """A spouse earning income is not in the housewife cohort."""
    result = i_suri.match(
        _profile(
            dependants=[
                Dependant(relationship="spouse", age=35, monthly_income_rm=2500.0),
            ],
        )
    )
    assert result.qualifies is False


# -------------------------- MySalam ----------------------------------------


def test_mysalam_aisyah_baseline_qualifies_borderline_b40() -> None:
    """Aisyah is 34, b40_household_with_children — we widen the gate
    to {b40_hardcore, b40_household} for the demo. Aisyah's tier
    `b40_household_with_children` therefore does NOT qualify under our
    proxy (RM3,000 > RM2,000 strict household cap). The card stays
    out-of-scope but visible. This test pins that decision."""
    result = mysalam.match(_profile())
    assert result.qualifies is False
    assert result.kind == "subsidy_credit"


def test_mysalam_fires_for_b40_household_within_age_window() -> None:
    result = mysalam.match(
        _profile(
            age=34,
            monthly_income_rm=1800.0,
            income_band="b40_household",
        )
    )
    assert result.qualifies is True
    assert result.kind == "subsidy_credit"


@pytest.mark.parametrize("age", [17, 66])
def test_mysalam_age_window_rejects_outside_18_to_65(age: int) -> None:
    result = mysalam.match(
        _profile(
            age=age,
            monthly_income_rm=1800.0,
            income_band="b40_household",
        )
    )
    assert result.qualifies is False


# -------------------------- SARA -------------------------------------------


def test_sara_aisyah_baseline_qualifies_standard_tier() -> None:
    """Aisyah is b40_household_with_children → standard SARA tier RM100/mo.
    (Phase 18: both b40_household and b40_household_with_children map to the
    RM100 standard tier; the RM50 bujang tier is reserved for single STR
    recipients and isn't surfaced through Layak's intake bands today.)"""
    result = sara.match(_profile())
    assert result.qualifies is True
    assert result.kind == "subsidy_credit"
    assert result.annual_rm == 0.0
    assert result.scheme_id == "sara"
    assert "100" in result.why_qualify


def test_sara_enhanced_rate_for_b40_hardcore() -> None:
    """b40_hardcore households unlock the RM200/month enhanced tier."""
    result = sara.match(_profile(income_band="b40_hardcore"))
    assert result.qualifies is True
    # The enhanced rate appears in the why_qualify copy.
    assert "200" in result.why_qualify


def test_sara_rejects_m40() -> None:
    result = sara.match(_profile(income_band="m40"))
    assert result.qualifies is False


# -------------------------- RMT --------------------------------------------


def test_rmt_aisyah_baseline_qualifies_for_primary_school_children() -> None:
    """Aisyah's 8-year-old + 12-year-old are both primary-school age (6–12)."""
    result = rmt.match(_profile())
    assert result.qualifies is True
    assert result.kind == "subsidy_credit"
    assert result.annual_rm == 0.0


def test_rmt_skips_children_outside_primary_age() -> None:
    """Secondary-school child (14) alone doesn't qualify for RMT."""
    result = rmt.match(
        _profile(
            dependants=[Dependant(relationship="child", age=14)],
        )
    )
    assert result.qualifies is False


def test_rmt_rejects_m40_household() -> None:
    result = rmt.match(_profile(income_band="m40"))
    assert result.qualifies is False


# -------------------------- portal URLs are official gov sources -----------


@pytest.mark.parametrize(
    "module, expected_domain",
    [
        (peka_b40, "protecthealth.com.my"),
        (bap, "moe.gov.my"),
        (bantuan_elektrik, "tnb.com.my"),
        (i_suri, "kwsp.gov.my"),
        (mysalam, "mysalam.com.my"),
        (sara, "sara.gov.my"),
        (rmt, "moe.gov.my"),
    ],
)
def test_portal_url_points_to_official_domain(module, expected_domain: str) -> None:
    result = module.match(_profile())
    assert expected_domain in result.portal_url


# -------------------------- citations are non-empty ------------------------


@pytest.mark.parametrize(
    "module",
    [peka_b40, bap, bantuan_elektrik, i_suri, mysalam, sara, rmt],
)
def test_each_rule_emits_at_least_two_citations(module) -> None:
    result = module.match(_profile())
    assert len(result.rule_citations) >= 2
    for citation in result.rule_citations:
        assert citation.rule_id
        assert citation.source_pdf
        assert citation.passage
