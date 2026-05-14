"""Phase 11 Feature 3 — What-If service unit tests.

Covers the deterministic parts of the partial-rerun flow:
  - `apply_overrides` clamps slider inputs + rebuilds dependants list
  - `compute_deltas` categorises every transition (gained / lost /
    tier_changed / amount_changed / unchanged)
  - `check_rate_limit` enforces 5 / 60s / uid for free tier and bypasses
    for pro tier

Live Gemini round-trips (classify / match / optimize_strategy) are
exercised by the existing manual-entry integration test; here we stay
unit-level so the suite stays sandbox-friendly.
"""

from __future__ import annotations

import pytest

from app.agents.tools.match import match_schemes
from app.schema.profile import Dependant, HouseholdFlags, Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.what_if import (
    WhatIfRateLimitError,
    _recent_calls,
    apply_overrides,
    check_rate_limit,
    classify_household_deterministic,
    compute_deltas,
    run_what_if_deterministic,
)


def _stub_profile() -> Profile:
    return Profile(
        name="Test Citizen",
        age=35,
        monthly_income_rm=3000.0,
        household_size=3,
        dependants=[
            Dependant(relationship="child", age=8),
            Dependant(relationship="spouse", age=33),
        ],
        household_flags=HouseholdFlags(
            has_children_under_18=True,
            has_elderly_dependant=False,
            income_band="b40_household_with_children",
        ),
        form_type="form_b",
        address=None,
    )


def _stub_match(
    scheme_id: str,
    *,
    qualifies: bool = True,
    annual_rm: float = 1000.0,
    summary: str = "stub",
) -> SchemeMatch:
    return SchemeMatch(
        scheme_id=scheme_id,  # type: ignore[arg-type]
        scheme_name=scheme_id,
        qualifies=qualifies,
        annual_rm=annual_rm,
        summary=summary,
        why_qualify="stub reason",
        agency="Stub",
        portal_url="https://example.test",
        rule_citations=[RuleCitation(rule_id="r", source_pdf="p.pdf", page_ref="p.1", passage="x")],
    )


# ---------------------------------------------------------------------------
# apply_overrides
# ---------------------------------------------------------------------------


def test_overrides_clamp_income_to_max():
    p = _stub_profile()
    out = apply_overrides(p, {"monthly_income_rm": 999_999})
    assert out.monthly_income_rm == 15_000.0


def test_overrides_clamp_income_to_min():
    p = _stub_profile()
    out = apply_overrides(p, {"monthly_income_rm": -500})
    assert out.monthly_income_rm == 0.0


def test_overrides_replace_children_count_preserves_spouse():
    p = _stub_profile()
    out = apply_overrides(p, {"dependants_count": 3})
    children = [d for d in out.dependants if d.relationship == "child"]
    spouses = [d for d in out.dependants if d.relationship == "spouse"]
    parents = [d for d in out.dependants if d.relationship == "parent"]
    assert len(children) == 3
    assert len(spouses) == 1  # preserved from baseline
    assert len(parents) == 0


def test_overrides_clamp_elderly_count():
    p = _stub_profile()
    out = apply_overrides(p, {"elderly_dependants_count": 99})
    parents = [d for d in out.dependants if d.relationship == "parent"]
    assert len(parents) == 4  # max is 4


def test_overrides_rederive_household_flags_for_zero_children():
    p = _stub_profile()
    out = apply_overrides(p, {"dependants_count": 0})
    assert out.household_flags.has_children_under_18 is False


def test_overrides_rederive_elderly_flag():
    p = _stub_profile()
    out = apply_overrides(p, {"elderly_dependants_count": 1})
    assert out.household_flags.has_elderly_dependant is True


def test_unknown_override_keys_are_silently_ignored():
    p = _stub_profile()
    out = apply_overrides(p, {"completely_made_up_field": 42})
    assert out == p  # nothing changed


def test_empty_overrides_returns_unchanged_profile():
    p = _stub_profile()
    out = apply_overrides(p, {})
    assert out == p


def test_household_size_reflects_new_dependants():
    p = _stub_profile()
    out = apply_overrides(p, {"dependants_count": 2, "elderly_dependants_count": 1})
    # 1 filer + 2 children + 1 spouse (preserved) + 1 elderly = 5
    assert out.household_size == 5


