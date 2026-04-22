"""`match_schemes` FunctionTool — delegates to the rule engine.

Phase 1 Task 4 replaces the Task 1 stub with real rule-engine delegation. Each
scheme's dedicated module (`app.rules.str_2026`, `app.rules.jkm_warga_emas`,
`app.rules.lhdn_form_b`) exposes a `match(profile) -> SchemeMatch`. This tool
composes the three and filters out non-qualifying matches so the frontend
ranked list only surfaces the schemes the profile actually qualifies for.
"""

from __future__ import annotations

from app.rules import jkm_bkk, jkm_warga_emas, lhdn_form_b, str_2026
from app.schema.profile import Profile
from app.schema.scheme import SchemeMatch

_RULES = (str_2026, jkm_warga_emas, jkm_bkk, lhdn_form_b)


async def match_schemes(profile: Profile) -> list[SchemeMatch]:
    """Match a profile to eligible schemes with rule citations.

    Returns only qualifying `SchemeMatch`es, sorted descending by `annual_rm` so
    the highest-upside schemes render first in the ranked list (docs/prd.md FR-6).
    Non-qualifying matches are filtered out — the frontend can still render
    out-of-scope schemes as `Checking… (v2)` cards per docs/prd.md §6.2.
    """
    results = [module.match(profile) for module in _RULES]
    qualifying = [m for m in results if m.qualifies]
    qualifying.sort(key=lambda m: m.annual_rm, reverse=True)
    return qualifying
