"""BUDI95 RON95 petrol subsidy — info-only `subsidy_credit` rule (Phase 12).

BUDI95 is Malaysia's targeted RON95 subsidy programme launched 30 Sep 2025
under MOF (Ministry of Finance). Eligible Malaysians get RON95 petrol at
**RM1.99/L** vs the unsubsidised market price, capped at 300 L/month per
person. As of Feb 2026, 14.8M Malaysians have transacted under the scheme.

Eligibility (Layak's age-only proxy):
    `age >= 16`. The full official eligibility set is Malaysian citizen
    + age >= 16 + valid Competent / Probationary / Learner driving licence
    for classes A/A1/B/B1/B2/C/D/DA. Layak does NOT collect licence info
    on either intake path — if the user lacks a licence, the official
    portal at budi95.gov.my will tell them when they click through. Same
    redirect-wrapper risk profile as third-party `mykasih.my`-style sites
    (low; we're not running an unauthorised IC-lookup service).

annual_rm semantics:
    Always `0.0`. `kind="subsidy_credit"` is filtered from `compute_upside`
    so the headline annual total stays honest. The card surfaces eligibility
    + "Check your balance" CTA + the program constants (RM1.99/L, 300 L/mo
    cap), refreshed periodically by the discovery agent. We don't compute
    estimated savings because that would require asking the user for their
    consumption, which we deliberately avoid.

expires_at_iso:
    `None`. BUDI95's monthly quota is rolling, not calendar-bound.

API integration: NONE. Investigation (May 2026, 10 search angles) confirmed
no public developer API exists for BUDI95 balance / quota lookup. Setel /
TNG eWallet / Shell App integrate via bilateral commercial partnerships,
not via open APIs. See `docs/trd.md` §5.11 for the locked research finding.
"""

from __future__ import annotations

from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

MIN_AGE = 16
SUBSIDISED_PRICE_RM = 1.99
MONTHLY_QUOTA_L = 300

_SCHEME_ID = "budi95"
_SCHEME_NAME = "BUDI95"
_AGENCY = "MOF (Ministry of Finance Malaysia)"
_PORTAL_URL = "https://www.budi95.gov.my/"
_SOURCE_PDF = "budi95-press-release.pdf"


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="budi95.eligibility",
            source_pdf=_SOURCE_PDF,
            page_ref="MOF press release, 30 September 2025",
            passage=(
                "RON95 petrol is RM1.99 per litre for Malaysian citizens with a "
                "MyKad and a valid Malaysian driving licence (classes A, A1, B, "
                "B1, B2, C, D, DA), starting 30 September 2025. Eligibility is "
                "verified via MyKad at participating petrol stations or via the "
                "Setel, TNG eWallet, Shell App, and CaltexGo apps."
            ),
            source_url=(
                "https://www.mof.gov.my/portal/en/news/press-citations/"
                "ron95-petrol-is-rm1-99-per-litre-for-malaysian-citizens-starting-sept-30-pm-anwar"
            ),
        ),
        RuleCitation(
            rule_id="budi95.monthly_cap",
            source_pdf=_SOURCE_PDF,
            page_ref="Maybank2u BUDI95 explainer (external reference)",
            passage=(
                "Each eligible Malaysian is entitled to a monthly quota of 300 "
                "litres of RON95 petrol at the subsidised price of RM1.99 per "
                "litre. Quota was temporarily reduced to 200 L during the "
                "geopolitical-driven oil-price spike."
            ),
            source_url=(
                "https://www.maybank2u.com.my/maybank2u/malaysia/en/articles/"
                "headlines/local/budi95-fuel-subsidy-programme.page"
            ),
        ),
        RuleCitation(
            rule_id="budi95.reach_feb_2026",
            source_pdf=_SOURCE_PDF,
            page_ref="MOF statement, 28 February 2026",
            passage=(
                "Nearly 14.8 million Malaysians have benefited from the BUDI95 "
                "petrol subsidy as of 28 February 2026, per Second Finance "
                "Minister Datuk Seri Amir Hamzah Azizan."
            ),
            source_url=(
                "https://mof.gov.my/portal/en/news/press-citations/"
                "nearly-14-8-mln-benefited-from-budi95-petrol-subsidy-as-of-feb-28-2026-amir-hamzah"
            ),
        ),
    ]


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    """Match a profile against BUDI95 eligibility (info-only).

    Returns a `subsidy_credit`-kind match with `annual_rm=0.0` regardless of
    qualification. `compute_upside` filters subsidy_credits out of the
    headline total so they never stack into the upside math.
    """
    cites = _citations()
    qualifies = profile.age >= MIN_AGE

    if not qualifies:
        reasons = [
            out_of_scope_reason(
                "budi95_age_below_min",
                language,
                age=profile.age,
                min_age=MIN_AGE,
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

    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        age=profile.age,
        subsidised_price_rm=SUBSIDISED_PRICE_RM,
        monthly_quota_l=MONTHLY_QUOTA_L,
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
