"""BAP — Bantuan Awal Persekolahan (Back-to-school cash, MOE).

RM150 per school-age child paid annually each January, administered by the
Ministry of Education. Budget 2026 made BAP universal — eligibility no
longer income-gated. Covers students in government / government-aided /
registered private schools, Year 1 through Form 6 (roughly age 6–18).

Eligibility (Layak's mapping):
    Any `dependants[*]` with `relationship == "child"` AND `age` in
    [SCHOOL_AGE_MIN, SCHOOL_AGE_MAX]. Universal in 2026 (no income gate).

Benefit:
    RM150 × number of qualifying school-age child dependants, paid Jan.
    `annual_rm` = direct cash payout — sums into the headline upside.
"""

from __future__ import annotations

from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

PER_CHILD_RM = 150.0
SCHOOL_AGE_MIN = 6
SCHOOL_AGE_MAX = 18

_SCHEME_ID = "bap"
_SCHEME_NAME = "BAP — Bantuan Awal Persekolahan"
_AGENCY = "KPM (Ministry of Education Malaysia)"
_PORTAL_URL = "https://www.moe.gov.my/bantuan-awal-persekolahan"
_SOURCE_PDF = "bap-2026-circular.pdf"


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="bap.rate_2026",
            source_pdf=_SOURCE_PDF,
            page_ref="MKN BAP 2026 announcement (23 Dec 2025)",
            passage=(
                "Bantuan Awal Persekolahan 2026 (BAP) for Year 1 through Form 6 "
                "is distributed from 11 January 2026 at RM150 per child, "
                "regardless of parental income."
            ),
            source_url="https://www.mkn.gov.my/web/ms/2025/12/23/bantuan-awal-persekolahan-bap-tahun-2026/",
        ),
        RuleCitation(
            rule_id="bap.universal_2026",
            source_pdf=_SOURCE_PDF,
            page_ref="MOE Bantuan Awal Persekolahan portal (fallback link)",
            passage=(
                "Budget 2026 expanded BAP to all ~5.2 million primary/secondary "
                "students plus ~100,000 Form 6 students nationwide."
            ),
            source_url="https://www.moe.gov.my/bantuan-awal-persekolahan",
        ),
    ]


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    school_children = [
        d
        for d in profile.dependants
        if d.relationship == "child" and SCHOOL_AGE_MIN <= d.age <= SCHOOL_AGE_MAX
    ]
    qualifies = bool(school_children)

    if not qualifies:
        reasons = [
            out_of_scope_reason(
                "bap_no_school_age_child",
                language,
                min_age=SCHOOL_AGE_MIN,
                max_age=SCHOOL_AGE_MAX,
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

    child_count = len(school_children)
    annual_rm = PER_CHILD_RM * child_count
    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        child_count=child_count,
        per_child_rm=PER_CHILD_RM,
        annual_rm=annual_rm,
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
