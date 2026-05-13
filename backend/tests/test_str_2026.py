"""STR 2026 rule engine tests.

Each test ties a module-level constant or match() branch to a specific
line/number on `risalah-str-2026.pdf` p.2 (the "Nilai Bantuan STR & SARA 2026"
tier table and the "SYARAT KELAYAKAN" eligibility section).
"""

from __future__ import annotations

from app.rules import str_2026
from app.schema.profile import Dependant, HouseholdFlags, Profile


def test_income_band_ceilings_present_on_pdf_p2(pdf_text: dict[str, dict[int, str]]) -> None:
    """Band ceilings RM2,500 and RM5,000 both appear on risalah p.2."""
    page = pdf_text["risalah-str-2026.pdf"][2]
    assert f"RM{int(str_2026.BAND_1_CEILING_RM):,}" in page
    assert f"RM{int(str_2026.BAND_2_CEILING_RM):,}" in page


def test_every_household_tier_amount_present_on_pdf_p2(pdf_text: dict[str, dict[int, str]]) -> None:
    """Every RM value in STR_HOUSEHOLD_ANNUAL_RM appears verbatim on risalah p.2."""
    page = pdf_text["risalah-str-2026.pdf"][2]
    for band_key, bucket_map in str_2026.STR_HOUSEHOLD_ANNUAL_RM.items():
        for bucket_key, amount in bucket_map.items():
            expected = f"RM{int(amount):,}"
            assert expected in page, f"STR {band_key}/{bucket_key} amount {expected} not found on risalah p.2"


def test_risalah_p2_names_tier_table_and_household_category(pdf_text: dict[str, dict[int, str]]) -> None:
    """Risalah p.2 contains the section titles this rule is grounded in."""
    page = pdf_text["risalah-str-2026.pdf"][2]
    assert "Nilai Bantuan STR" in page
    assert "Isi Rumah" in page


def test_aisyah_lands_in_band_2_bucket_1_2(aisyah: Profile) -> None:
    """Aisyah (RM2,800/mo, 2 children under 18) → band 2, bucket 1-2, RM450/year."""
    result = str_2026.match(aisyah)
    assert result.qualifies is True
    assert result.scheme_id == "str_2026"
    assert result.annual_rm == str_2026.STR_HOUSEHOLD_ANNUAL_RM["2501_5000"]["1_2"]
    assert result.annual_rm == 450.0


def test_aisyah_match_has_citations_to_risalah_and_bk01(aisyah: Profile) -> None:
    """Aisyah's match cites both the tier-table risalah and the BK-01 form."""
    result = str_2026.match(aisyah)
    pdfs = {c.source_pdf for c in result.rule_citations}
    assert "risalah-str-2026.pdf" in pdfs
    assert "bk-01.pdf" in pdfs


def _profile(monthly_income: float, children_ages: tuple[int, ...]) -> Profile:
    dependants = [Dependant(relationship="child", age=a) for a in children_ages]
    has_children = any(a < 18 for a in children_ages)
    return Profile(
        name="Test",
        age=35,
        monthly_income_rm=monthly_income,
        household_size=1 + len(dependants),
        dependants=dependants,
        household_flags=HouseholdFlags(
            has_children_under_18=has_children,
            has_elderly_dependant=False,
            income_band="b40_household_with_children" if has_children else "b40_household",
        ),
        form_type="form_b",
    )


def test_band_1_bucket_5_plus_returns_2200() -> None:
    """Low-income household with 5 children → RM2,200/year."""
    result = str_2026.match(_profile(2000, (10, 9, 8, 7, 6)))
    assert result.qualifies is True
    assert result.annual_rm == 2200.0


def test_band_2_bucket_3_4_returns_700() -> None:
    """Mid-band household with 3 children → RM700/year."""
    result = str_2026.match(_profile(3500, (14, 12, 9)))
    assert result.qualifies is True
    assert result.annual_rm == 700.0


def test_income_above_5000_does_not_qualify() -> None:
    """Household income above RM5,000 ceiling → not eligible."""
    result = str_2026.match(_profile(6000, (10, 8)))
    assert result.qualifies is False
    assert result.annual_rm == 0.0


def test_income_exactly_5000_is_inclusive() -> None:
    """The RM5,000 band ceiling is inclusive (≤), per risalah p.2 'RM2,501-RM5,000'."""
    result = str_2026.match(_profile(5000, (10, 8)))
    assert result.qualifies is True
    assert result.annual_rm == str_2026.STR_HOUSEHOLD_ANNUAL_RM["2501_5000"]["1_2"]


def test_income_exactly_2500_is_band_1() -> None:
    """Income RM2,500 exactly lands in band 1 (≤RM2,500), not band 2."""
    result = str_2026.match(_profile(2500, (10, 8)))
    assert result.qualifies is True
    assert result.annual_rm == str_2026.STR_HOUSEHOLD_ANNUAL_RM["le_2500"]["1_2"]


def test_no_children_under_18_does_not_qualify() -> None:
    """With-children tier excludes couples with no children under 18."""
    result = str_2026.match(_profile(2000, ()))
    assert result.qualifies is False
    assert result.annual_rm == 0.0


def test_adult_child_does_not_count_as_under_18() -> None:
    """A 19-year-old dependant does not trigger the with-children tier."""
    result = str_2026.match(_profile(2000, (19,)))
    assert result.qualifies is False


def test_non_qualifying_match_still_returns_scheme_shape(aisyah: Profile) -> None:
    """Non-qualifying path still returns a fully populated SchemeMatch."""
    p = _profile(9000, (10,))  # income above ceiling
    result = str_2026.match(p)
    assert result.qualifies is False
    assert result.scheme_id == "str_2026"
    assert result.annual_rm == 0.0
    assert result.rule_citations, "citations populated even on non-match"
