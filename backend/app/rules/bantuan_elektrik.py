"""Bantuan Elektrik B40 — TNB RM40 monthly electricity rebate (KIR Miskin Tegar).

Tenaga Nasional Berhad applies a federally-funded rebate of up to RM40 per
month to the electricity bills of households classified as eKasih Miskin
Tegar (hardcore poor) heads-of-household. Auto-applied at billing; no
opt-in required.

Eligibility (Layak's proxy):
    `income_band == "b40_hardcore"` (our <RM1,500/month threshold is a
    reasonable proxy for the eKasih Miskin Tegar PGK of RM1,198). The
    user must also have a domestic TNB account, which we infer from a
    positive `monthly_cost_rm` on the utility bill.

Benefit:
    Up to RM40/month off the electricity bill (or the full bill amount if
    lower than RM40). Annualised: min(monthly_cost_rm, RM40) × 12.
    Counts as `upside` because the rebate is a real cash discount on a
    bill the user would otherwise pay in full.
"""

from __future__ import annotations

from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

MONTHLY_REBATE_CAP_RM = 40.0

_SCHEME_ID = "bantuan_elektrik"
_SCHEME_NAME = "Bantuan Elektrik — TNB RM40 Rebate (KIR Miskin Tegar)"
_AGENCY = "TNB (Tenaga Nasional Berhad) + PETRA (Ministry of Energy Transition)"
_PORTAL_URL = "https://www.tnb.com.my/residential/discounts-rebates-offers"
_SOURCE_PDF = "tnb-rebate-eligibility.pdf"


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="bantuan_elektrik.kir_eligibility",
            source_pdf=_SOURCE_PDF,
            page_ref="TNB residential discounts page",
            passage=(
                "Head of Household (KIR) under the Miskin Tegar (hardcore poor) "
                "category, listed and verified in the eKasih System, receives "
                "up to RM40 in monthly electricity bill rebate. The TNB rate "
                "card runs through 31 December 2025; Budget 2026 confirmed "
                "extension under the broader social-protection envelope — "
                "the rule treats the rate as the most recently published cap."
            ),
            source_url="https://www.tnb.com.my/residential/discounts-rebates-offers",
        ),
        RuleCitation(
            rule_id="bantuan_elektrik.petra_portal",
            source_pdf=_SOURCE_PDF,
            page_ref="PETRA rebate-status check portal",
            passage=(
                "Households may verify their rebate status at PETRA's Semakan "
                "Rebat portal using their MyKad number."
            ),
            source_url="https://semakanrebat.petra.gov.my/",
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
    monthly_cost = profile.monthly_cost_rm or 0.0
    has_bill = monthly_cost > 0
    qualifies = is_hardcore and has_bill

    if not qualifies:
        reasons: list[str] = []
        if not is_hardcore:
            reasons.append(
                out_of_scope_reason(
                    "bantuan_elektrik_band_above_hardcore",
                    language,
                    band=band,
                )
            )
        if not has_bill:
            reasons.append(
                out_of_scope_reason(
                    "bantuan_elektrik_no_bill",
                    language,
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

    effective_monthly_rebate = min(monthly_cost, MONTHLY_REBATE_CAP_RM)
    annual_rm = effective_monthly_rebate * 12.0
    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        monthly_rebate=effective_monthly_rebate,
        monthly_cost=monthly_cost,
        annual_rm=annual_rm,
        rebate_cap=MONTHLY_REBATE_CAP_RM,
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
