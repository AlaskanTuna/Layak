"""`match_schemes` FunctionTool — delegates to the rule engine.

Each scheme's dedicated module (`app.rules.str_2026`, `app.rules.jkm_warga_emas`,
`app.rules.lhdn_form_b`) exposes a `match(profile) -> SchemeMatch`. This tool
composes them and filters out non-qualifying matches so the frontend ranked
list only surfaces the schemes the profile actually qualifies for.
"""

from __future__ import annotations

from app.rules import (
    bantuan_elektrik,
    bap,
    budi95,
    i_saraan,
    i_suri,
    jkm_bkk,
    jkm_warga_emas,
    lhdn_form_b,
    mykasih,
    mysalam,
    peka_b40,
    perkeso_sksps,
    rmt,
    sara,
    str_2026,
)
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import SchemeMatch

_RULES = (
    str_2026,
    jkm_warga_emas,
    jkm_bkk,
    lhdn_form_b,
    i_saraan,
    perkeso_sksps,
    budi95,
    mykasih,
    peka_b40,
    bap,
    bantuan_elektrik,
    i_suri,
    mysalam,
    sara,
    rmt,
)


async def match_schemes(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> list[SchemeMatch]:
    """Match a profile to eligible schemes with rule citations.

    Returns only qualifying `SchemeMatch`es, sorted descending by `annual_rm`
    so the highest-upside schemes render first in the ranked list.
    Non-qualifying matches are filtered out — the frontend can still render
    out-of-scope schemes as `Checking… (v2)` cards.

    Required-contribution matches (SKSPS) and subsidy-credit matches (BUDI95,
    MyKasih) appear in this list too with `annual_rm=0.0`. The frontend
    filters on `kind` to render them in distinct UI blocks; `compute_upside`
    sums `annual_rm` so the zeros keep upside math correct without a second
    filter there.

    `language` threads into each rule's `match()` so the human-readable
    `summary` + `why_qualify` strings render in the user's language.
    """
    results = [module.match(profile, language=language) for module in _RULES]
    qualifying = [m for m in results if m.qualifies]
    # Three-tier sort: upside first (descending by annual_rm), then
    # subsidy_credit (info-only — user RECEIVES benefit, no payment),
    # then required_contribution at the bottom (user PAYS). Within each
    # bucket, descending annual_rm. Python's sort is stable so original
    # iteration order is preserved within ties (both subsidy_credit and
    # required_contribution have annual_rm=0.0).
    kind_order = {"upside": 0, "subsidy_credit": 1, "required_contribution": 2}
    qualifying.sort(key=lambda m: (kind_order.get(m.kind, 3), -m.annual_rm))
    return qualifying
