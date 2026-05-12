"""PERKESO SKSPS rule tests.

Asserts:
  1. Constants match the SKSPS contribution schedule (4 plans; per-plan
     monthly + annual RM figures; age window 18-60).
  2. Income → plan tier mapping across bracket boundaries.
  3. Eligibility gates (gig-only; age window).
  4. `kind="required_contribution"` + `annual_rm=0.0` invariants (so the
     upside total never mis-credits the contribution amount).
  5. `annual_contribution_rm` carries the plan's yearly RM.
  6. `compute_upside` excludes required-contribution entries from its
     summation.
  7. `match_schemes` sorts required-contribution entries to the bottom of
     the qualifying list regardless of insertion order.
  8. generate_packet renders a valid PDF for SKSPS.

Does NOT assert against `pdf_text["perkeso-sksps-rates.pdf"]` — the source
brochure isn't committed under `backend/data/schemes/` yet. Same pattern
as `test_jkm_bkk.py`; flip in PDF-page assertions once the asset lands.
"""

from __future__ import annotations

from base64 import b64decode

import pytest

from app.agents.tools.compute_upside import compute_upside
from app.agents.tools.generate_packet import _TEMPLATE_MAP, generate_packet
from app.agents.tools.match import match_schemes
from app.rules import perkeso_sksps
from app.schema.profile import HouseholdFlags, Profile
from app.schema.scheme import SchemeMatch

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


def test_age_window_is_18_to_60() -> None:
    assert perkeso_sksps.GIG_AGE_MIN == 18
    assert perkeso_sksps.GIG_AGE_MAX == 60


def test_plan_schedule_matches_akta_789_jadual() -> None:
    """Four plans, ascending monthly + annual RM, with the last plan open-ended."""
    plans = perkeso_sksps._PLANS
    assert len(plans) == 4
    assert plans[0].tier == 1
    assert plans[0].monthly_rm == 19.40
    assert plans[0].annual_rm == 232.80
    assert plans[0].income_ceiling_rm == 1050.0
    assert plans[1].annual_rm == 298.80
    assert plans[1].income_ceiling_rm == 1550.0
    assert plans[2].annual_rm == 442.80
    assert plans[2].income_ceiling_rm == 2950.0
    assert plans[3].annual_rm == 596.40
    assert plans[3].income_ceiling_rm is None
    # Monthly × 12 should match annual on every plan.
    for plan in plans:
        assert round(plan.monthly_rm * 12, 2) == plan.annual_rm


# ---------------------------------------------------------------------------
# Plan-tier mapping
# ---------------------------------------------------------------------------


def _profile(*, income: float, age: int = 35, form_type: str = "form_b") -> Profile:
    return Profile(
        name="Test",
        age=age,
        monthly_income_rm=income,
        household_size=1,
        dependants=[],
        household_flags=HouseholdFlags(
            has_children_under_18=False,
            has_elderly_dependant=False,
            income_band="b40_household",
        ),
        form_type=form_type,  # type: ignore[arg-type]
    )


@pytest.mark.parametrize(
    "income, expected_annual",
    [
        (500.0, 232.80),   # Plan 1 floor
        (1050.0, 232.80),  # Plan 1 ceiling (inclusive)
        (1050.01, 298.80), # Plan 2 floor (just above Plan 1)
        (1550.0, 298.80),  # Plan 2 ceiling
        (2000.0, 442.80),  # Plan 3 mid — mirrors the plan's TODO confirmation
        (2950.0, 442.80),  # Plan 3 ceiling
        (2950.01, 596.40), # Plan 4 floor (just above Plan 3)
        (5000.0, 596.40),  # Plan 4 mid
        (50_000.0, 596.40),# Plan 4 open-ended top
    ],
)
def test_income_maps_to_correct_plan_tier(income: float, expected_annual: float) -> None:
    result = perkeso_sksps.match(_profile(income=income))
    assert result.qualifies is True
    assert result.annual_contribution_rm == expected_annual


def test_aisyah_shape_income_2800_lands_on_plan_3() -> None:
    """Aisyah earns RM2,800/mo (below the RM2,950 Plan 3 ceiling) → RM442.80/yr."""
    result = perkeso_sksps.match(_profile(income=2800))
    assert result.qualifies is True
    assert result.annual_contribution_rm == 442.80
    assert "Plan 3" in result.summary


# ---------------------------------------------------------------------------
# Eligibility gates
# ---------------------------------------------------------------------------


def test_salaried_filer_does_not_qualify() -> None:
    """Form BE (salaried) filers are outside the SKSPS/Akta 789 mandate."""
    result = perkeso_sksps.match(_profile(income=2000, form_type="form_be"))
    assert result.qualifies is False
    assert result.annual_contribution_rm is None
    assert "self-employed" in result.why_qualify.lower()


def test_under_18_does_not_qualify() -> None:
    result = perkeso_sksps.match(_profile(income=1000, age=17))
    assert result.qualifies is False
    assert "outside the Akta 789 window" in result.why_qualify


def test_over_60_does_not_qualify() -> None:
    result = perkeso_sksps.match(_profile(income=1000, age=61))
    assert result.qualifies is False
    assert "outside the Akta 789 window" in result.why_qualify


def test_boundary_age_18_and_60_qualify() -> None:
    """Window is inclusive at both ends (18 and 60 both pass)."""
    assert perkeso_sksps.match(_profile(income=1000, age=18)).qualifies is True
    assert perkeso_sksps.match(_profile(income=1000, age=60)).qualifies is True


# ---------------------------------------------------------------------------
# Schema invariants — `kind` + `annual_rm` must not leak into upside totals
# ---------------------------------------------------------------------------


