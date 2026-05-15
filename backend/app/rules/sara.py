"""SARA — Sumbangan Asas Rahmah (Ministry of Finance MyKad credit).

SARA is the monthly food-essentials MyKad credit administered by the
Ministry of Finance for STR-eligible households. Distinct from the one-off
"SARA Untuk Semua via MyKasih" (RM100 Feb 2026 credit, modelled in
`app.rules.mykasih`): regular SARA is a recurring monthly RM100 credit for
general STR recipients, scaled up to RM200 for households also registered
in eKasih as hardcore poor.

Eligibility (Layak's proxy):
    `income_band` in any B40 tier. The lower-tier (`b40_hardcore`)
    receives the enhanced rate; the rest receive the standard rate. We
    treat the broader B40 cohort as eligible — the official portal
    re-verifies STR registration at MyKad scan.

Benefits (non-cash, surfaced as `subsidy_credit`):
    Monthly MyKad credit, redeemable at MyKasih-participating retailers
    for essentials. `annual_rm = 0.0` because Layak cannot confirm the
    user's actual redemption history — the figure is informational and
    pulled from the official rate schedule for display only.
"""

from __future__ import annotations

from app.config import getenv
from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

# SARA 2026 tier table (per sara.gov.my + Budget 2026 sources):
# - eKasih-registered miskin / miskin tegar (proxied by `b40_hardcore`):
#   RM200/month enhanced tier (RM2,400/year).
# - STR-eligible household / elderly (proxied by `b40_household` and
#   `b40_household_with_children`): RM100/month standard tier (RM1,200/year).
# - STR-eligible bujang (single, no dependants): RM50/month (RM600/year).
#   Reserved for future bujang-detection logic — currently no profile band
#   maps to this tier because every B40 band in Layak's intake forms is
#   household-coded. The constant stays defined for documentation symmetry.
# The official portal re-verifies the exact tier at MyKad scan against eKasih
# registration; Layak picks the income_band-proxy tier closest to the
# documented rate.
ENHANCED_MONTHLY_RM = 200.0
STANDARD_MONTHLY_RM = 100.0
FLOOR_MONTHLY_RM = 50.0  # Bujang (single) tier — see note above.
_B40_BANDS = ("b40_hardcore", "b40_household", "b40_household_with_children")

_SCHEME_ID = "sara"
_SCHEME_NAME = "SARA — Sumbangan Asas Rahmah (MyKad credit)"
_AGENCY = "MOF (Ministry of Finance Malaysia)"
_PORTAL_URL = "https://sara.gov.my/en/home.html"
_SOURCE_PDF = "sara-rate-schedule.pdf"

# Vertex AI Search grounds the primary citation against the live source PDF.
# URI filter constrains the snippet ranker to the expected document so the
# rule cannot accidentally cite a different scheme's PDF.
_RAG_QUERY = getenv(
    "LAYAK_RAG_QUERY_SARA",
    "Sumbangan Asas Rahmah MyKad monthly credit",
)
_RAG_URI_SUBSTRING = "sara-rate-schedule.pdf"


def _citations() -> list[RuleCitation]:
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id="rag.sara.primary",
        fallback_pdf="sara-rate-schedule.pdf",
    )
    if rag is not None:
        cites.append(rag)
    cites.extend([
        RuleCitation(
            rule_id="sara.standard_rate",
            source_pdf=_SOURCE_PDF,
            page_ref="SARA official portal",
            passage=(
                "Sumbangan Asas Rahmah (SARA) is a monthly MyKad credit of up "
                "to RM100 for STR-eligible Malaysians, redeemable at any "
                "MyKasih-participating retailer for essential goods."
            ),
            source_url="https://sara.gov.my/en/home.html",
        ),
        RuleCitation(
            rule_id="sara.hardcore_uplift",
            source_pdf=_SOURCE_PDF,
            page_ref="Budget 2026 SARA enhancement (external reference)",
            passage=(
                "STR recipients also registered in eKasih receive an enhanced "
                "RM200/month, totalling RM2,400 for the year — double the "
                "general SARA tier."
            ),
            source_url="https://www.housingwatch.my/finance/sumbangan-tunai-rahmah-str-ecosystem-all-benefits-in-2026/",
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
    qualifies = band in _B40_BANDS

    if not qualifies:
        reasons = [
            out_of_scope_reason(
                "sara_band_above_b40",
                language,
                band=band,
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
            kind="subsidy_credit",
        )

    enhanced = band == "b40_hardcore"
    if band == "b40_hardcore":
        monthly_rm = ENHANCED_MONTHLY_RM
    else:
        # `b40_household` and `b40_household_with_children` both land on the
        # standard RM100/month tier. The RM50 bujang tier is not surfaced
        # through any band today (every Layak intake band is household-coded).
        monthly_rm = STANDARD_MONTHLY_RM
    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        band=band,
        monthly_rm=monthly_rm,
        enhanced=enhanced,
        annual_rm=monthly_rm * 12,
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
