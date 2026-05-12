"""Regression — Form BE (salaried) filer path.

Two concerns:
  1. The manual-entry builder correctly maps `employment_type="salaried"` to
     `Profile.form_type="form_be"` (and gig → form_b). This is the client-side
     sensor for routing Form B vs Form BE draft packets.
  2. The LHDN rule engine now qualifies BOTH filer categories with divergent
     `scheme_id` values, so downstream `generate_packet._TEMPLATE_MAP` picks
     the right Jinja template and the frontend ranked list surfaces a
     Form-BE-labelled draft.

The Gemini classifier itself isn't exercised here (its prompt passes the
Profile through and emits a HouseholdClassification — no new form_type field
on the classification output); the classify prompt was edited to echo the
Profile's form_type verbatim in its notes list, but that's a prompt-level
hint covered by the live smoke rather than an offline test.
"""

from __future__ import annotations


import pytest

from app.agents.tools.build_profile import build_profile_from_manual_entry
from app.agents.tools.generate_packet import _TEMPLATE_MAP
from app.rules import lhdn_form_b
from app.schema.manual_entry import ManualEntryPayload
from app.schema.profile import HouseholdFlags, Profile


def _payload(**overrides: object) -> ManualEntryPayload:
    """Build a valid `ManualEntryPayload` with salaried defaults; overrides patch fields.

    IC layout: 900514 (DOB 1990-05-14) + 08 (Selangor) + 1234 (serial).
    """
    base: dict[str, object] = {
        "name": "Cikgu Farhan bin Ismail",
        "ic": "900514081234",
        "monthly_income_rm": 5200.0,
        "employment_type": "salaried",
        "address": "12 Jalan Kenanga, 43650 Bandar Baru Bangi, Selangor",
        "monthly_cost_rm": 180.0,
        "monthly_kwh": 420,
        "dependants": [],
    }
    base.update(overrides)
    return ManualEntryPayload(**base)


def _salaried_profile(monthly_income_rm: float = 5200.0) -> Profile:
    """Construct a Form BE profile for rule-engine tests without invoking
    the manual-entry builder. Mirrors the builder's output shape.
    """
    return Profile(
        name="Cikgu Farhan bin Ismail",
        ic_last6="081234",
        age=35,
        monthly_income_rm=monthly_income_rm,
        household_size=1,
        dependants=[],
        household_flags=HouseholdFlags(
            has_children_under_18=False,
            has_elderly_dependant=False,
            income_band="b40_household",
        ),
        form_type="form_be",
    )


# ============================================================================
# build_profile_from_manual_entry — employment_type → form_type
# ============================================================================


def test_salaried_payload_produces_form_be_profile() -> None:
    """`employment_type="salaried"` → `Profile.form_type="form_be"`."""
    profile = build_profile_from_manual_entry(_payload(employment_type="salaried"))
    assert profile.form_type == "form_be"


def test_gig_payload_produces_form_b_profile() -> None:
    """`employment_type="gig"` → `Profile.form_type="form_b"` (regression)."""
    profile = build_profile_from_manual_entry(_payload(employment_type="gig"))
    assert profile.form_type == "form_b"


# ============================================================================
# LHDN rule — Form B vs Form BE scheme_id divergence
# ============================================================================


def test_form_be_salaried_filer_qualifies_with_lhdn_form_be_scheme_id() -> None:
    """Salaried (Form BE) filer now qualifies; scheme_id diverges from Form B."""
    profile = _salaried_profile()
    result = lhdn_form_b.match(profile)
    assert result.qualifies is True
    assert result.scheme_id == "lhdn_form_be"
    assert "Form BE" in result.scheme_name
    assert result.annual_rm > 0


