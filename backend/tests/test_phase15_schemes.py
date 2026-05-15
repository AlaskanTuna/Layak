"""Phase 15 — coverage tests for the 4 new schemes (16 → 20).

Each scheme gets focused tests:
- canonical qualify-fires case (Aisyah baseline or close adjacency)
- canonical out-of-scope case
- kind / annual_rm contract sanity

The four new rules:
    spbt           — universal textbook loan (subsidy_credit), gates on
                     school-age child only
    kwapm          — means-tested cash for primary students (upside),
                     gates on b40_hardcore + age 7–12
    perkeso_sip    — Employment Insurance System (subsidy_credit), gates on
                     form_be salaried filer aged 18–60
                     [Phase 16: replaced the originally-shipped jkm_bp rule
                     after audit found "JKM Bantuan Pelajaran" was not a
                     real federal scheme.]
    taska_permata  — preschool fee subsidy (upside), gates on
                     household_income ≤ RM5,000 + age 0–6
"""

from __future__ import annotations

import pytest

from app.rules import kwapm, perkeso_sip, spbt, taska_permata
from app.schema.profile import Dependant, HouseholdFlags, Profile


def _profile(
    *,
    age: int = 34,
    monthly_income_rm: float = 2800.0,
    household_size: int = 4,
    dependants: list[Dependant] | None = None,
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
            has_children_under_18=True,
            has_elderly_dependant=True,
            income_band=income_band,  # type: ignore[arg-type]
        ),
        form_type=form_type,  # type: ignore[arg-type]
        monthly_cost_rm=monthly_cost_rm,
    )


# -------------------------- SPBT (universal textbook loan) -----------------


def test_spbt_aisyah_baseline_qualifies_universal() -> None:
    """SPBT is universal — every Malaysian government-school child gets it."""
    result = spbt.match(_profile())
    assert result.qualifies is True
    assert result.kind == "subsidy_credit"
    assert result.annual_rm == 0.0


def test_spbt_qualifies_for_m40_household_too() -> None:
    """SPBT income gates were rescinded in 2008 — m40 households qualify."""
    result = spbt.match(_profile(income_band="m40"))
    assert result.qualifies is True


def test_spbt_out_of_scope_without_school_age_child() -> None:
    result = spbt.match(
        _profile(
            dependants=[Dependant(relationship="parent", age=70)],
        )
    )
    assert result.qualifies is False


# -------------------------- KWAPM (means-tested primary aid) ---------------


def test_kwapm_aisyah_baseline_out_of_scope_above_hardcore() -> None:
    """Aisyah is b40_household_with_children — above KWAPM hardcore threshold."""
    result = kwapm.match(_profile())
    assert result.qualifies is False


def test_kwapm_fires_for_b40_hardcore_with_primary_child() -> None:
    result = kwapm.match(
        _profile(
            monthly_income_rm=1100.0,
            income_band="b40_hardcore",
            dependants=[
                Dependant(relationship="child", age=8),
                Dependant(relationship="child", age=10),
            ],
        )
    )
    assert result.qualifies is True
    # Budget 2026 BAmP primary rate: RM100/year × 2 primary children = RM200.
    assert result.annual_rm == 200.0


def test_kwapm_skips_secondary_only_children() -> None:
    """KWAPM is primary-school only — a 14yo doesn't count."""
    result = kwapm.match(
        _profile(
            monthly_income_rm=1100.0,
            income_band="b40_hardcore",
            dependants=[Dependant(relationship="child", age=14)],
        )
    )
    assert result.qualifies is False


# -------------------------- PERKESO SIP (Phase 16 replacement) -------------


def test_perkeso_sip_aisyah_baseline_out_of_scope_form_b() -> None:
    """Aisyah is form_b (Grab driver) — SIP only covers salaried Form BE."""
    result = perkeso_sip.match(_profile())
    assert result.qualifies is False
    assert result.kind == "subsidy_credit"
    assert result.annual_rm == 0.0


def test_perkeso_sip_fires_for_salaried_filer_in_age_window() -> None:
    result = perkeso_sip.match(_profile(form_type="form_be"))
    assert result.qualifies is True
    assert result.kind == "subsidy_credit"
    # SIP is a contingent insurance benefit — annual_rm stays 0.0 because the
    # JSA payout only triggers on involuntary job loss.
    assert result.annual_rm == 0.0


@pytest.mark.parametrize("age", [17, 61])
def test_perkeso_sip_age_window_rejects_outside_18_to_60(age: int) -> None:
    result = perkeso_sip.match(_profile(age=age, form_type="form_be"))
    assert result.qualifies is False


# -------------------------- TASKA Permata (preschool subsidy) --------------


def test_taska_permata_aisyah_baseline_out_of_scope_no_preschool() -> None:
    """Aisyah's children are 8 + 12 — past the preschool window."""
    result = taska_permata.match(_profile())
    assert result.qualifies is False


def test_taska_permata_fires_for_low_income_preschool_household() -> None:
    result = taska_permata.match(
        _profile(
            monthly_income_rm=3000.0,
            income_band="b40_household_with_children",
            dependants=[Dependant(relationship="child", age=4)],
        )
    )
    assert result.qualifies is True
    # RM180/month × 11 months × 1 child = RM1,980.
    assert result.annual_rm == 1980.0


def test_taska_permata_rejects_household_above_5000_cap() -> None:
    result = taska_permata.match(
        _profile(
            monthly_income_rm=8000.0,
            income_band="m40",
            dependants=[Dependant(relationship="child", age=4)],
        )
    )
    assert result.qualifies is False


def test_taska_permata_rejects_school_age_only_children() -> None:
    result = taska_permata.match(
        _profile(
            monthly_income_rm=3000.0,
            dependants=[Dependant(relationship="child", age=8)],
        )
    )
    assert result.qualifies is False


# -------------------------- portal URLs ------------------------------------


@pytest.mark.parametrize(
    "module, expected_domain",
    [
        (spbt, "moe.gov.my"),
        (kwapm, "moe.gov.my"),
        (perkeso_sip, "perkeso.gov.my"),
        (taska_permata, "kpwkm.gov.my"),
    ],
)
def test_portal_url_points_to_official_domain(module, expected_domain: str) -> None:
    result = module.match(_profile())
    assert expected_domain in result.portal_url


# -------------------------- citations are non-empty ------------------------


@pytest.mark.parametrize("module", [spbt, kwapm, perkeso_sip, taska_permata])
def test_each_rule_emits_at_least_two_citations(module) -> None:
    result = module.match(_profile())
    assert len(result.rule_citations) >= 2
    for citation in result.rule_citations:
        assert citation.rule_id
        assert citation.source_pdf
        assert citation.passage
