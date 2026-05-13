"""Tests for `app.agents.chat_prompt` — eval-context digest + system instruction.

Hallucination control is the entire selling point of Phase 10. The system
prompt enforces five hard rules; these tests assert the rules are present
in each language and the privacy invariant (no full IC) holds across every
realistic doc shape.
"""

from __future__ import annotations

import re
from typing import Any

import pytest

from app.agents.chat_prompt import (
    MAX_DIGEST_CHARS,
    build_system_instruction,
    qualifying_scheme_ids,
    render_eval_digest,
)


def _aisyah_eval_doc() -> dict[str, Any]:
    """Synthetic Firestore eval-doc shape — Aisyah persona, qualifying for STR + JKM."""
    return {
        "userId": "uid-aisyah",
        "status": "complete",
        "totalAnnualRM": 8208.0,
        "profile": {
            "name": "AISYAH BINTI AHMAD",
            "age": 34,
            "monthly_income_rm": 2800.0,
            "household_size": 4,
            "form_type": "form_b",
            "dependants": [
                {"relationship": "child", "age": 8},
                {"relationship": "child", "age": 11},
                {"relationship": "parent", "age": 70},
            ],
            "household_flags": {"income_band": "b40_household_with_children"},
        },
        "matches": [
            {
                "scheme_id": "str_2026",
                "scheme_name": "STR 2026 — Household with children tier",
                "qualifies": True,
                "annual_rm": 1700.0,
                "agency": "LHDN (HASiL)",
                "why_qualify": "Household income RM2,800 with 2 children under 18.",
                "kind": "upside",
            },
            {
                "scheme_id": "jkm_warga_emas",
                "scheme_name": "JKM Warga Emas — elderly dependant assistance",
                "qualifies": True,
                "annual_rm": 6000.0,
                "agency": "JKM",
                "why_qualify": "One parent dependant aged 70.",
                "kind": "upside",
            },
            {
                "scheme_id": "i_saraan",
                "scheme_name": "i-Saraan",
                "qualifies": False,
                "annual_rm": 0.0,
                "agency": "KWSP",
                "kind": "upside",
            },
        ],
    }


# ---------------------------------------------------------------------------
# Privacy invariant — full IC must NEVER appear in the digest
# ---------------------------------------------------------------------------


_FULL_IC_RE = re.compile(r"\b\d{6}[\s-]?\d{2}[\s-]?\d{4}\b|\b\d{12}\b")


@pytest.mark.parametrize("language", ["en", "ms", "zh"])
def test_digest_never_emits_full_ic(language: str) -> None:
    """Phase 12: the stored profile no longer carries any IC field, and the
    digest renderer reads only whitelisted keys. Even if a future schema
    regression smuggles `ic` / `ic_last6` / `ic_full` onto the doc, none of
    them survive into the digest."""
    doc = _aisyah_eval_doc()
    # Hostile injection — pretend a future doc shape leaks IC information
    # in three different shapes. None of them should reach the digest.
    doc["profile"]["ic"] = "900324-06-4321"
    doc["profile"]["ic_full"] = "900324064321"
    doc["profile"]["ic_last6"] = "064321"
    digest = render_eval_digest(doc, language=language)  # type: ignore[arg-type]
    assert _FULL_IC_RE.search(digest) is None, (
        f"Full IC leaked into {language} digest: {digest[:200]}"
    )
    # The 6-digit tail must NOT appear either — Phase 12 dropped all IC
    # surfacing from the digest renderer.
    assert "064321" not in digest


# ---------------------------------------------------------------------------
# Citation contract — scheme_ids must appear verbatim so the model can cite them
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("language", ["en", "ms", "zh"])
def test_digest_carries_qualifying_scheme_ids_verbatim(language: str) -> None:
    digest = render_eval_digest(_aisyah_eval_doc(), language=language)  # type: ignore[arg-type]
    assert "[scheme:str_2026]" in digest
    assert "[scheme:jkm_warga_emas]" in digest
    # Out-of-scope schemes are listed separately so the model knows the user
    # does NOT qualify for them — they should still appear by id.
    assert "[scheme:i_saraan]" in digest


