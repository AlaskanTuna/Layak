"""MyKasih (SARA RM100) — info-only `subsidy_credit` rule (Phase 12).

The official program is "SARA Untuk Semua" (Sumbangan Asas Rahmah, MOF-
delivered via the MyKasih platform operated by MyKasih Foundation). Layak's
user-facing display label is **"MyKasih"** because public usage Googles it
more often than "SARA"; citations preserve "SARA Untuk Semua via MyKasih"
for grounding accuracy.

The 9 February 2026 one-off tranche auto-credited **RM100** to every adult
Malaysian's MyKad, usable at participating merchants across 15 essential-
goods categories (~140k items, ~13k stores) operated by the MyKasih
network. **The credit expires 31 December 2026 — unused balance is
forfeited after that date.** Layak surfaces this prominently in bold on
the card via `expires_at_iso="2026-12-31"`.

Eligibility (Layak's age-only proxy):
    `age >= 18`. Official criteria: Malaysian citizen + age >= 18; no
    application required, no income gate. Layak doesn't ask for citizenship
    on either intake path; the redirect-wrapper risk profile is the same
    as third-party `mykasih.my`-style sites (low — we're not running an
    unauthorised IC-lookup service).

annual_rm semantics:
    Always `0.0`. `kind="subsidy_credit"` is filtered from `compute_upside`
    so the headline annual total stays honest. The card surfaces the
    eligibility hint + "Check your balance" CTA + the bold expiry line.
    We can't query the MyKasih balance API as third-party developers
    (see `docs/trd.md` §5.11 for the 10-angle no-API research finding),
    so we don't promise live balance — we deep-link to the official
    portal.

expires_at_iso: "2026-12-31"
    The hard forfeit date for the 9 Feb 2026 tranche. If MOF announces a
    2027 tranche before then, the admin re-approves the discovery
    candidate with a new expiry. After 31 Dec 2026, a nightly job
    surfaces this rule as a stale-rule candidate for admin retirement.
"""

from __future__ import annotations

from app.config import getenv
from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

MIN_AGE = 18
CREDIT_AMOUNT_RM = 100.0
EXPIRES_AT_ISO = "2026-12-31"

_SCHEME_ID = "mykasih"
_SCHEME_NAME = "MyKasih"
_AGENCY = "MOF / MyKasih Foundation"
_PORTAL_URL = "https://checkstatus.mykasih.net/"
_SOURCE_PDF = "mykasih-sara-2026.pdf"

# Vertex AI Search grounds the primary citation against the live source PDF.
# URI filter constrains the snippet ranker to the expected document so the
# rule cannot accidentally cite a different scheme's PDF.
_RAG_QUERY = getenv("LAYAK_RAG_QUERY_MYKASIH", "MyKasih SARA RM100 February disbursement")
_RAG_URI_SUBSTRING = "mykasih-sara-2026.pdf"


def _citations() -> list[RuleCitation]:
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id="rag.mykasih.primary",
        fallback_pdf="mykasih-sara-2026.pdf",
    )
    if rag is not None:
        cites.append(rag)
    cites.extend([
        RuleCitation(
            rule_id="mykasih.eligibility",
            source_pdf=_SOURCE_PDF,
            page_ref="Malay Mail, 5 February 2026",
            passage=(
                "The SARA Untuk Semua RM100 one-off tranche will be disbursed "
                "on 9 February 2026 to all Malaysian citizens aged 18 and "
                "above. No application required, no income gate; credit "
                "auto-loaded onto MyKad via the MyKasih platform."
            ),
            source_url=(
                "https://www.malaymail.com/news/malaysia/2026/02/05/"
                "rm100-sara-aid-for-all-adult-malaysians-begins-feb-9-says-finance-minister-ii/208160"
            ),
        ),
        RuleCitation(
            rule_id="mykasih.merchant_network",
            source_pdf=_SOURCE_PDF,
            page_ref="MyKasih Foundation SARA page",
            passage=(
                "SARA cash assistance is credited to recipients' MyKad for "
                "purchases covering over 140,000 basic items in 15 "
                "categories at over 13,000 selected stores and supermarkets "
                "nationwide, including the BUDI MADANI RON95 fuel subsidy."
            ),
            source_url="https://mykasih.com.my/en/sumbangan-asas-rahmah/",
        ),
        RuleCitation(
            rule_id="mykasih.expiry_31_dec_2026",
            source_pdf=_SOURCE_PDF,
            page_ref="SoyaCincau, 9 February 2026",
            passage=(
                "You don't need to fully utilise your one-off RM100 credit in "
                "a single transaction as the remaining balance is still valid "
                "until the end of the year, with unused credit being "
                "forfeited after 31st December."
            ),
            source_url=(
                "https://soyacincau.com/2026/02/09/"
                "sara-2026-rm100-credit-applicable-for-frozen-goods/"
            ),
        ),
        RuleCitation(
            rule_id="mykasih.one_off_2026",
            source_pdf=_SOURCE_PDF,
            page_ref="The Edge Malaysia, January 2026",
            passage=(
                "Malaysia expands SARA programme: monthly payments from "
                "9 January (for eKasih-verified Extremely Poor and Poor "
                "households), one-off RM100 on 9 February for all Malaysians "
                "aged 18 and above. The 9 Feb tranche is one-off — not "
                "recurring."
            ),
            source_url="https://theedgemalaysia.com/node/788033",
        ),
    ])
    return cites


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    """Match a profile against MyKasih (SARA RM100) eligibility (info-only).

    Returns a `subsidy_credit`-kind match with `annual_rm=0.0` regardless of
    qualification, and `expires_at_iso="2026-12-31"` so the frontend can
    render the bold expiry line on the card.
    """
    cites = _citations()
    qualifies = profile.age >= MIN_AGE

    if not qualifies:
        reasons = [
            out_of_scope_reason(
                "mykasih_age_below_min",
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
            expires_at_iso=EXPIRES_AT_ISO,
        )

    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        age=profile.age,
        credit_amount_rm=CREDIT_AMOUNT_RM,
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
        expires_at_iso=EXPIRES_AT_ISO,
    )
