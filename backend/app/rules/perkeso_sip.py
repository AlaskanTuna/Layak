"""PERKESO SIP — Sistem Insurans Pekerjaan (Employment Insurance System).

The Employment Insurance System (Akta 800) is PERKESO's safety net for
salaried workers who lose their job. Contributions are split 0.2% / 0.2%
between employer and employee on insured wages up to RM5,000. Benefits
trigger on involuntary loss of employment (retrenchment, voluntary
separation scheme, business closure).

Eligibility (Layak's proxy):
    `form_type == "form_be"` (salaried filer, so the employer should be
    paying EIS contributions) AND `MIN_AGE <= age <= MAX_AGE`. Layak does
    not verify the 6-months-in-24 contribution requirement directly — the
    PERKESO portal does that at claim time.

Benefits (non-cash today, surfaced as `subsidy_credit`):
    Job Search Allowance (JSA) for up to 6 months:
        - Month 1: 80% of assumed monthly wage
        - Month 2: 50%
        - Month 3: 40%
        - Months 4-6: 30%
    All capped against an assumed monthly wage of RM5,000 (max base);
    Layak rounds up to "up to RM4,000/month replacement" as the broad
    headline. Plus training allowance, reduced income allowance, and
    early re-employment allowance — all conditional on the worker's
    journey back to work.

`annual_rm = 0.0` because the SIP benefit is only realised if the user
actually loses their job. `kind="subsidy_credit"` keeps it off the
headline upside total. The card serves as a "you're already covered if
this happens" peace-of-mind reminder for salaried filers.
"""

from __future__ import annotations

from app.config import getenv
from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

MIN_AGE = 18
MAX_AGE = 60
# Insured wage ceiling raised from RM5,000 to RM6,000 effective 1 Oct 2024
# (SOCSO Contribution Table / PERKESO). The wage band determines both the
# employer/employee contribution rate AND the cap used for JSA replacement.
INSURED_WAGE_CEILING_RM = 6000.0
FIRST_MONTH_REPLACEMENT_PCT = 80
MAX_MONTHLY_REPLACEMENT_RM = 4800.0  # 80% × RM6,000 ceiling

_SCHEME_ID = "perkeso_sip"
_SCHEME_NAME = "PERKESO SIP — Sistem Insurans Pekerjaan"
_AGENCY = "PERKESO (Social Security Organisation)"
_PORTAL_URL = "https://eis.perkeso.gov.my"
_SOURCE_PDF = "perkeso-sip-coverage.pdf"

# Vertex AI Search grounds the primary citation against the live source PDF.
# URI filter constrains the snippet ranker to the expected document so the
# rule cannot accidentally cite a different scheme's PDF.
_RAG_QUERY = getenv(
    "LAYAK_RAG_QUERY_PERKESO_SIP",
    "PERKESO SIP Employment Insurance Sistem Insurans Pekerjaan",
)
_RAG_URI_SUBSTRING = "perkeso-sip-coverage.pdf"


def _citations() -> list[RuleCitation]:
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id="rag.perkeso_sip.primary",
        fallback_pdf="perkeso-sip-coverage.pdf",
    )
    if rag is not None:
        cites.append(rag)
    cites.extend([
        RuleCitation(
            rule_id="perkeso_sip.eligibility",
            source_pdf=_SOURCE_PDF,
            page_ref="MOHR/PERKESO Info Pocket Book on SIP",
            passage=(
                "The Employment Insurance System (Sistem Insurans Pekerjaan, "
                "Akta 800) covers Malaysian salaried workers aged 18 to 60. "
                "Eligible insured persons who lose their employment "
                "involuntarily can claim benefits if they have contributed "
                "for at least 6 months within the last 24 months."
            ),
            source_url="https://jtksm.mohr.gov.my/sites/default/files/2022-12/Info-Pocket-Book-SIP.pdf",
        ),
        RuleCitation(
            rule_id="perkeso_sip.job_search_allowance",
            source_pdf=_SOURCE_PDF,
            page_ref="PERKESO SIP / EIS product page",
            passage=(
                "Job Search Allowance (JSA) replaces 80% of assumed monthly "
                "wage in the first month, 50% in the second, 40% in the "
                "third, and 30% from the fourth to sixth month. The insured-"
                "wage ceiling was raised from RM5,000 to RM6,000 effective "
                "1 October 2024, lifting the JSA month-1 cap to RM4,800."
            ),
            source_url="https://www.perkeso.gov.my/en/our-services/protection/employment-insurance.html",
        ),
    ])
    return cites


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    of_age = MIN_AGE <= profile.age <= MAX_AGE
    is_salaried = profile.form_type == "form_be"
    qualifies = of_age and is_salaried

    if not qualifies:
        reasons: list[str] = []
        if not is_salaried:
            reasons.append(out_of_scope_reason("perkeso_sip_not_salaried", language))
        if not of_age:
            reasons.append(
                out_of_scope_reason(
                    "perkeso_sip_age_outside_window",
                    language,
                    age=profile.age,
                    min_age=MIN_AGE,
                    max_age=MAX_AGE,
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
            kind="subsidy_credit",
        )

    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        age=profile.age,
        first_month_pct=FIRST_MONTH_REPLACEMENT_PCT,
        max_monthly_rm=MAX_MONTHLY_REPLACEMENT_RM,
        wage_ceiling_rm=INSURED_WAGE_CEILING_RM,
    )
    return SchemeMatch(
        scheme_id=_SCHEME_ID,
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=0.0,
        summary=copy["summary"],
        why_qualify=copy["why_qualify"],
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
        kind="subsidy_credit",
    )
