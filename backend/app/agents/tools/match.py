"""`match_schemes` FunctionTool — delegates to the rule engine.

Phase 1 Task 4 replaces the Task 1 stub with real rule-engine delegation. Each
scheme's dedicated module (`app.rules.str_2026`, `app.rules.jkm_warga_emas`,
`app.rules.lhdn_form_b`) exposes a `match(profile) -> SchemeMatch`. This tool
composes the three and filters out non-qualifying matches so the frontend
ranked list only surfaces the schemes the profile actually qualifies for.
"""

from __future__ import annotations

from app.rules import i_saraan, jkm_bkk, jkm_warga_emas, lhdn_form_b, perkeso_sksps, str_2026
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import SchemeMatch

_RULES = (str_2026, jkm_warga_emas, jkm_bkk, lhdn_form_b, i_saraan, perkeso_sksps)


async def match_schemes(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> list[SchemeMatch]:
    """Match a profile to eligible schemes with rule citations.

    Returns only qualifying `SchemeMatch`es, sorted descending by `annual_rm` so
    the highest-upside schemes render first in the ranked list (docs/prd.md FR-6).
    Non-qualifying matches are filtered out — the frontend can still render
    out-of-scope schemes as `Checking… (v2)` cards per docs/prd.md §6.2.

    Phase 7 Task 9: required-contribution matches (SKSPS) appear in this list
    too, with `kind="required_contribution"` + `annual_rm=0.0`. The frontend
    filters on `kind` to render them in a separate "Required contributions"
    block; `compute_upside` sums `annual_rm` so the zero keeps upside math
    correct without a second filter there.

    Phase 9: `language` threads into each rule's `match()` so the human-
    readable `summary` + `why_qualify` strings render in the user's language.
    """
    results = [module.match(profile, language=language) for module in _RULES]
    qualifying = [m for m in results if m.qualifies]
    # Primary sort: upside descending. Secondary sort: kind — pushes
    # required_contribution entries to the bottom when two matches tie on
    # annual_rm (SKSPS's zero would otherwise float up against a zero-upside
    # upside scheme, but in practice no upside scheme returns 0 and qualifies).
    qualifying.sort(key=lambda m: (m.kind != "upside", -m.annual_rm))
    return qualifying
