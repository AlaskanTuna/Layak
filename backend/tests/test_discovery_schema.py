"""Smoke tests for the Phase 11 discovery schemas + source allowlist load."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.agents.tools.source_watcher import (
    hash_content,
    load_discovery_sources,
)
from app.schema.discovery import (
    CandidateRecord,
    ChangedSource,
    DiscoverySource,
    SchemeCandidate,
    SourceCitation,
)


def test_load_discovery_sources_allowlist():
    """All 7 v1 seed sources load + Pydantic-validate cleanly.

    Source IDs are aligned to the canonical SchemeId Literal so the watcher
    can use `source.id` directly as the `verified_schemes` doc key on approve.
    """
    sources = load_discovery_sources()
    assert len(sources) >= 7
    ids = {s.id for s in sources}
    expected = {
        "str_2026",
        "bk_01",
        "jkm_warga_emas",
        "jkm_bkk",
        "lhdn_form_b",
        "i_saraan",
        "perkeso_sksps",
    }
    assert expected <= ids
    for src in sources:
        assert src.url.startswith("https://"), f"{src.id} url not https"
        assert src.check_frequency_hours > 0


def test_scheme_candidate_requires_citation():
    """SchemeCandidate has no default citation — extractor MUST populate it."""
    with pytest.raises(ValidationError):
        SchemeCandidate(  # type: ignore[call-arg]
            candidate_id="x",
            source_id="str_2026",
            name="Test",
            agency="MOF",
            eligibility_summary="e",
            rate_summary="r",
            source_url="https://example.test",
            source_content_hash="abc",
            extracted_at=datetime.now(UTC),
            confidence=0.9,
        )


def test_scheme_candidate_rejects_unknown_scheme_id():
    """SchemeId Literal narrows; non-matching values must be None, not free strings."""
    with pytest.raises(ValidationError):
        SchemeCandidate(
            candidate_id="x",
            source_id="str_2026",
            scheme_id="not_a_real_scheme",  # type: ignore[arg-type]
            name="Test",
            agency="MOF",
            eligibility_summary="e",
            rate_summary="r",
            citation=SourceCitation(source_url="https://example.test", snippet="snip"),
            source_url="https://example.test",
            source_content_hash="abc",
            extracted_at=datetime.now(UTC),
            confidence=0.9,
        )


def test_scheme_candidate_brand_new_allowed():
    """`scheme_id=None` is valid — represents a brand-new scheme."""
    cand = SchemeCandidate(
        candidate_id="x",
        source_id="some_new_source",
        scheme_id=None,
        name="Brand-new scheme",
        agency="GOV",
        eligibility_summary="...",
        rate_summary="...",
        citation=SourceCitation(source_url="https://example.test", snippet="snip"),
        source_url="https://example.test",
        source_content_hash="abc",
        extracted_at=datetime.now(UTC),
        confidence=0.9,
    )
    assert cand.scheme_id is None


def test_changed_source_round_trip():
    src = DiscoverySource(
        id="x",
        name="x",
        agency="x",
        url="https://example.test",
        content_selector=None,
        check_frequency_hours=24,
    )
    changed = ChangedSource(
        source=src,
        content="hello",
        content_hash=hash_content("hello"),
        previous_hash=None,
        fetched_at=datetime.now(UTC),
    )
    assert changed.content_hash == hash_content("hello")


def test_candidate_record_default_status_pending():
    cand = SchemeCandidate(
        candidate_id="x",
        source_id="str_2026",
        scheme_id="str_2026",
        name="Test",
        agency="MOF",
        eligibility_summary="e",
        rate_summary="r",
        citation=SourceCitation(source_url="https://example.test", snippet="snip"),
        source_url="https://example.test",
        source_content_hash="abc",
        extracted_at=datetime.now(UTC),
        confidence=0.9,
    )
    record = CandidateRecord(candidate=cand)
    assert record.status == "pending"
    assert record.reviewed_at is None


def test_hash_content_deterministic():
    assert hash_content("a") == hash_content("a")
    assert hash_content("a") != hash_content("b")
