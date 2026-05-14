"""KWSP i-Suri — government RM300/year EPF top-up for housewives.

i-Suri is EPF's voluntary-contribution scheme for housewives registered
in eKasih. The government adds a 50% incentive (capped RM300/year, lifetime
cap RM3,000) on top of the housewife's voluntary contribution. Budget 2026
raised the age cap from 55 to 60.

Eligibility (Layak's proxy):
    A `dependants[*]` with `relationship == "spouse"` AND
    `monthly_income_rm` is `None` or `0.0` (zero-income spouse — the
    "isteri tidak bekerja" cohort). We cannot directly verify eKasih
    registration; the rule surfaces the scheme as eligible-to-register and
    points the user at the KWSP portal for the final check.

Benefit:
    Government incentive RM300/year if spouse contributes ≥ RM600/year
    voluntarily. Counts as `upside` because the RM300 is direct EPF
    credit to the spouse's account.
"""

from __future__ import annotations

from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

ANNUAL_INCENTIVE_RM = 300.0
LIFETIME_CAP_RM = 3000.0
MIN_AGE = 18
MAX_AGE = 60

_SCHEME_ID = "i_suri"
_SCHEME_NAME = "KWSP i-Suri — Housewife EPF Top-Up"
_AGENCY = "KWSP (Kumpulan Wang Simpanan Pekerja)"
_PORTAL_URL = "https://www.kwsp.gov.my/en/member/savings/i-suri"
_SOURCE_PDF = "kwsp-i-suri-incentive.pdf"


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="i_suri.incentive_cap",
            source_pdf=_SOURCE_PDF,
            page_ref="KWSP i-Suri product page",
            passage=(
                "Women registered under the National Poverty Data Bank (eKasih) "
                "may contribute under i-Suri and receive a Special Incentive of "
                "up to RM300 per year, subject to a lifetime maximum of RM3,000."
            ),
            source_url="https://www.kwsp.gov.my/en/member/savings/i-suri",
        ),
        RuleCitation(
            rule_id="i_suri.budget_2026_age_uplift",
            source_pdf=_SOURCE_PDF,
            page_ref="KWSP Budget 2026 enhancements notice",
            passage=(
                "Budget 2026 raised the i-Suri age cap from 55 to 60, aligning "
                "with the broader retirement-savings policy direction."
            ),
            source_url="https://www.kwsp.gov.my/en/w/news/epf-policy-product-enhancements-2026",
        ),
    ]


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    eligible_spouses = [
        d
        for d in profile.dependants
        if d.relationship == "spouse"
        and (d.monthly_income_rm is None or d.monthly_income_rm == 0.0)
        and MIN_AGE <= d.age <= MAX_AGE
    ]
    qualifies = bool(eligible_spouses)

    if not qualifies:
        reasons = [
            out_of_scope_reason(
                "i_suri_no_zero_income_spouse",
                language,
                min_age=MIN_AGE,
                max_age=MAX_AGE,
            )
        ]
        copy = scheme_copy(_SCHEME_ID, "out_of_scope", language, reasons=reasons)
        return SchemeMatch(
            scheme_id=_SCHEME_ID,
            scheme_name=_SCHEME_NAME,
            qualifies=False,
            annual_rm=0.0,
            summary=copy["summary"],
            why_qualify=copy["why_qualify"],
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
        )

    spouse = eligible_spouses[0]
    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        spouse_age=spouse.age,
        annual_incentive_rm=ANNUAL_INCENTIVE_RM,
        lifetime_cap_rm=LIFETIME_CAP_RM,
        max_age=MAX_AGE,
    )
    return SchemeMatch(
        scheme_id=_SCHEME_ID,
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=ANNUAL_INCENTIVE_RM,
        summary=copy["summary"],
        why_qualify=copy["why_qualify"],
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
    )
