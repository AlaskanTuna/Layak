"""PeKa B40 — Skim Peduli Kesihatan untuk Kumpulan B40 (info-only health benefit).

PeKa B40 is the Ministry of Health's free health-screening + cancer aid +
medical-equipment scheme for B40 households. Administered by ProtectHealth.
Recipients of STR and their spouses aged 40+ are auto-enrolled.

Eligibility (Layak's proxy):
    `income_band` in any B40 tier AND `age >= 40`. The spouse-auto-enrol
    path is not modeled here — Aisyah's primary persona is the applicant,
    and PeKa B40 keys off STR auto-enrolment which our STR rule already
    captures upstream.

Benefits (non-cash; surfaced as info-only `subsidy_credit`):
    - Free annual health screening (clinical exam + lab panel, ~RM500 value)
    - Medical equipment aid up to RM20,000
    - Cancer-treatment incentive: RM300 + RM700 (RM1,000 total)
    - Transport claim up to RM500/year (Peninsular) or RM1,000/year
      (Sabah / Sarawak / Labuan)

`annual_rm = 0.0` because Layak cannot confirm whether the user has utilised
the benefit. Renders as an eligibility card; the user clicks through to
ProtectHealth to register.
"""

from __future__ import annotations

from app.config import getenv
from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

MIN_AGE = 40
_B40_BANDS = ("b40_hardcore", "b40_household", "b40_household_with_children")

_SCHEME_ID = "peka_b40"
_SCHEME_NAME = "PeKa B40 — Skim Peduli Kesihatan B40"
_AGENCY = "MOH (Ministry of Health) — ProtectHealth Malaysia"
_PORTAL_URL = "https://protecthealth.com.my/peka-b40/"
_SOURCE_PDF = "peka-b40-eligibility.pdf"

# Vertex AI Search grounds the primary citation against the live source PDF.
# URI filter constrains the snippet ranker to the expected document so the
# rule cannot accidentally cite a different scheme's PDF.
_RAG_QUERY = getenv(
    "LAYAK_RAG_QUERY_PEKA_B40",
    "PeKa B40 health screening cancer aid eligibility",
)
_RAG_URI_SUBSTRING = "peka-b40-eligibility.pdf"


def _citations() -> list[RuleCitation]:
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id="rag.peka_b40.primary",
        fallback_pdf="peka-b40-eligibility.pdf",
    )
    if rag is not None:
        cites.append(rag)
    cites.extend([
        RuleCitation(
            rule_id="peka_b40.eligibility",
            source_pdf=_SOURCE_PDF,
            page_ref="ProtectHealth eligibility page (external reference)",
            passage=(
                "Recipients of the Sumbangan Tunai Rahmah (STR) and their spouses "
                "aged 40 and above are automatically eligible for PeKa B40 "
                "benefits, with no separate registration required."
            ),
            source_url="https://protecthealth.com.my/peka-b40-eng/",
        ),
        RuleCitation(
            rule_id="peka_b40.benefit_basket",
            source_pdf=_SOURCE_PDF,
            page_ref="Portal Manfaat MOF — PeKa B40 entry",
            passage=(
                "Free annual health screening, medical equipment aid up to "
                "RM20,000, cancer-treatment incentives (RM300 on start + "
                "RM700 on completion), and transport claims up to RM500/year "
                "for Peninsular Malaysia or RM1,000/year for Sabah, Sarawak, "
                "and Labuan."
            ),
            source_url="https://manfaat.mof.gov.my/b2025/individu/peka-b40",
        ),
    ])
    return cites


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    band = profile.household_flags.income_band
    in_b40 = band in _B40_BANDS
    of_age = profile.age >= MIN_AGE
    qualifies = in_b40 and of_age

    if not qualifies:
        reasons: list[str] = []
        if not of_age:
            reasons.append(
                out_of_scope_reason(
                    "peka_b40_age_below_min",
                    language,
                    age=profile.age,
                    min_age=MIN_AGE,
                )
            )
        if not in_b40:
            reasons.append(
                out_of_scope_reason(
                    "peka_b40_band_above_b40",
                    language,
                    band=band,
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

    copy = scheme_copy(_SCHEME_ID, "qualify", language, age=profile.age, band=band)
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
