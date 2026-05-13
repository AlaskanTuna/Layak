"""Phase 12 Feature 5 — MyKasih (SARA RM100) info-only rule.

Pins the eligibility gate, the `subsidy_credit` kind, the
`expires_at_iso="2026-12-31"` invariant (the bold expiry line the
frontend renders is load-bearing user-facing info), the `annual_rm=0.0`
contract, and the citation chain.
"""

from __future__ import annotations

import pytest

from app.rules import mykasih
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


def test_age_18_qualifies() -> None:
    result = mykasih.match(_profile(age=18))
    assert result.qualifies is True
    assert result.scheme_id == "mykasih"
    assert result.scheme_name == "MyKasih"
    assert result.kind == "subsidy_credit"
    assert result.annual_rm == 0.0


def test_age_17_does_not_qualify() -> None:
    result = mykasih.match(_profile(age=17))
    assert result.qualifies is False
    assert result.kind == "subsidy_credit"
    assert result.annual_rm == 0.0


@pytest.mark.parametrize("age", [18, 25, 34, 65, 100])
def test_any_age_at_or_above_min_qualifies(age: int) -> None:
    assert mykasih.match(_profile(age=age)).qualifies is True


def test_expires_at_iso_locked_to_31_dec_2026() -> None:
    """The bold expiry line on the card depends on this exact value."""
    qualifying = mykasih.match(_profile(age=34))
    not_qualifying = mykasih.match(_profile(age=10))
    # Both qualifying and non-qualifying carry the expiry — the date is a
    # property of the scheme itself, not of the user's qualification.
    assert qualifying.expires_at_iso == "2026-12-31"
    assert not_qualifying.expires_at_iso == "2026-12-31"


def test_portal_url_points_to_official_check_status() -> None:
    result = mykasih.match(_profile(age=34))
    assert result.portal_url == "https://checkstatus.mykasih.net/"


def test_display_name_is_brand_mykasih_not_sara() -> None:
    """Public-facing label uses the more-Googled 'MyKasih' brand. Citations
    preserve the official program name."""
    result = mykasih.match(_profile(age=34))
    assert result.scheme_name == "MyKasih"
    # The official program name surfaces inside citation passages, not the
    # user-facing scheme_name.
    citation_text = " ".join(c.passage for c in result.rule_citations)
    assert "SARA" in citation_text


def test_four_citations_present() -> None:
    """Eligibility + merchant network + expiry + one-off-nature citations."""
    result = mykasih.match(_profile(age=34))
    rule_ids = {c.rule_id for c in result.rule_citations}
    assert "mykasih.eligibility" in rule_ids
    assert "mykasih.merchant_network" in rule_ids
    assert "mykasih.expiry_31_dec_2026" in rule_ids
    assert "mykasih.one_off_2026" in rule_ids


def test_subsidy_credit_kind_excludes_from_upside_filter() -> None:
    """`compute_upside` filters on `kind == 'upside'` (Phase 11). MyKasih's
    `kind='subsidy_credit'` guarantees it never stacks into the headline
    total."""
    result = mykasih.match(_profile(age=34))
    assert result.kind == "subsidy_credit"
    assert result.kind != "upside"
    assert result.annual_rm == 0.0


def test_summary_mentions_credit_amount() -> None:
    """The qualifying summary should mention the RM100 figure so the user
    knows what they got."""
    result = mykasih.match(_profile(age=34))
    assert "100" in result.summary
