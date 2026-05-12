"""JKM Warga Emas rule tests.

Asserts:
  1. The JKM18 form p.2 contains the means-test section (income + household).
  2. Aisyah's father qualifies at per-capita RM700 < food-PLI RM1,236.
  3. Non-qualifying paths (no elderly parent, per-capita too high) are rejected.
  4. Constants match the externally sourced threshold + Budget 2026 rate.
"""

from __future__ import annotations

from app.rules import jkm_warga_emas
from app.schema.profile import Dependant, HouseholdFlags, Profile


def test_jkm18_p2_contains_means_test_section(pdf_text: dict[str, dict[int, str]]) -> None:
    """JKM18 p.2 carries the Section VII income-and-expenditure table."""
    page = pdf_text["jkm18.pdf"][2]
    assert "PENDAPATAN" in page
    assert "ISI RUMAH" in page
    assert "Jumlah pendapatan bulanan" in page


def test_food_pli_constant_is_1236() -> None:
    """DOSM 2024 food-PLI threshold is RM1,236 per capita per month."""
    assert jkm_warga_emas.FOOD_PLI_RM == 1236.0


def test_warga_emas_age_threshold_is_60() -> None:
    """Warga Emas definition starts at age 60."""
    assert jkm_warga_emas.WARGA_EMAS_AGE_THRESHOLD == 60


def test_budget_2026_rate_and_fallback() -> None:
    """Primary RM600/mo (Budget 2026) and fallback RM500/mo constants."""
    assert jkm_warga_emas.WARGA_EMAS_MONTHLY_RM == 600.0
    assert jkm_warga_emas.WARGA_EMAS_FALLBACK_MONTHLY_RM == 500.0


def test_aisyah_father_qualifies_per_capita_700(aisyah: Profile) -> None:
    """Aisyah: household RM2,800 / 4 members = RM700 per capita < RM1,236."""
    per_capita = aisyah.monthly_income_rm / aisyah.household_size
    assert per_capita == 700.0

    result = jkm_warga_emas.match(aisyah)
    assert result.qualifies is True
    assert result.scheme_id == "jkm_warga_emas"
    assert result.annual_rm == 600.0 * 12


def test_match_cites_jkm18_and_dosm_food_pli(aisyah: Profile) -> None:
    """The match cites both the JKM18 form and the DOSM food-PLI reference."""
    result = jkm_warga_emas.match(aisyah)
    rule_ids = {c.rule_id for c in result.rule_citations}
    assert "jkm.warga_emas.means_test_per_capita" in rule_ids
    assert "jkm.warga_emas.food_pli_threshold" in rule_ids
    assert "jkm.warga_emas.rate_budget_2026" in rule_ids


def _profile(income: float, household_size: int, parent_age: int | None) -> Profile:
    dependants: list[Dependant] = []
    if parent_age is not None:
        dependants.append(Dependant(relationship="parent", age=parent_age))
    return Profile(
        name="Test",
        ic_last6="080002",
        age=40,
        monthly_income_rm=income,
        household_size=household_size,
        dependants=dependants,
        household_flags=HouseholdFlags(
            has_children_under_18=False,
            has_elderly_dependant=parent_age is not None and parent_age >= 60,
            income_band="b40_household",
        ),
        form_type="form_b",
    )


def test_no_elderly_parent_does_not_qualify() -> None:
    """Household without any parent dependant aged ≥60 → not eligible."""
    result = jkm_warga_emas.match(_profile(2000, 2, parent_age=None))
    assert result.qualifies is False


def test_parent_under_60_does_not_qualify() -> None:
    """A parent under 60 does not meet the Warga Emas age threshold."""
    result = jkm_warga_emas.match(_profile(2000, 3, parent_age=55))
    assert result.qualifies is False


def test_per_capita_above_food_pli_does_not_qualify() -> None:
    """Income that pushes per-capita above RM1,236 → not eligible even with elderly parent."""
    # RM10,000 / 2 = RM5,000 per capita, well above RM1,236.
    result = jkm_warga_emas.match(_profile(10000, 2, parent_age=75))
    assert result.qualifies is False


def test_boundary_per_capita_exactly_at_food_pli_qualifies() -> None:
    """Per-capita equal to RM1,236 qualifies — threshold is inclusive (≤)."""
    # Pick income * size so per-capita == 1236 exactly.
    result = jkm_warga_emas.match(_profile(1236 * 3, 3, parent_age=62))
    assert result.qualifies is True
