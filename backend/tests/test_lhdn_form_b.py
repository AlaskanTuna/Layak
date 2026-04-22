"""LHDN Form B (YA2025) rule tests.

Asserts every relief cap constant appears on its cited page of
`pr-no-4-2024.pdf`, the Form B deadline appears in the filing programme PDF,
and Aisyah triggers all five reliefs with a non-zero tax saving.
"""

from __future__ import annotations

from app.rules import lhdn_form_b
from app.schema.profile import HouseholdFlags, Profile


def _has_amount(page: str, amount: str) -> bool:
    normalized = page.replace(" ", "")
    return f"RM{amount}" in normalized


def test_module_supports_only_ya_2025() -> None:
    """Module is pinned to YA 2025 — caps are not validated for other years."""
    assert lhdn_form_b.SUPPORTED_YA == "ya_2025"


def test_individual_relief_cap_on_pr_doc_p9(pdf_text: dict[str, dict[int, str]]) -> None:
    """RM9,000 individual relief appears on pr-no-4-2024.pdf pypdf p.12 (doc p.9)."""
    page = pdf_text["pr-no-4-2024.pdf"][12]
    assert _has_amount(page, f"{int(lhdn_form_b.INDIVIDUAL_RELIEF_RM):,}")
    assert "46(1) (a)" in page or "46(1)(a)" in page


def test_parent_medical_cap_on_pr_doc_p9(pdf_text: dict[str, dict[int, str]]) -> None:
    """RM8,000 parent medical relief appears on pr-no-4-2024.pdf pypdf p.12."""
    page = pdf_text["pr-no-4-2024.pdf"][12]
    assert _has_amount(page, f"{int(lhdn_form_b.PARENT_MEDICAL_CAP_RM):,}")
    assert "parents" in page.lower() and "medical" in page.lower()


def test_child_16a_amount_on_pr_doc_p41(pdf_text: dict[str, dict[int, str]]) -> None:
    """RM2,000 per under-18 unmarried child appears on pypdf p.44 (doc p.41)."""
    page = pdf_text["pr-no-4-2024.pdf"][44]
    assert _has_amount(page, f"{int(lhdn_form_b.CHILD_16A_PER_CHILD_RM):,}")
    assert "unmarried child" in page.lower()
    assert "48(1)(a)" in page.replace(" ", "")


def test_epf_life_sub_caps_on_pr_s6_19_3_doc_p47(pdf_text: dict[str, dict[int, str]]) -> None:
    """§6.19.3 YA2023+ individual sub-caps: RM3,000 life (§49(1)(a)) + RM4,000 EPF (§49(1)(b))."""
    page = pdf_text["pr-no-4-2024.pdf"][50]
    assert _has_amount(page, f"{int(lhdn_form_b.LIFE_INSURANCE_CAP_RM):,}")
    assert _has_amount(page, f"{int(lhdn_form_b.EPF_CAP_RM):,}")
    assert "49(1)(a)" in page.replace(" ", "")
    assert "49(1)(b)" in page.replace(" ", "")


def test_combined_epf_life_equals_sum_of_sub_caps() -> None:
    """The public-facing RM7,000 combined cap is the sum of the two §6.19.3 sub-caps."""
    assert (
        lhdn_form_b.EPF_LIFE_17_COMBINED_CAP_RM == lhdn_form_b.LIFE_INSURANCE_CAP_RM + lhdn_form_b.EPF_CAP_RM == 7000.0
    )


def test_pr_s6_19_heading_not_s6_20(pdf_text: dict[str, dict[int, str]]) -> None:
    """Guard against the previous miscitation: life/EPF lives in §6.19, not §6.20."""
    page_6_19_heading = pdf_text["pr-no-4-2024.pdf"][49]
    assert "6.19 Deduction for insurance premiums" in page_6_19_heading
    page_6_20_heading = pdf_text["pr-no-4-2024.pdf"][56]
    assert "6.20 Premium for insurance on education" in page_6_20_heading


def test_lifestyle_9_cap_on_pr_doc_p29(pdf_text: dict[str, dict[int, str]]) -> None:
    """RM2,500 lifestyle cap appears on pypdf p.32 (doc p.29)."""
    page = pdf_text["pr-no-4-2024.pdf"][32]
    assert _has_amount(page, f"{int(lhdn_form_b.LIFESTYLE_9_CAP_RM):,}")
    assert "lifestyle" in page.lower() or "maximum amount of RM2,500" in page


def test_form_b_deadline_appears_in_filing_programme(pdf_text: dict[str, dict[int, str]]) -> None:
    """The 30 June 2026 Form B deadline appears in rf-filing-programme-for-2026.pdf."""
    pages = pdf_text["rf-filing-programme-for-2026.pdf"]
    full = "\n".join(pages.values())
    assert "Form B" in full
    assert "30 June 2026" in full


