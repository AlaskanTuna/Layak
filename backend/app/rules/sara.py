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

from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

# SARA 2026 tier table:
# - eKasih-registered (proxied by `b40_hardcore`): RM200/month (enhanced).
# - Other B40 STR recipients: RM100/month (standard).
# The official program also publishes a lower RM50/month STR floor for the
# upper-B40 cohort, but Layak conservatively shows the more generous RM100
# tier — both rates are documented on `sara.gov.my` and the official portal
# re-verifies the exact tier at MyKad scan.
STANDARD_MONTHLY_RM = 100.0
ENHANCED_MONTHLY_RM = 200.0
_B40_BANDS = ("b40_hardcore", "b40_household", "b40_household_with_children")

_SCHEME_ID = "sara"
_SCHEME_NAME = "SARA — Sumbangan Asas Rahmah (MyKad credit)"
_AGENCY = "MOF (Ministry of Finance Malaysia)"
_PORTAL_URL = "https://sara.gov.my/en/home.html"
_SOURCE_PDF = "sara-rate-schedule.pdf"


def _citations() -> list[RuleCitation]:
    return [
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
    ]


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
    monthly_rm = ENHANCED_MONTHLY_RM if enhanced else STANDARD_MONTHLY_RM
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