def test_qualifying_scheme_ids_excludes_out_of_scope() -> None:
    ids = qualifying_scheme_ids(_aisyah_eval_doc())
    assert ids == {"str_2026", "jkm_warga_emas"}
    assert "i_saraan" not in ids


# ---------------------------------------------------------------------------
# Per-language hard-constraint enforcement
# ---------------------------------------------------------------------------


def test_system_instruction_en_carries_hard_constraints() -> None:
    text = build_system_instruction(_aisyah_eval_doc(), language="en")
    lowered = text.lower()
    # Persona identity — Cik Lay (Pegawai Skim) speaks for Layak.
    assert "cik lay" in lowered
    assert "pegawai skim" in lowered
    # Greeting discipline — stateless panel must not open with pleasantries.
    assert "greeting discipline" in lowered
    # No sign-off rule — duplicate of the persona name in the panel header.
    assert "no sign-off" in lowered
    # Markdown allowance — bold/lists/inline code expected for output formatting.
    assert "markdown is supported" in lowered
    assert "scope" in lowered  # rule 1
    assert "no legal" in lowered  # rule 2
    assert "no submission" in lowered  # rule 3
    assert "pii" in lowered  # rule 4
    assert "citation rule" in lowered  # rule 5
    # Citation rule MUST illustrate the format the output validator parses.
    assert "[scheme:" in text
    # Style guidance.
    assert "180 words" in text


def test_system_instruction_ms_carries_hard_constraints() -> None:
    text = build_system_instruction(_aisyah_eval_doc(), language="ms")
    assert "Cik Lay" in text  # persona identity in BM
    assert "Pegawai Skim" in text
    assert "Disiplin sapaan" in text  # greeting discipline in BM
    assert "Skop" in text  # rule 1 in BM
    assert "Tiada nasihat" in text  # rules 2/3 in BM
    assert "PII" in text
    assert "[scheme:" in text


def test_system_instruction_zh_carries_hard_constraints() -> None:
    text = build_system_instruction(_aisyah_eval_doc(), language="zh")
    assert "Cik Lay" in text  # persona identity carried verbatim
    assert "Pegawai Skim" in text
    assert "问候纪律" in text  # greeting discipline in ZH
    assert "范围" in text  # rule 1
    assert "法律" in text  # rule 2 (legal)
    assert "PII" in text or "身份证" in text  # rule 4
    assert "[scheme:" in text


def test_system_instruction_unknown_language_falls_back_to_english() -> None:
    text = build_system_instruction(_aisyah_eval_doc(), language="fr")  # type: ignore[arg-type]
    lowered = text.lower()
    assert "cik lay" in lowered
    assert "greeting discipline" in lowered


# ---------------------------------------------------------------------------
# Defensive — empty / malformed docs
# ---------------------------------------------------------------------------


def test_digest_handles_empty_eval_doc() -> None:
    """Pre-Phase-9 docs / malformed docs / running evals shouldn't crash."""
    digest = render_eval_digest({}, language="en")
    assert digest  # at least the headers


def test_digest_handles_no_qualifying_matches() -> None:
    doc = _aisyah_eval_doc()
    for m in doc["matches"]:
        m["qualifies"] = False
    digest = render_eval_digest(doc, language="en")
    assert "No qualifying schemes" in digest
    assert qualifying_scheme_ids(doc) == set()


def test_digest_truncates_at_max_chars() -> None:
    """A pathologically large match list must not blow Gemini's context."""
    doc = _aisyah_eval_doc()
    # Pad with hundreds of fake matches.
    doc["matches"] = doc["matches"] + [
        {
            "scheme_id": f"fake_{i}",
            "scheme_name": "X" * 200,
            "qualifies": True,
            "annual_rm": 100.0,
            "agency": "Y",
            "why_qualify": "Z" * 200,
            "kind": "upside",
        }
        for i in range(200)
    ]
    digest = render_eval_digest(doc, language="en")
    assert len(digest) <= MAX_DIGEST_CHARS
    assert digest.endswith("…")