def test_deterministic_classification_uses_profile_flags_and_per_capita_income():
    profile = _stub_profile()
    classification = classify_household_deterministic(profile)
    assert classification.has_children_under_18 is True
    assert classification.has_elderly_dependant is False
    assert classification.income_band == "b40_household_with_children"
    assert classification.per_capita_monthly_rm == 1000.0


# ---------------------------------------------------------------------------
# compute_deltas
# ---------------------------------------------------------------------------


def test_delta_unchanged_when_match_is_identical():
    base = [_stub_match("str_2026", annual_rm=1500.0)]
    rerun = [_stub_match("str_2026", annual_rm=1500.0)]
    deltas = compute_deltas(base, rerun)
    assert len(deltas) == 1
    assert deltas[0].status == "unchanged"
    assert deltas[0].delta_rm == 0.0


def test_delta_gained_when_scheme_qualifies_newly():
    base: list[SchemeMatch] = []
    rerun = [_stub_match("jkm_bkk", annual_rm=3000.0)]
    deltas = compute_deltas(base, rerun)
    assert deltas[0].status == "gained"
    assert deltas[0].baseline_annual_rm is None
    assert deltas[0].new_annual_rm == 3000.0
    assert deltas[0].delta_rm == 3000.0


def test_delta_lost_when_scheme_no_longer_qualifies():
    base = [_stub_match("str_2026", annual_rm=1500.0)]
    rerun: list[SchemeMatch] = []
    deltas = compute_deltas(base, rerun)
    assert deltas[0].status == "lost"
    assert deltas[0].baseline_annual_rm == 1500.0
    assert deltas[0].new_annual_rm is None
    assert deltas[0].delta_rm == -1500.0


def test_delta_tier_changed_when_summary_differs():
    base = [_stub_match("str_2026", annual_rm=1500.0, summary="Tier 2")]
    rerun = [_stub_match("str_2026", annual_rm=2500.0, summary="Tier 1")]
    deltas = compute_deltas(base, rerun)
    assert deltas[0].status == "tier_changed"
    assert "Tier 2" in (deltas[0].note or "")
    assert "Tier 1" in (deltas[0].note or "")


def test_delta_amount_changed_with_same_summary():
    base = [_stub_match("lhdn_form_b", annual_rm=4500.0, summary="stub")]
    rerun = [_stub_match("lhdn_form_b", annual_rm=5200.0, summary="stub")]
    deltas = compute_deltas(base, rerun)
    assert deltas[0].status == "amount_changed"
    assert deltas[0].delta_rm == 700.0


# ---------------------------------------------------------------------------
# deterministic service path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_deterministic_what_if_uses_current_rule_corpus_without_suggestions(aisyah: Profile):
    baseline_matches = await match_schemes(aisyah)

    result = await run_what_if_deterministic(
        baseline_profile=aisyah,
        baseline_matches=baseline_matches,
        overrides={"monthly_income_rm": 600.0, "dependants_count": 3, "elderly_dependants_count": 1},
    )

    assert result.suggestions == []
    assert result.strategy == []
    assert result.matches
    assert all(match.qualifies for match in result.matches)
    assert {delta.scheme_id for delta in result.deltas} == {
        match.scheme_id for match in baseline_matches
    } | {match.scheme_id for match in result.matches}
    assert result.total_annual_rm == round(
        sum(match.annual_rm for match in result.matches if match.kind == "upside"),
        2,
    )


# ---------------------------------------------------------------------------
# Rate limit
# ---------------------------------------------------------------------------


def test_rate_limit_allows_five_calls_per_minute():
    _recent_calls.clear()
    for _ in range(5):
        check_rate_limit("user-a", is_pro=False)
    # Sixth call within the same window must fail.
    with pytest.raises(WhatIfRateLimitError):
        check_rate_limit("user-a", is_pro=False)


def test_rate_limit_isolates_per_uid():
    _recent_calls.clear()
    for _ in range(5):
        check_rate_limit("user-b", is_pro=False)
    # Different uid is unaffected.
    check_rate_limit("user-c", is_pro=False)


def test_pro_tier_bypasses_rate_limit():
    _recent_calls.clear()
    for _ in range(100):
        check_rate_limit("pro-user", is_pro=True)
    # No exception even after 100 calls.
