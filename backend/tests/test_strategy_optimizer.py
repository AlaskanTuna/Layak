"""Phase 11 Feature 2 — Cross-Scheme Strategy Optimizer smoke tests.

Asserts the deterministic grounding layers (1, 2, 5) without requiring a
live Gemini call: the trip filter is pure Python, the schema validator
rejects malformed records, and the confidence floor drops weak output.

Layer 4 (few-shot prompt) is exercised by inspection — `optimizer_prompt.py`
imports cleanly and the registered example interaction_ids resolve to the
shipped YAML rules.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.agents.optimizer_prompt import FEW_SHOT_BLOCK
from app.agents.tools.optimize_strategy import (
    _CONFIDENCE_FLOOR,
    _rule_trips,
    _validate_and_filter,
    load_scheme_interactions,
)
from app.schema.profile import HouseholdClassification, Profile
from app.schema.strategy import (
    SchemeInteractionRule,
    StrategyAdvice,
    StrategyCitation,
)


@pytest.fixture(scope="module")
def interactions() -> list[SchemeInteractionRule]:
    return load_scheme_interactions()


def _classification_for(profile: Profile) -> HouseholdClassification:
    flags = profile.household_flags
    return HouseholdClassification(
        has_children_under_18=flags.has_children_under_18,
        has_elderly_dependant=flags.has_elderly_dependant,
        income_band=flags.income_band,
        per_capita_monthly_rm=round(profile.monthly_income_rm / profile.household_size, 2),
        notes=[],
    )


# ---------------------------------------------------------------------------
# Registry contract
# ---------------------------------------------------------------------------


def test_yaml_registry_loads_three_rules(interactions: list[SchemeInteractionRule]):
    assert len(interactions) >= 3
    ids = {r.id for r in interactions}
    assert {
        "lhdn_dependent_parent_single_claimer",
        "i_saraan_liquidity_tradeoff",
        "lhdn_spouse_relief_filing_status",
    } <= ids


def test_every_rule_cites_a_pdf_that_exists(interactions: list[SchemeInteractionRule]):
    schemes_dir = Path(__file__).resolve().parent.parent / "data" / "schemes"
    present = {p.name for p in schemes_dir.glob("*.pdf")}
    for rule in interactions:
        assert rule.citation.pdf in present, f"{rule.id} cites {rule.citation.pdf} which is missing"


def test_few_shot_examples_reference_registry_ids(interactions: list[SchemeInteractionRule]):
    """The hand-written few-shot block (Layer 4) anchors the model on real
    interaction_ids — verify every id in the block resolves to the YAML."""
    registry_ids = {r.id for r in interactions}
    for token in (
        "lhdn_dependent_parent_single_claimer",
        "i_saraan_liquidity_tradeoff",
        "lhdn_spouse_relief_filing_status",
    ):
        assert token in FEW_SHOT_BLOCK, f"few-shot prompt missing example for {token}"
        assert token in registry_ids


# ---------------------------------------------------------------------------
# Trip filter (deterministic Python pre-gate)
# ---------------------------------------------------------------------------


def test_aisyah_trips_dependent_parent_rule(
    aisyah: Profile, interactions: list[SchemeInteractionRule]
):
    """Aisyah has elderly dependant + form_b — should trip the LHDN
    dependent-parent rule even with sibling-filing-status unknown."""
    classification = _classification_for(aisyah)
    rule = next(r for r in interactions if r.id == "lhdn_dependent_parent_single_claimer")
    assert _rule_trips(
        rule,
        profile=aisyah,
        classification=classification,
        matched_ids={"str_2026", "lhdn_form_b"},
    )


def test_aisyah_trips_i_saraan_when_matched(
    aisyah: Profile, interactions: list[SchemeInteractionRule]
):
    """Aisyah's monthly income (2800) is below the 3500 threshold and
    i_saraan is in the matched set."""
    classification = _classification_for(aisyah)
    rule = next(r for r in interactions if r.id == "i_saraan_liquidity_tradeoff")
    assert _rule_trips(
        rule,
        profile=aisyah,
        classification=classification,
        matched_ids={"i_saraan", "str_2026"},
    )


def test_aisyah_does_not_trip_i_saraan_when_not_matched(
    aisyah: Profile, interactions: list[SchemeInteractionRule]
):
    """When the user doesn't qualify for i_saraan, the trade-off advisory
    is suppressed even though the income gate is met."""
    classification = _classification_for(aisyah)
    rule = next(r for r in interactions if r.id == "i_saraan_liquidity_tradeoff")
    assert not _rule_trips(
        rule,
        profile=aisyah,
        classification=classification,
        matched_ids={"str_2026"},
    )


def test_spouse_relief_trips_for_form_b_filer(
    aisyah: Profile, interactions: list[SchemeInteractionRule]
):
    """form_b filer with unknown spouse status — should trip."""
    classification = _classification_for(aisyah)
    rule = next(r for r in interactions if r.id == "lhdn_spouse_relief_filing_status")
    assert _rule_trips(
        rule,
        profile=aisyah,
        classification=classification,
        matched_ids={"lhdn_form_b"},
    )


# ---------------------------------------------------------------------------
# Schema validation + Layer 1 registry membership
# ---------------------------------------------------------------------------


def _stub_advice(interaction_id: str, confidence: float = 0.9) -> dict:
    return {
        "advice_id": "abc123",
        "interaction_id": interaction_id,
        "severity": "warn",
        "headline": "Test headline",
        "rationale": "Test rationale.",
        "citation": {"pdf": "pr-no-4-2024.pdf", "section": "§5.2", "page": 12},
        "confidence": confidence,
        "suggested_chat_prompt": "Ask Cik Lay something",
        "applies_to_scheme_ids": ["lhdn_form_b"],
    }


def test_validator_drops_unknown_interaction_id():
    """Layer 1 — interaction_id must exist in the triggered set."""
    record = _stub_advice("not_a_real_rule")
    survivors = _validate_and_filter([record], triggered_ids={"lhdn_dependent_parent_single_claimer"})
    assert survivors == []


def test_validator_drops_confidence_below_floor():
    """Layer 5 floor — < 0.5 records never reach the frontend."""
    record = _stub_advice("lhdn_dependent_parent_single_claimer", confidence=0.49)
    survivors = _validate_and_filter(
        [record], triggered_ids={"lhdn_dependent_parent_single_claimer"}
    )
    assert survivors == []


def test_validator_keeps_valid_record():
    record = _stub_advice("lhdn_dependent_parent_single_claimer", confidence=0.86)
    survivors = _validate_and_filter(
        [record], triggered_ids={"lhdn_dependent_parent_single_claimer"}
    )
    assert len(survivors) == 1
    assert survivors[0].interaction_id == "lhdn_dependent_parent_single_claimer"


def test_validator_caps_at_three_records():
    """Spec §3.7 — no more than 3 cards ever rendered."""
    records = [_stub_advice("lhdn_dependent_parent_single_claimer") for _ in range(5)]
    survivors = _validate_and_filter(
        records, triggered_ids={"lhdn_dependent_parent_single_claimer"}
    )
    assert len(survivors) == 3


def test_strategy_advice_rejects_overlength_headline():
    """Layer 2 — Pydantic max_length on headline (80) fires on raw construction."""
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        StrategyAdvice(
            advice_id="x",
            interaction_id="x",
            severity="info",
            headline="x" * 81,
            rationale="x",
            citation=StrategyCitation(pdf="a.pdf"),
            confidence=0.9,
        )


def test_confidence_floor_constant_unchanged():
    """Pin the floor to 0.5 so a refactor doesn't accidentally loosen the guard."""
    assert _CONFIDENCE_FLOOR == 0.5
