"""EPF i-Saraan rule tests.

Asserts:
  1. Constants match the program schedule (15% match rate, RM500/yr cap,
     ages 18-60 inclusive).
  2. Aisyah-shape profile (Form B, age 34) qualifies with `annual_rm == 500.0`
     and surfaces the `kind="upside"` default so the headline upside total
     picks it up.
  3. Salaried filers (Form BE) do not qualify — i-Saraan is targeted at
     filers WITHOUT employer-side EPF contributions.
  4. Under-18 and over-60 filers do not qualify.
  5. Boundary ages 18 and 60 inclusive both qualify.
  6. `generate_packet` renders a valid PDF for the i-Saraan match.

Does NOT assert against `pdf_text["i-saraan-program.pdf"]` — the source
brochure isn't committed under `backend/data/schemes/` yet (same pattern as
test_jkm_bkk.py and test_perkeso_sksps.py). Swap in a PDF page assertion when
the asset lands.
"""

from __future__ import annotations

from base64 import b64decode

import pytest

from app.agents.tools.generate_packet import _TEMPLATE_MAP, generate_packet
from app.rules import i_saraan
from app.schema.profile import FormType, HouseholdFlags, Profile

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


def test_min_age_is_18() -> None:
    assert i_saraan.MIN_AGE == 18


def test_max_age_is_60() -> None:
    assert i_saraan.MAX_AGE == 60


def test_annual_match_cap_is_500() -> None:
    assert i_saraan.ANNUAL_MATCH_CAP_RM == 500.0


def test_match_rate_is_15_percent() -> None:
    assert i_saraan.MATCH_RATE_PCT == 15.0


def test_annual_contribution_to_max_match_is_about_3333() -> None:
    """500 ÷ 0.15 ≈ 3,333.33; rounded to two decimals."""
    assert abs(i_saraan.ANNUAL_CONTRIBUTION_TO_MAX_MATCH_RM - 3333.33) < 0.01


# ---------------------------------------------------------------------------
# Eligibility paths
# ---------------------------------------------------------------------------


def _profile(*, age: int, form_type: FormType, income: float = 2800.0) -> Profile:
    """Build a minimal test Profile. Other fields don't influence i-Saraan."""
    return Profile(
        name="Test Filer",
        age=age,
        monthly_income_rm=income,
        household_size=1,
        dependants=[],
        household_flags=HouseholdFlags(
            has_children_under_18=False,
            has_elderly_dependant=False,
            income_band="b40_household",
        ),
        form_type=form_type,
    )


def test_aisyah_shape_qualifies_max_match(aisyah: Profile) -> None:
    """Aisyah: Form B, age 34 → qualifies for the full RM500/yr match ceiling."""
    result = i_saraan.match(aisyah)
    assert result.qualifies is True
    assert result.scheme_id == "i_saraan"
    assert result.annual_rm == 500.0
    # Default kind preserves the upside semantics so the headline total picks it up.
    assert result.kind == "upside"
    assert "i-Saraan" in result.scheme_name


def test_match_cites_eligibility_and_match_rate(aisyah: Profile) -> None:
    """Both `eligibility` and `match_rate_and_cap` citations are emitted."""
    result = i_saraan.match(aisyah)
    rule_ids = {c.rule_id for c in result.rule_citations}
    assert "epf.i_saraan.eligibility" in rule_ids
    assert "epf.i_saraan.match_rate_and_cap" in rule_ids


def test_salaried_form_be_filer_does_not_qualify() -> None:
    """Form BE (salaried) filers have employer EPF — i-Saraan doesn't apply."""
    result = i_saraan.match(_profile(age=34, form_type="form_be"))
    assert result.qualifies is False
    assert result.annual_rm == 0.0
    assert "self-employed" in result.why_qualify.lower()


def test_under_18_form_b_filer_does_not_qualify() -> None:
    """Age <18 fails the i-Saraan age window even if form_type is Form B."""
    result = i_saraan.match(_profile(age=17, form_type="form_b"))
    assert result.qualifies is False
    assert result.annual_rm == 0.0
    assert "age 17" in result.why_qualify


def test_over_60_form_b_filer_does_not_qualify() -> None:
    """Age >60 fails the i-Saraan age window — match stops at retirement age."""
    result = i_saraan.match(_profile(age=61, form_type="form_b"))
    assert result.qualifies is False
    assert result.annual_rm == 0.0
    assert "age 61" in result.why_qualify


def test_boundary_age_18_qualifies() -> None:
    """Age exactly at MIN_AGE qualifies — window is inclusive."""
    result = i_saraan.match(_profile(age=18, form_type="form_b"))
    assert result.qualifies is True
    assert result.annual_rm == 500.0


def test_boundary_age_60_qualifies() -> None:
    """Age exactly at MAX_AGE qualifies — window is inclusive."""
    result = i_saraan.match(_profile(age=60, form_type="form_b"))
    assert result.qualifies is True
    assert result.annual_rm == 500.0


def test_match_does_not_set_required_contribution_kind() -> None:
    """i-Saraan is an upside scheme (user RECEIVES money) — kind must NOT
    be `required_contribution`. Regression guard against a future copy-paste
    from PERKESO SKSPS."""
    result = i_saraan.match(_profile(age=34, form_type="form_b"))
    assert result.kind == "upside"
    assert result.annual_contribution_rm is None


# ---------------------------------------------------------------------------
# Template + generate_packet wiring
# ---------------------------------------------------------------------------


def test_generate_packet_template_map_has_i_saraan_entry() -> None:
    """`_TEMPLATE_MAP` must route `i_saraan` scheme_id to the i-Saraan Jinja template."""
    template, filename = _TEMPLATE_MAP["i_saraan"]
    assert template == "i_saraan.html.jinja"
    assert "saraan" in filename.lower()
    assert "{date}" in filename


@pytest.mark.asyncio
async def test_generate_packet_renders_i_saraan_pdf_for_aisyah(aisyah: Profile) -> None:
    """End-to-end: Aisyah → i-Saraan match → a non-empty PDF starting with `%PDF`."""
    match = i_saraan.match(aisyah)
    assert match.qualifies is True
    packet = await generate_packet(aisyah, [match])
    assert len(packet.drafts) == 1
    draft = packet.drafts[0]
    assert draft.scheme_id == "i_saraan"
    assert "saraan" in draft.filename.lower()
    pdf_bytes = b64decode(draft.blob_bytes_b64)
    assert pdf_bytes.startswith(b"%PDF"), "i-Saraan draft does not look like a PDF"


# ---------------------------------------------------------------------------
# Aisyah fixture parity — i-Saraan must appear in the precomputed match list.
# ---------------------------------------------------------------------------


def test_aisyah_fixture_precomputed_matches_include_i_saraan() -> None:
    """`AISYAH_SCHEME_MATCHES` must surface i-Saraan — protects the demo-mode
    mock-SSE replay from desyncing with the live engine output."""
    from app.fixtures.aisyah import AISYAH_SCHEME_MATCHES

    scheme_ids = {m.scheme_id for m in AISYAH_SCHEME_MATCHES}
    assert "i_saraan" in scheme_ids
