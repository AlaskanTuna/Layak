"""Smoke tests for Phase 11 Feature 4 narration helpers.

Asserts:
  - Every step emits well-formed Pydantic events (≤ 80 char headlines,
    ≤ 40 char data points).
  - Technical events stay strictly free of free-text PII (raw names,
    addresses, full IC numbers).
  - Tier 1 narration localises to en/ms/zh for each of the 5 steps.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from app.agents.narration import (
    narrate_classify_lay,
    narrate_classify_technical,
    narrate_compute_upside_lay,
    narrate_compute_upside_technical,
    narrate_extract_lay,
    narrate_extract_technical,
    narrate_generate_lay,
    narrate_generate_technical,
    narrate_match_lay,
    narrate_match_technical,
)
from app.fixtures.aisyah import AISYAH_PROFILE
from app.schema.events import ComputeUpsideResult
from app.schema.packet import Packet, PacketDraft
from app.schema.profile import HouseholdClassification
from app.schema.scheme import RuleCitation, SchemeMatch


@pytest.fixture
def classification() -> HouseholdClassification:
    return HouseholdClassification(
        has_children_under_18=True,
        has_elderly_dependant=True,
        income_band="b40_household_with_children",
        per_capita_monthly_rm=700.0,
        notes=["Household size: 4", "Per-capita: RM 700"],
    )


@pytest.fixture
def matches() -> list[SchemeMatch]:
    return [
        SchemeMatch(
            scheme_id="str_2026",
            scheme_name="STR 2026",
            qualifies=True,
            annual_rm=2500.0,
            summary="STR tier",
            why_qualify="Household income within band",
            agency="LHDN",
            portal_url="https://example.test",
            rule_citations=[
                RuleCitation(
                    rule_id="str-tier",
                    source_pdf="risalah-str-2026.pdf",
                    page_ref="p.2",
                    passage="STR tier table",
                ),
            ],
        ),
        SchemeMatch(
            scheme_id="jkm_warga_emas",
            scheme_name="JKM Warga Emas",
            qualifies=True,
            annual_rm=6000.0,
            summary="Elderly assistance",
            why_qualify="Elderly dependant in household",
            agency="JKM",
            portal_url="https://example.test",
        ),
    ]


@pytest.fixture
def upside() -> ComputeUpsideResult:
    return ComputeUpsideResult(
        python_snippet="total = sum(...)",
        stdout="STR 2026: RM 2500\nJKM: RM 6000\nTotal: RM 8500",
        total_annual_rm=8500.0,
        per_scheme_rm={"str_2026": 2500.0, "jkm_warga_emas": 6000.0},
    )


@pytest.fixture
def packet() -> Packet:
    return Packet(
        drafts=[
            PacketDraft(
                scheme_id="str_2026",
                filename="str.pdf",
                blob_bytes_b64="A" * 200,
            ),
        ],
        generated_at=datetime(2026, 5, 12),
    )


# ---------------------------------------------------------------------------
# Length contracts
# ---------------------------------------------------------------------------


def test_all_lay_events_within_size_limits(
    classification: HouseholdClassification,
    matches: list[SchemeMatch],
    upside: ComputeUpsideResult,
    packet: Packet,
):
    events = [
        narrate_extract_lay(AISYAH_PROFILE, language="en"),
        narrate_classify_lay(classification, language="en"),
        narrate_match_lay(matches, language="en"),
        narrate_compute_upside_lay(upside, language="en"),
        narrate_generate_lay(packet, language="en"),
    ]
    for ev in events:
        assert ev.type == "narrative"
        assert 1 <= len(ev.headline) <= 80
        if ev.data_point is not None:
            assert len(ev.data_point) <= 40


def test_all_technical_events_have_log_lines(
    classification: HouseholdClassification,
    matches: list[SchemeMatch],
    upside: ComputeUpsideResult,
    packet: Packet,
):
    events = [
        narrate_extract_technical(AISYAH_PROFILE),
        narrate_classify_technical(classification),
        narrate_match_technical(matches),
        narrate_compute_upside_technical(upside),
        narrate_generate_technical(packet),
    ]
    for ev in events:
        assert ev.type == "technical"
        assert 1 <= len(ev.log_lines) <= 20
        # Timestamps are ISO-8601; sanity-check by parsing.
        datetime.fromisoformat(ev.timestamp)


# ---------------------------------------------------------------------------
# PII contract
# ---------------------------------------------------------------------------


def test_extract_technical_redacts_name_and_address():
    ev = narrate_extract_technical(AISYAH_PROFILE)
    blob = " ".join(ev.log_lines)
    assert AISYAH_PROFILE.name not in blob, "Profile.name must NEVER appear in technical layer"
    if AISYAH_PROFILE.address:
        assert AISYAH_PROFILE.address not in blob
    assert "******-" in blob  # masked ic_last6 only


def test_extract_technical_carries_only_masked_ic():
    ev = narrate_extract_technical(AISYAH_PROFILE)
    blob = " ".join(ev.log_lines)
    # Specifically: NEVER include a 12-digit run.
    import re

    twelve_digit = re.compile(r"\b\d{12}\b")
    assert not twelve_digit.search(blob)
    # Last-6 (masked as `PB-####`) is OK.
    expected = f"{AISYAH_PROFILE.ic_last6[:2]}-{AISYAH_PROFILE.ic_last6[2:]}"
    assert expected in blob


# ---------------------------------------------------------------------------
# Localisation coverage
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("language", ["en", "ms", "zh"])
def test_lay_headlines_localise_per_language(
    language,
    classification: HouseholdClassification,
    matches: list[SchemeMatch],
    upside: ComputeUpsideResult,
    packet: Packet,
):
    events = [
        narrate_extract_lay(AISYAH_PROFILE, language=language),
        narrate_classify_lay(classification, language=language),
        narrate_match_lay(matches, language=language),
        narrate_compute_upside_lay(upside, language=language),
        narrate_generate_lay(packet, language=language),
    ]
    headlines = [e.headline for e in events]
    assert len(set(headlines)) == 5  # each step has its own unique headline
    if language == "en":
        assert "Read" in events[0].headline
    elif language == "ms":
        assert "Membaca" in events[0].headline
    elif language == "zh":
        assert "已" in events[0].headline


# ---------------------------------------------------------------------------
# Match technical surfacing
# ---------------------------------------------------------------------------


def test_match_technical_surfaces_per_scheme_decision(matches: list[SchemeMatch]):
    ev = narrate_match_technical(matches)
    blob = "\n".join(ev.log_lines)
    assert "str_2026" in blob
    assert "jkm_warga_emas" in blob
    assert "qualifying=2" in blob
    # Citation reference is surfaced when present.
    assert "risalah-str-2026.pdf" in blob


def test_compute_upside_technical_surfaces_stdout_excerpt(upside: ComputeUpsideResult):
    ev = narrate_compute_upside_technical(upside)
    blob = " ".join(ev.log_lines)
    # First non-empty stdout line is surfaced.
    assert "STR 2026: RM 2500" in blob
    assert "stdout_chars=" in blob
