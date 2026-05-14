"""JKM Bantuan Kanak-Kanak (BKK) rule tests — post-Belanjawan-2025 rates.

Asserts:
  1. Constants match the post-Belanjawan-2025 BKK schedule (RM 250/child
     for ages ≤ 6, RM 200/child for ages 7–17, RM 1,000/mo household cap,
     RM 1,000/capita means-test threshold). Belanjawan 2025 (tabled 18 Oct
     2024) raised the per-child rates from RM 200/RM 150; Belanjawan 2026
     left them unchanged.
  2. Aisyah-shape profile (2 children ages 10 + 7, both in the older band,
     low income) qualifies with `annual_rm == 4800.0` under the current rates.
  3. High-income profile does not qualify.
  4. Profile without qualifying child dependants does not qualify.
  5. Mixed-age and large-household scenarios respect the per-tier rate
     and the RM 12,000/yr household ceiling.
  6. `generate_packet` renders a valid PDF for the JKM BKK match.
"""

from __future__ import annotations

from base64 import b64decode

import pytest

from app.agents.tools.generate_packet import _TEMPLATE_MAP, generate_packet
from app.rules import jkm_bkk
from app.schema.profile import Dependant, HouseholdFlags, Profile

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


def test_per_child_rate_younger_band_is_250() -> None:
    """Belanjawan 2025 schedule — RM 250/month for children aged 6 and under
    (raised from RM 200 under prior budgets)."""
    assert jkm_bkk.PER_CHILD_MONTHLY_RM_YOUNGER == 250.0


def test_per_child_rate_older_band_is_200() -> None:
    """Belanjawan 2025 schedule — RM 200/month for children aged 7–17
    (raised from RM 150 under prior budgets)."""
    assert jkm_bkk.PER_CHILD_MONTHLY_RM_OLDER == 200.0


def test_younger_band_age_boundary_is_6() -> None:
    assert jkm_bkk.YOUNGER_BAND_AGE == 6


def test_household_monthly_cap_is_1000() -> None:
    assert jkm_bkk.HOUSEHOLD_MONTHLY_CAP_RM == 1000.0


def test_household_annual_cap_is_12000() -> None:
    """Derived cap — asserted explicitly so a change to the monthly cap
    can't silently drift the annual arithmetic."""
    assert jkm_bkk.HOUSEHOLD_ANNUAL_CAP_RM == 12000.0


def test_per_capita_threshold_is_1000() -> None:
    assert jkm_bkk.PER_CAPITA_THRESHOLD_RM == 1000.0


def test_child_age_threshold_is_18() -> None:
    assert jkm_bkk.CHILD_AGE_THRESHOLD == 18


# ---------------------------------------------------------------------------
# Eligibility paths
# ---------------------------------------------------------------------------


def _profile(*, income: float, household_size: int, children: list[int], parents: list[int] | None = None) -> Profile:
    """Build a test Profile. `children` / `parents` are lists of ages."""
    deps: list[Dependant] = [Dependant(relationship="child", age=age) for age in children]
    if parents:
        deps.extend(Dependant(relationship="parent", age=age) for age in parents)
    return Profile(
        name="Test",
        age=35,
        monthly_income_rm=income,
        household_size=household_size,
        dependants=deps,
        household_flags=HouseholdFlags(
            has_children_under_18=any(age < 18 for age in children),
            has_elderly_dependant=any(age >= 60 for age in (parents or [])),
            income_band="b40_household",
        ),
        form_type="form_b",
    )


def test_aisyah_shape_qualifies_two_children_annual_rm_4800(aisyah: Profile) -> None:
    """Aisyah: RM 2,800 / 4 = RM 700/cap (≤ RM 1,000); two children ages 10 & 7
    both fall in the older 7–17 band → 2 × RM 200 × 12 = RM 4,800/yr under
    the Belanjawan 2025 rates (well under the RM 12,000 household cap)."""
    result = jkm_bkk.match(aisyah)
    assert result.qualifies is True
    assert result.scheme_id == "jkm_bkk"
    assert result.annual_rm == 4800.0
    assert "Bantuan Kanak-Kanak" in result.scheme_name


def test_match_cites_eligibility_and_rate_rules(aisyah: Profile) -> None:
    """Both `eligibility_means_test` and `rate_per_child` citations are emitted."""
    result = jkm_bkk.match(aisyah)
    rule_ids = {c.rule_id for c in result.rule_citations}
    assert "jkm.bkk.eligibility_means_test" in rule_ids
    assert "jkm.bkk.rate_per_child" in rule_ids


def test_high_income_profile_does_not_qualify() -> None:
    """Per-capita above RM1,000 → not eligible even with two children."""
    # RM5,000 / 4 = RM1,250 per capita.
    result = jkm_bkk.match(_profile(income=5000, household_size=4, children=[10, 7]))
    assert result.qualifies is False
    assert result.annual_rm == 0.0
    assert "per-capita income" in result.why_qualify.lower()


def test_no_child_dependants_does_not_qualify() -> None:
    """Household with no child dependants under 18 → not eligible."""
    result = jkm_bkk.match(_profile(income=2000, household_size=3, children=[], parents=[70]))
    assert result.qualifies is False
    assert "no child dependant" in result.why_qualify.lower()


