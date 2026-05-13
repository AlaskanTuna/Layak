"""Phase 11 Feature 2 — Cik Lay handoff context augmentation."""

from __future__ import annotations

from app.agents.chat_prompt import build_system_instruction
from app.schema.strategy import StrategyAdvice, StrategyCitation


def _stub_eval_doc() -> dict:
    return {
        "profile": {
            "name": "Aisyah binti Ahmad",
            "age": 34,
            "monthly_income_rm": 2800.0,
            "household_size": 4,
            "form_type": "form_b",
            "dependants": [],
            "household_flags": {
                "has_children_under_18": True,
                "has_elderly_dependant": True,
                "income_band": "b40_household_with_children",
            },
        },
        "classification": {
            "has_children_under_18": True,
            "has_elderly_dependant": True,
            "income_band": "b40_household_with_children",
            "per_capita_monthly_rm": 700.0,
            "notes": [],
        },
        "matches": [],
        "totalAnnualRM": 0.0,
        "language": "en",
    }


def _stub_advice() -> StrategyAdvice:
    return StrategyAdvice(
        advice_id="abc123",
        interaction_id="lhdn_dependent_parent_single_claimer",
        severity="warn",
        headline="Coordinate the dependent-parent relief with siblings",
        rationale="Only one filer per parent can claim. The sibling at the highest marginal bracket should claim.",
        citation=StrategyCitation(pdf="pr-no-4-2024.pdf", section="§5.2", page=12),
        confidence=0.86,
        suggested_chat_prompt="Who in my family should claim the dependent-parent relief?",
        applies_to_scheme_ids=["lhdn_form_b"],
    )


def test_build_system_instruction_omits_advisory_when_none():
    """No `recent_advisory` arg → instruction matches the legacy shape."""
    base = build_system_instruction(_stub_eval_doc(), language="en")
    assert "Recent advisory" not in base


def test_build_system_instruction_injects_advisory_block():
    advice = _stub_advice()
    with_advice = build_system_instruction(
        _stub_eval_doc(), language="en", recent_advisory=advice
    )
    assert "Recent advisory" in with_advice
    assert advice.headline in with_advice
    assert advice.rationale in with_advice
    # Citation triple flows through.
    assert "pr-no-4-2024.pdf" in with_advice
    assert "§5.2" in with_advice
    assert "p.12" in with_advice
    # Suggested prompt visible to Cik Lay.
    assert "Who in my family should claim" in with_advice


def test_advisory_block_marks_content_as_data_not_instructions():
    """Hard-anchor: the prompt MUST treat advisory strings as data so
    prompt-injection in `headline`/`rationale` can't redirect Cik Lay.
    """
    advice = _stub_advice()
    augmented = build_system_instruction(
        _stub_eval_doc(), language="en", recent_advisory=advice
    )
    assert "DATA" in augmented or "data" in augmented
