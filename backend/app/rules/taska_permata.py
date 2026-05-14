"""TASKA Permata — KPWKM preschool fee subsidy (TASKA / TADIKA Permata).

Jabatan Permata under KPWKM (Ministry of Women, Family & Community
Development) operates TASKA Permata (childcare, 0-4yo) and TADIKA Permata
(preschool, 4-6yo) with means-tested fee subsidies for low- and
middle-income households (gross household income ≤ RM5,000/month).

Eligibility (Layak's proxy):
    `household_monthly_income_rm <= INCOME_CAP_RM` AND at least one
    `dependants[*]` with `relationship == "child"` AND `age` in
    [PRESCHOOL_AGE_MIN, PRESCHOOL_AGE_MAX]. Operator availability is
    geography-dependent (urban + sub-urban primarily); Layak surfaces
    eligibility, the parent confirms operator presence via the Permata
    directory.

Benefit:
    Up to RM180/month fee subsidy per child. Annualised at 11 school
    months ≈ RM1,980/year/child. Counts as `upside`.
"""

from __future__ import annotations

from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

PRESCHOOL_AGE_MIN = 0
PRESCHOOL_AGE_MAX = 6
INCOME_CAP_RM = 5000.0
MONTHLY_SUBSIDY_RM = 180.0
SUBSIDY_MONTHS_PER_YEAR = 11

_SCHEME_ID = "taska_permata"
_SCHEME_NAME = "TASKA Permata — KPWKM Preschool Subsidy"
_AGENCY = "KPWKM (Ministry of Women, Family & Community Development) — Jabatan Permata"
_PORTAL_URL = "https://permata.gov.my"
_SOURCE_PDF = "taska-permata-circular.pdf"


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="taska_permata.subsidy_rate",
            source_pdf=_SOURCE_PDF,
            page_ref="Jabatan Permata operator framework",
            passage=(
                "Up to RM180/month fee subsidy is paid per child enrolled at "
                "a registered TASKA Permata (0-4yo) or TADIKA Permata (4-6yo) "
                "for households with gross monthly income at or below "
                "RM5,000."
            ),
            source_url="https://permata.gov.my",
        ),
        RuleCitation(
            rule_id="taska_permata.scope_ministry",
            source_pdf=_SOURCE_PDF,
            page_ref="KPWKM ministry portfolio",
            passage=(
                "Jabatan Permata operates the subsidy framework under the "
                "Ministry of Women, Family & Community Development. Permata "
                "operators are listed in the public directory; subsidy is "
                "applied at the centre, not centrally."
            ),
            source_url="https://www.kpwkm.gov.my",
        ),
    ]


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    household_income = profile.household_income_rm
    income_eligible = household_income <= INCOME_CAP_RM
    preschool_children = [
        d
        for d in profile.dependants
        if d.relationship == "child" and PRESCHOOL_AGE_MIN <= d.age <= PRESCHOOL_AGE_MAX
    ]
    qualifies = income_eligible and bool(preschool_children)

    if not qualifies:
        reasons: list[str] = []
        if not income_eligible:
            reasons.append(
                out_of_scope_reason(
                    "taska_permata_income_above_cap",
                    language,
                    household_income=household_income,
                    cap=INCOME_CAP_RM,
                )
            )
        if not preschool_children:
            reasons.append(
                out_of_scope_reason(
                    "taska_permata_no_preschool_child",
                    language,
                    min_age=PRESCHOOL_AGE_MIN,
                    max_age=PRESCHOOL_AGE_MAX,
                )
            )
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

    child_count = len(preschool_children)
    annual_rm = MONTHLY_SUBSIDY_RM * SUBSIDY_MONTHS_PER_YEAR * child_count
    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        child_count=child_count,
        monthly_subsidy_rm=MONTHLY_SUBSIDY_RM,
        annual_rm=annual_rm,
        household_income=household_income,
    )
    return SchemeMatch(
        scheme_id=_SCHEME_ID,
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=annual_rm,
        summary=copy["summary"],
        why_qualify=copy["why_qualify"],
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
    )