def test_form_b_gig_filer_still_emits_lhdn_form_b_scheme_id() -> None:
    """Regression: gig (Form B) filer continues to emit the original scheme_id."""
    profile = Profile(
        name="Aisyah",
        ic_last6="064321",
        age=34,
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
    result = lhdn_form_b.match(profile)
    assert result.qualifies is True
    assert result.scheme_id == "lhdn_form_b"
    assert "Form B" in result.scheme_name and "Form BE" not in result.scheme_name


def test_form_be_citations_include_form_be_deadline() -> None:
    """Form BE match cites the 30 April 2026 deadline from RF Filing Programme Example 1."""
    result = lhdn_form_b.match(_salaried_profile())
    rule_ids = {c.rule_id for c in result.rule_citations}
    assert "lhdn.form_be.filing_deadline" in rule_ids
    assert "lhdn.form_b.filing_deadline" not in rule_ids
    deadline_cite = next(c for c in result.rule_citations if c.rule_id == "lhdn.form_be.filing_deadline")
    assert "30 April 2026" in deadline_cite.passage
    assert "15 May 2026" in deadline_cite.passage


def test_form_b_citations_still_use_form_b_deadline() -> None:
    """Regression: Form B citations retain the 30 June 2026 deadline (not BE)."""
    profile = Profile(
        name="Aisyah",
        ic_last6="064321",
        age=34,
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
    result = lhdn_form_b.match(profile)
    rule_ids = {c.rule_id for c in result.rule_citations}
    assert "lhdn.form_b.filing_deadline" in rule_ids
    assert "lhdn.form_be.filing_deadline" not in rule_ids


def test_form_be_deadline_appears_in_filing_programme_pdf(pdf_text: dict[str, dict[int, str]]) -> None:
    """The 30 April 2026 Form BE deadline appears in rf-filing-programme-for-2026.pdf.

    Example 1 on doc p.2 (pypdf p.3) is the canonical source — the test
    asserts the deadline string appears somewhere in the PDF so any future
    PDF rotation breaks loudly.
    """
    pages = pdf_text["rf-filing-programme-for-2026.pdf"]
    full = "\n".join(pages.values())
    assert "Form BE" in full
    assert "30 April 2026" in full


def test_form_be_reliefs_equal_form_b_reliefs_for_same_profile_shape() -> None:
    """Reliefs applied are identical for equivalent Form B and Form BE profiles.

    The five reliefs (individual, parent medical, child #16a, EPF+life,
    lifestyle) apply identically under both filer categories per PR 4/2024 —
    documented divergence only at the filing-deadline citation. This test
    guards against an accidental form-gated relief regression.
    """
    form_b_profile = Profile(
        name="Gig filer",
        ic_last6="080001",
        age=35,
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
    form_be_profile = form_b_profile.model_copy(update={"form_type": "form_be"})

    reliefs_b = lhdn_form_b._applicable_reliefs(form_b_profile)
    reliefs_be = lhdn_form_b._applicable_reliefs(form_be_profile)
    assert reliefs_b == reliefs_be

    # Same reliefs + same income → identical tax-saving arithmetic.
    assert lhdn_form_b.match(form_b_profile).annual_rm == lhdn_form_b.match(form_be_profile).annual_rm


# ============================================================================
# generate_packet wiring — Form BE routes to the dedicated template
# ============================================================================


def test_generate_packet_template_map_routes_form_be_to_lhdn_be_template() -> None:
    """Form BE scheme_id dispatches to `lhdn_be.html.jinja`, not the Form B template."""
    template_b, filename_b = _TEMPLATE_MAP["lhdn_form_b"]
    template_be, filename_be = _TEMPLATE_MAP["lhdn_form_be"]
    assert template_b == "lhdn.html.jinja"
    assert template_be == "lhdn_be.html.jinja"
    # The downloaded filename also diverges so the user sees -form-be- in the
    # saved PDF name rather than a generic LHDN-draft-....pdf.
    assert "form-b" in filename_b and "form-be" not in filename_b
    assert "form-be" in filename_be


@pytest.mark.asyncio
async def test_generate_packet_renders_lhdn_be_pdf_for_salaried_filer(tmp_path: object) -> None:
    """End-to-end: salaried profile → LHDN Form BE match → a non-empty PDF with %PDF header."""
    from base64 import b64decode

    from app.agents.tools.generate_packet import generate_packet

    profile = _salaried_profile()
    match = lhdn_form_b.match(profile)
    packet = await generate_packet(profile, [match])

    assert len(packet.drafts) == 1
    draft = packet.drafts[0]
    assert draft.scheme_id == "lhdn_form_be"
    assert "form-be" in draft.filename.lower()
    pdf_bytes = b64decode(draft.blob_bytes_b64)
    assert pdf_bytes.startswith(b"%PDF"), "Form BE draft does not look like a PDF"