def test_qualifying_match_has_kind_required_contribution_and_zero_annual_rm() -> None:
    """This is the load-bearing invariant: the upside pipeline sums `annual_rm`
    over qualifying matches, so a non-zero here would wrongly inflate totals.
    `kind="required_contribution"` tells the frontend to render it separately.
    """
    result = perkeso_sksps.match(_profile(income=2000))
    assert result.qualifies is True
    assert result.annual_rm == 0.0
    assert result.kind == "required_contribution"
    assert result.annual_contribution_rm == 442.80


def test_non_qualifying_match_also_has_kind_required_contribution() -> None:
    """Even when the profile doesn't qualify, the kind stays tagged — prevents
    a salaried-filer SchemeMatch from accidentally rendering in the upside list
    if it ever slips past the `qualifies` filter."""
    result = perkeso_sksps.match(_profile(income=2000, form_type="form_be"))
    assert result.kind == "required_contribution"
    assert result.annual_rm == 0.0


def test_citations_are_emitted_for_both_qualifying_and_non_qualifying() -> None:
    """Citations travel with the match regardless of `qualifies` so the UI can
    render 'why not eligible' with full provenance on rejected paths too."""
    yes = perkeso_sksps.match(_profile(income=2000))
    no = perkeso_sksps.match(_profile(income=2000, form_type="form_be"))
    for result in (yes, no):
        rule_ids = {c.rule_id for c in result.rule_citations}
        assert "perkeso.sksps.akta_789_eligibility" in rule_ids
        assert "perkeso.sksps.plan_schedule" in rule_ids


# ---------------------------------------------------------------------------
# Integration — compute_upside excludes contributions; match_schemes sorts last
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_compute_upside_excludes_required_contribution_from_stdout_sum() -> None:
    """`compute_upside` filters `kind="required_contribution"` before summing
    so the SKSPS zero (or any future contribution scheme) can't appear in
    the Gemini-rendered table with a misleading `0` row."""

    # Hand-built matches so the test doesn't depend on the live `match_schemes`
    # ordering, and skips the real Gemini call by supplying an empty list.
    sksps_match = perkeso_sksps.match(_profile(income=2000))

    result = await compute_upside([sksps_match])
    # With only a required-contribution match in play, `compute_upside` short-
    # circuits the Gemini call (no upside entries) and emits zero upside.
    assert result.total_annual_rm == 0.0
    assert result.per_scheme_rm == {}


@pytest.mark.asyncio
async def test_match_schemes_sorts_required_contribution_after_upside(aisyah: Profile) -> None:
    """Three-tier sort: upside (annual_rm desc) → subsidy_credit → required_contribution.
    Phase 12 added BUDI95 (subsidy_credit) which sits between the upside cards
    and the SKSPS required-contribution card."""
    matches = await match_schemes(aisyah)
    kinds = [m.kind for m in matches]
    upside_count = sum(1 for k in kinds if k == "upside")
    subsidy_count = sum(1 for k in kinds if k == "subsidy_credit")
    contribution_count = sum(1 for k in kinds if k == "required_contribution")
    # Each bucket appears as a contiguous block in the locked order.
    assert kinds[:upside_count] == ["upside"] * upside_count
    assert kinds[upside_count : upside_count + subsidy_count] == ["subsidy_credit"] * subsidy_count
    assert kinds[upside_count + subsidy_count :] == ["required_contribution"] * contribution_count
    # Aisyah: STR + Warga Emas + BKK + LHDN Form B + i-Saraan (5 upside) +
    # BUDI95 (1 subsidy_credit, age 34 ≥ 16) + SKSPS (1 required_contribution).
    assert upside_count == 5
    assert subsidy_count == 1
    assert contribution_count == 1
    assert matches[-1].scheme_id == "perkeso_sksps"


# ---------------------------------------------------------------------------
# Template + generate_packet wiring
# ---------------------------------------------------------------------------


def test_generate_packet_template_map_has_sksps_entry() -> None:
    template, filename = _TEMPLATE_MAP["perkeso_sksps"]
    assert template == "perkeso_sksps.html.jinja"
    assert "sksps" in filename.lower()
    assert "{date}" in filename


@pytest.mark.asyncio
async def test_generate_packet_renders_sksps_pdf(aisyah: Profile) -> None:
    """End-to-end: Aisyah → SKSPS match → a non-empty PDF starting with `%PDF`."""
    match = perkeso_sksps.match(aisyah)
    assert match.qualifies is True
    packet = await generate_packet(aisyah, [match])
    assert len(packet.drafts) == 1
    draft = packet.drafts[0]
    assert draft.scheme_id == "perkeso_sksps"
    assert "sksps" in draft.filename.lower()
    pdf_bytes = b64decode(draft.blob_bytes_b64)
    assert pdf_bytes.startswith(b"%PDF"), "SKSPS draft does not look like a PDF"


# ---------------------------------------------------------------------------
# SchemeMatch schema — back-compat (pre-Task-9 matches still validate)
# ---------------------------------------------------------------------------


def test_pre_task_9_scheme_match_omitting_kind_still_validates() -> None:
    """Older persisted docs that don't carry `kind` or `annual_contribution_rm`
    must still deserialise — defaults preserve back-compat across the Firestore
    store. If this breaks, existing Firestore evaluations would 500 on read."""
    raw = {
        "scheme_id": "str_2026",
        "scheme_name": "STR 2026",
        "qualifies": True,
        "annual_rm": 450.0,
        "summary": "test",
        "why_qualify": "test",
        "agency": "LHDN",
        "portal_url": "https://example.com",
        # Note: no `kind`, no `annual_contribution_rm`.
    }
    match = SchemeMatch.model_validate(raw)
    assert match.kind == "upside"
    assert match.annual_contribution_rm is None