def test_aisyah_triggers_all_five_reliefs_with_gazetted_caps(aisyah: Profile) -> None:
    """Aisyah's profile triggers all five reliefs — each returns its gazetted cap."""
    reliefs = lhdn_form_b._applicable_reliefs(aisyah)
    assert set(reliefs.keys()) == {
        "individual",
        "lifestyle_9",
        "epf_life_17",
        "parent_medical",
        "child_16a",
    }
    assert reliefs["individual"] == lhdn_form_b.INDIVIDUAL_RELIEF_RM == 9000.0
    assert reliefs["parent_medical"] == lhdn_form_b.PARENT_MEDICAL_CAP_RM == 8000.0
    assert reliefs["child_16a"] == 2 * lhdn_form_b.CHILD_16A_PER_CHILD_RM == 4000.0
    assert reliefs["epf_life_17"] == lhdn_form_b.EPF_LIFE_17_COMBINED_CAP_RM == 7000.0
    assert reliefs["lifestyle_9"] == lhdn_form_b.LIFESTYLE_9_CAP_RM == 2500.0


def test_no_parent_dependant_drops_parent_medical() -> None:
    """Profile without a parent dependant does not get the parent-medical relief."""
    p = Profile(
        name="No parent",
        ic_last4="0010",
        age=30,
        monthly_income_rm=3000,
        household_size=1,
        dependants=[],
        household_flags=HouseholdFlags(
            has_children_under_18=False,
            has_elderly_dependant=False,
            income_band="b40_household",
        ),
        form_type="form_b",
    )
    reliefs = lhdn_form_b._applicable_reliefs(p)
    assert "parent_medical" not in reliefs
    assert "child_16a" not in reliefs
    assert set(reliefs.keys()) == {"individual", "lifestyle_9", "epf_life_17"}


def test_aisyah_match_returns_positive_tax_saving(aisyah: Profile) -> None:
    """Aisyah match qualifies and returns a positive annual tax saving."""
    result = lhdn_form_b.match(aisyah)
    assert result.qualifies is True
    assert result.scheme_id == "lhdn_form_b"
    assert result.annual_rm > 0

    # Aisyah (RM33,600/yr, five reliefs totalling RM30,500) should save the
    # entire pre-relief bracket-2+3 tax burden, ≈ RM558 under YA2025 brackets.
    # Allow ±RM1 slack for rounding.
    assert abs(result.annual_rm - 558.0) < 1.0


def test_aisyah_match_has_all_six_citations(aisyah: Profile) -> None:
    """Match cites all five relief paragraphs plus the Form B deadline source."""
    result = lhdn_form_b.match(aisyah)
    rule_ids = {c.rule_id for c in result.rule_citations}
    expected = {
        "lhdn.form_b.individual_relief",
        "lhdn.form_b.parent_medical",
        "lhdn.form_b.child_16a",
        "lhdn.form_b.epf_life_17",
        "lhdn.form_b.lifestyle_9",
        "lhdn.form_b.filing_deadline",
    }
    assert expected.issubset(rule_ids)


def test_form_be_filer_now_qualifies_with_form_be_scheme_id() -> None:
    """Phase 7 Task 1 widened the rule to cover Form BE (salaried) filers.

    Prior behavior: Form BE was short-circuited to `qualifies=False`. The five
    reliefs apply identically under both forms; the gate has been removed and
    the scheme_id now diverges so the frontend + generate_packet can route to
    the Form BE draft template + deadline.
    """
    p = Profile(
        name="Form BE filer",
        ic_last4="0003",
        age=30,
        monthly_income_rm=3000,
        household_size=1,
        dependants=[],
        household_flags=HouseholdFlags(
            has_children_under_18=False,
            has_elderly_dependant=False,
            income_band="b40_household",
        ),
        form_type="form_be",
    )
    result = lhdn_form_b.match(p)
    assert result.qualifies is True
    assert result.scheme_id == "lhdn_form_be"
    assert "Form BE" in result.scheme_name
    assert result.annual_rm > 0


def test_tax_bracket_ya2025_spot_checks() -> None:
    """YA2025 bracket arithmetic matches hand-computed spot checks."""
    f = lhdn_form_b._malaysia_tax_ya2025
    assert f(5_000) == 0.0
    # 5,000 @ 0% + 15,000 @ 1% = 150
    assert f(20_000) == 150.0
    # Prev 150 + 13,600 @ 3% = 408 → 558
    assert f(33_600) == 558.0
    # Below-zero chargeable income never negative.
    assert f(-100) == 0.0


def test_combined_aisyah_upside_clears_plan_exit_gate(aisyah: Profile) -> None:
    """Aisyah's three-rule total ≥ RM7,000/year (docs/plan.md Task 4 exit criterion)."""
    from app.rules import jkm_warga_emas, str_2026

    total = (
        str_2026.match(aisyah).annual_rm + jkm_warga_emas.match(aisyah).annual_rm + lhdn_form_b.match(aisyah).annual_rm
    )
    assert total >= 7000.0, f"Aisyah total RM{total:,.0f} below plan.md ≥RM7,000 headline target"
