"""Phase 12 Feature 4 — BUDI95 info-only rule.

Pins the eligibility gate, the `subsidy_credit` kind, the `annual_rm=0.0`
contract (so the headline upside total stays honest), and the citation
chain.
"""

from __future__ import annotations

import pytest

from app.rules import budi95
from app.schema.profile import HouseholdFlags, Profile


def _profile(age: int) -> Profile:
    return Profile(
        name="Test",
        age=age,
        monthly_income_rm=2800.0,
        household_size=1,
        dependants=[],
        household_flags=HouseholdFlags(
            has_children_under_18=False,
            has_elderly_dependant=False,
            income_band="b40_household",
        ),
        form_type="form_b",
    )


def test_age_16_qualifies() -> None:
    result = budi95.match(_profile(age=16))
    assert result.qualifies is True
    assert result.scheme_id == "budi95"
    assert result.kind == "subsidy_credit"
    assert result.annual_rm == 0.0


def test_age_15_does_not_qualify() -> None:
    result = budi95.match(_profile(age=15))
    assert result.qualifies is False
    assert result.kind == "subsidy_credit"
    assert result.annual_rm == 0.0


@pytest.mark.parametrize("age", [16, 18, 34, 65, 100])
def test_any_age_at_or_above_min_qualifies(age: int) -> None:
    assert budi95.match(_profile(age=age)).qualifies is True


def test_portal_url_points_to_official_site() -> None:
    result = budi95.match(_profile(age=34))
    assert result.portal_url == "https://www.budi95.gov.my/"


def test_three_citations_present() -> None:
    """Eligibility + monthly cap + program-reach citations all surface."""
    result = budi95.match(_profile(age=34))
    rule_ids = {c.rule_id for c in result.rule_citations}
    assert "budi95.eligibility" in rule_ids
    assert "budi95.monthly_cap" in rule_ids
    assert "budi95.reach_feb_2026" in rule_ids


def test_subsidy_credit_kind_excludes_from_upside_filter() -> None:
    """`compute_upside` filters on `kind == 'upside'` (Phase 11). BUDI95's
    `kind='subsidy_credit'` guarantees it never stacks into the headline
    total. Sanity check: the kind value is exactly the literal string
    `compute_upside` filters on."""
    result = budi95.match(_profile(age=34))
    assert result.kind == "subsidy_credit"
    assert result.kind != "upside"
    # `annual_rm = 0.0` belt-and-braces: even if the filter regresses,
    # BUDI95 contributes 0 to any sum.
    assert result.annual_rm == 0.0


def test_no_expires_at_iso() -> None:
    """BUDI95 is rolling (monthly quota), not calendar-bound — no expiry."""
    result = budi95.match(_profile(age=34))
    assert result.expires_at_iso is None