def test_adult_children_do_not_count() -> None:
    """Dependant with `relationship='child'` but age ≥ 18 does NOT trigger BKK."""
    result = jkm_bkk.match(_profile(income=2000, household_size=3, children=[18, 22]))
    assert result.qualifies is False


def test_seven_children_caps_at_household_monthly_ceiling() -> None:
    """Mixed-age large household: ages [2,4,6,8,10,12,14] = 3 younger × RM 250
    + 4 older × RM 200 = RM 750 + RM 800 = RM 1,550/month uncapped; household
    cap clamps to RM 1,000/month → RM 12,000/yr."""
    ages = [2, 4, 6, 8, 10, 12, 14]
    result = jkm_bkk.match(_profile(income=3000, household_size=8, children=ages))
    assert result.qualifies is True
    assert result.annual_rm == 12000.0
    assert "capped" in result.summary.lower() or "RM1,000" in result.summary


def test_five_children_engage_cap() -> None:
    """ages [2,5,8,11,14] = 2 younger × RM 250 + 3 older × RM 200 = RM 1,100/mo
    uncapped; capped to RM 1,000/mo → RM 12,000/yr (Belanjawan 2025 rate uplift
    pushes this composition into the cap; under prior RM 200/RM 150 rates
    the same mix was RM 850/mo and stayed below the cap)."""
    ages = [2, 5, 8, 11, 14]
    result = jkm_bkk.match(_profile(income=3000, household_size=6, children=ages))
    assert result.qualifies is True
    assert result.annual_rm == 12000.0


def test_four_children_under_cap() -> None:
    """ages [2,5,8,11] = 2 younger × RM 250 + 2 older × RM 200 = RM 900/mo,
    below the RM 1,000 cap → RM 10,800/yr."""
    ages = [2, 5, 8, 11]
    result = jkm_bkk.match(_profile(income=3000, household_size=5, children=ages))
    assert result.qualifies is True
    assert result.annual_rm == 10800.0


def test_four_younger_children_under_cap() -> None:
    """All 4 children aged ≤ 6: 4 × RM 250 = RM 1,000/mo — exactly at cap →
    RM 12,000/yr (cap saturates without exceeding)."""
    ages = [1, 2, 3, 4]
    result = jkm_bkk.match(_profile(income=3000, household_size=5, children=ages))
    assert result.qualifies is True
    assert result.annual_rm == 12000.0


def test_six_younger_children_exceeds_cap() -> None:
    """6 × RM 250 = RM 1,500/mo uncapped; capped to RM 1,000/mo → RM 12,000/yr."""
    ages = [1, 2, 3, 4, 5, 6]
    result = jkm_bkk.match(_profile(income=3000, household_size=7, children=ages))
    assert result.qualifies is True
    assert result.annual_rm == 12000.0


def test_boundary_per_capita_exactly_at_threshold_qualifies() -> None:
    """Per-capita equal to RM 1,000 qualifies — threshold is inclusive (≤).
    1 child age 10 → older band → RM 200 × 12 = RM 2,400/yr under Budget
    2026 rates."""
    # RM 3,000 / 3 members = RM 1,000 per capita exactly.
    result = jkm_bkk.match(_profile(income=3000, household_size=3, children=[10]))
    assert result.qualifies is True
    assert result.annual_rm == 2400.0


def test_age_boundary_six_pays_younger_rate() -> None:
    """Age 6 inclusive falls into the younger band (RM 250/mo under
    Belanjawan 2025)."""
    result = jkm_bkk.match(_profile(income=2000, household_size=3, children=[6]))
    assert result.qualifies is True
    assert result.annual_rm == 3000.0  # 1 × 250 × 12


def test_age_boundary_seven_pays_older_rate() -> None:
    """Age 7 falls into the older band (RM 200/mo under Belanjawan 2025)."""
    result = jkm_bkk.match(_profile(income=2000, household_size=3, children=[7]))
    assert result.qualifies is True
    assert result.annual_rm == 2400.0  # 1 × 200 × 12


# ---------------------------------------------------------------------------
# Template + generate_packet wiring
# ---------------------------------------------------------------------------


def test_generate_packet_template_map_has_jkm_bkk_entry() -> None:
    """`_TEMPLATE_MAP` must route `jkm_bkk` scheme_id to the BKK Jinja template."""
    template, filename = _TEMPLATE_MAP["jkm_bkk"]
    assert template == "jkm_bkk.html.jinja"
    # Filename carries "bkk" + the IC placeholder for uniqueness.
    assert "bkk" in filename.lower()
    assert "{date}" in filename


@pytest.mark.asyncio
async def test_generate_packet_renders_bkk_pdf_for_aisyah(aisyah: Profile) -> None:
    """End-to-end: Aisyah → BKK match → a non-empty PDF starting with `%PDF`."""
    match = jkm_bkk.match(aisyah)
    assert match.qualifies is True
    packet = await generate_packet(aisyah, [match])
    assert len(packet.drafts) == 1
    draft = packet.drafts[0]
    assert draft.scheme_id == "jkm_bkk"
    assert "bkk" in draft.filename.lower()
    pdf_bytes = b64decode(draft.blob_bytes_b64)
    assert pdf_bytes.startswith(b"%PDF"), "BKK draft does not look like a PDF"
