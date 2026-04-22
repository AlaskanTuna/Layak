"""JKM Bantuan Kanak-Kanak (BKK) rule tests — Phase 7 Task 8.

Asserts:
  1. Constants match the BKK schedule (RM100/child, RM450/mo household cap,
     RM1,000/capita means-test threshold).
  2. Aisyah-shape profile (2 children under 18, low income) qualifies with
     `annual_rm == 2400.0`.
  3. High-income profile does not qualify.
  4. Profile without qualifying child dependants does not qualify.
  5. Profile with 7 children caps at the monthly household ceiling
     (RM5,400/yr, NOT 7 × RM100 × 12 = RM8,400/yr).
  6. `generate_packet` renders a valid PDF for the JKM BKK match.

Does NOT assert against `pdf_text["jkm-bkk-brochure.pdf"]` — the source
brochure isn't committed under `backend/data/schemes/` yet. Swap in a PDF
page assertion when the asset lands, same shape as `test_jkm_warga_emas.py`.
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


def test_per_child_rate_is_100() -> None:
    assert jkm_bkk.PER_CHILD_MONTHLY_RM == 100.0


def test_household_monthly_cap_is_450() -> None:
    assert jkm_bkk.HOUSEHOLD_MONTHLY_CAP_RM == 450.0


def test_household_annual_cap_is_5400() -> None:
    """Derived cap — asserted explicitly so a change to the monthly cap
    can't silently drift the annual arithmetic."""
    assert jkm_bkk.HOUSEHOLD_ANNUAL_CAP_RM == 5400.0


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
        ic_last4="9999",
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


def test_aisyah_shape_qualifies_two_children_annual_rm_2400(aisyah: Profile) -> None:
    """Aisyah: RM2,800 / 4 = RM700/cap (≤ RM1,000), two children ages 10 & 7 (<18)."""
    result = jkm_bkk.match(aisyah)
    assert result.qualifies is True
    assert result.scheme_id == "jkm_bkk"
    # 2 × RM100 × 12 = RM2,400/yr; well under the RM5,400 household cap.
    assert result.annual_rm == 2400.0
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
    """7 children × RM100 = RM700/month uncapped; household cap clamps to RM450/mo."""
    ages = [2, 4, 6, 8, 10, 12, 14]  # all <18, seven of them.
    result = jkm_bkk.match(_profile(income=3000, household_size=8, children=ages))
    assert result.qualifies is True
    # RM450 × 12 = RM5,400/yr, NOT 7 × RM100 × 12 = RM8,400.
    assert result.annual_rm == 5400.0
    assert "capped" in result.summary.lower() or "RM450" in result.summary


def test_five_children_also_caps_at_monthly_ceiling() -> None:
    """Cap engages from 5 children onwards (5 × RM100 = RM500 > RM450)."""
    ages = [2, 5, 8, 11, 14]
    result = jkm_bkk.match(_profile(income=3000, household_size=6, children=ages))
    assert result.qualifies is True
    assert result.annual_rm == 5400.0


def test_four_children_below_cap() -> None:
    """4 children × RM100 = RM400/month, below the RM450 household cap."""
    ages = [2, 5, 8, 11]
    result = jkm_bkk.match(_profile(income=3000, household_size=5, children=ages))
    assert result.qualifies is True
    assert result.annual_rm == 4800.0  # 4 × 100 × 12


def test_boundary_per_capita_exactly_at_threshold_qualifies() -> None:
    """Per-capita equal to RM1,000 qualifies — threshold is inclusive (≤)."""
    # RM3,000 / 3 members = RM1,000 per capita exactly.
    result = jkm_bkk.match(_profile(income=3000, household_size=3, children=[10]))
    assert result.qualifies is True
    assert result.annual_rm == 1200.0


# ---------------------------------------------------------------------------
# Template + generate_packet wiring
# ---------------------------------------------------------------------------


def test_generate_packet_template_map_has_jkm_bkk_entry() -> None:
    """`_TEMPLATE_MAP` must route `jkm_bkk` scheme_id to the BKK Jinja template."""
    template, filename = _TEMPLATE_MAP["jkm_bkk"]
    assert template == "jkm_bkk.html.jinja"
    # Filename carries "bkk" + the IC placeholder for uniqueness.
    assert "bkk" in filename.lower()
    assert "{ic_last4}" in filename


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
