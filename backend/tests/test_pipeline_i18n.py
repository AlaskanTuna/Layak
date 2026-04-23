"""End-to-end Phase 9 pipeline-language integration test.

Parameterised over `en`/`ms`/`zh`, asserts that for a realistic qualifying
profile (Aisyah), the pipeline's user-visible text flips to the selected
language at every layer:

  - `SchemeMatch.summary` + `SchemeMatch.why_qualify` (rule engine)
  - `ErrorEvent.message` humanisation path (backend)
  - (classify notes + compute_upside stdout go through live Gemini and are
     covered by manual diagnostic scripts — not in CI.)

Gemini live calls are NOT exercised here. The rule engine is pure Python and
the error humaniser is pure Python; both need no mock.
"""

from __future__ import annotations

import pytest

from app.agents.gemini import ERROR_CATEGORY_MESSAGES, humanize_error
from app.fixtures.aisyah import AISYAH_PROFILE
from app.rules import i_saraan, jkm_bkk, jkm_warga_emas, lhdn_form_b, perkeso_sksps, str_2026

_ALL_LANGS = ("en", "ms", "zh")


@pytest.mark.parametrize("language", _ALL_LANGS)
def test_rule_engine_emits_localised_why_qualify_for_aisyah(language: str) -> None:
    """Every qualifying rule emits `why_qualify` in the chosen language."""
    # Rules route through `match(profile, *, language=...)` in Phase 9.
    matches = [
        str_2026.match(AISYAH_PROFILE, language=language),
        jkm_warga_emas.match(AISYAH_PROFILE, language=language),
        jkm_bkk.match(AISYAH_PROFILE, language=language),
        lhdn_form_b.match(AISYAH_PROFILE, language=language),
        i_saraan.match(AISYAH_PROFILE, language=language),
        perkeso_sksps.match(AISYAH_PROFILE, language=language),
    ]
    qualifying = [m for m in matches if m.qualifies]
    assert qualifying, "Aisyah profile should match at least one rule"

    # Every qualifying match's why_qualify + summary must be non-empty and
    # language-consistent. We check for a language-signature token to catch
    # accidental English fallback.
    for match in qualifying:
        text = (match.summary + " " + match.why_qualify).lower()
        if language == "ms":
            assert any(tok in text for tok in ("anda", "isi rumah", "pendapatan", "umur")), (
                f"{match.scheme_id}/ms has no BM signature: {text[:120]}"
            )
        elif language == "zh":
            combined = match.summary + " " + match.why_qualify
            assert any(c in combined for c in "家庭收入申请税"), (
                f"{match.scheme_id}/zh has no Chinese-character signature: {combined[:120]}"
            )
        else:
            assert "you" in text or "your" in text or "filer" in text or "income" in text, (
                f"{match.scheme_id}/en has no English signature: {text[:120]}"
            )


@pytest.mark.parametrize("language", _ALL_LANGS)
def test_humanize_error_returns_language_specific_copy(language: str) -> None:
    """Phase 9 — the SSE ErrorEvent.message must track the user's language."""
    raw = "ClientError: 429 RESOURCE_EXHAUSTED"
    message, category = humanize_error(raw, language=language)
    assert category == "quota_exhausted"
    assert message == ERROR_CATEGORY_MESSAGES[language]["quota_exhausted"]


def test_humanize_error_falls_back_to_english_for_bad_language() -> None:
    """Defence: if something slips an unsupported language through, English
    copy renders rather than the function exploding."""
    raw = "ClientError: 429 RESOURCE_EXHAUSTED"
    message, _ = humanize_error(raw, language="fr")  # type: ignore[arg-type]
    assert message == ERROR_CATEGORY_MESSAGES["en"]["quota_exhausted"]


def test_rule_match_is_language_neutral_for_numbers() -> None:
    """Only human-readable text changes per language — the numeric outputs
    (annual_rm, qualifies) must be identical so persisted evaluation docs
    can be re-read across languages without drift.
    """
    en = str_2026.match(AISYAH_PROFILE, language="en")
    ms = str_2026.match(AISYAH_PROFILE, language="ms")
    zh = str_2026.match(AISYAH_PROFILE, language="zh")
    assert en.qualifies == ms.qualifies == zh.qualifies
    assert en.annual_rm == ms.annual_rm == zh.annual_rm
    assert en.scheme_id == ms.scheme_id == zh.scheme_id
    # Strings differ.
    assert en.why_qualify != ms.why_qualify
    assert en.why_qualify != zh.why_qualify
    assert ms.why_qualify != zh.why_qualify
