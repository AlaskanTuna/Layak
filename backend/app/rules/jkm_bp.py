"""JKM BP — Bantuan Pelajaran (JKM cash for school children).

Bantuan Pelajaran (BP) is JKM's monthly cash aid for school-age children
in households already receiving JKM main aid OR with verified hardcore
poverty. Modal rate by level: RM50/month primary, RM100/month secondary,
RM150/month post-secondary / tertiary. Layak surfaces the modal
RM100/month per qualifying school child for ranking.

Eligibility (Layak's proxy):
    `income_band == "b40_hardcore"` AND at least one `dependants[*]`
    with `relationship == "child"` AND `age` in [SCHOOL_AGE_MIN,
    SCHOOL_AGE_MAX]. The official rule also accepts "household receiving
    main JKM aid" (Warga Emas, BKK, etc.) — Layak's `b40_hardcore` proxy
    captures the dominant entry path. Households above hardcore that
    already receive JKM aid through a separate channel can apply
    directly at the JKM district office.

Benefit:
    RM100/month × school children = RM1,200/year/child. Counts as
    `upside`.
"""

from __future__ import annotations

from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

SCHOOL_AGE_MIN = 7
SCHOOL_AGE_MAX = 18
MODAL_MONTHLY_RM = 100.0  # secondary rate; primary is RM50, tertiary RM150

_SCHEME_ID = "jkm_bp"
_SCHEME_NAME = "JKM BP — Bantuan Pelajaran (school children)"
_AGENCY = "JKM (Jabatan Kebajikan Masyarakat)"
_PORTAL_URL = "https://www.jkm.gov.my"
_SOURCE_PDF = "jkm-bp-circular.pdf"


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="jkm_bp.rate_schedule",
            source_pdf=_SOURCE_PDF,
            page_ref="JKM portfolio of welfare schemes (external reference)",
            passage=(
                "Bantuan Pelajaran (BP) pays RM50/month for primary, "
                "RM100/month for secondary, and RM150/month for "
                "post-secondary or tertiary students from households "
                "registered in JKM main-aid programmes."
            ),
            source_url="https://www.jkm.gov.my",
        ),
        RuleCitation(
            rule_id="jkm_bp.ebantuan_portal",
            source_pdf=_SOURCE_PDF,
            page_ref="eBantuan JKM application portal",
            passage=(
                "Applications are made through the eBantuan JKM online portal "
                "or at the JKM district office. The school's letter of "
                "confirmation is the documentary basis for the per-child rate."
            ),
            source_url="https://ebantuanjkm.jkm.gov.my",
        ),
    ]


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    band = profile.household_flags.income_band
    is_hardcore = band == "b40_hardcore"
    school_children = [
        d
        for d in profile.dependants
        if d.relationship == "child" and SCHOOL_AGE_MIN <= d.age <= SCHOOL_AGE_MAX
    ]
    qualifies = is_hardcore and bool(school_children)

    if not qualifies:
        reasons: list[str] = []
        if not is_hardcore:
            reasons.append(
                out_of_scope_reason(
                    "jkm_bp_band_above_hardcore",
                    language,
                    band=band,
                )
            )
        if not school_children:
            reasons.append(
                out_of_scope_reason(
                    "jkm_bp_no_school_age_child",
                    language,
                    min_age=SCHOOL_AGE_MIN,
                    max_age=SCHOOL_AGE_MAX,
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

    child_count = len(school_children)
    annual_rm = MODAL_MONTHLY_RM * 12 * child_count
    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        child_count=child_count,
        monthly_rm=MODAL_MONTHLY_RM,
        annual_rm=annual_rm,
        band=band,
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
