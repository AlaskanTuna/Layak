"""JKM Warga Emas — per-capita means test + Budget 2026 rate.

Two sources contribute to this rule:

1. `backend/data/schemes/jkm18.pdf` — the Borang Permohonan JKM18 application
   form. It enumerates the means-test inputs (page 2, section VII `MAKLUMAT
   PENDAPATAN DAN PERBELANJAAN BULANAN`) but does **not** print the threshold
   itself — that is externally set by JKM officers against DOSM data.

2. DOSM 2024 food poverty line income (food-PLI) — `RM1,236`/capita/month. This
   constant is referenced in the JKM18 `PENDAPATAN ISI RUMAH` section but the
   number itself lives in the public DOSM statistics portal, not the form.

The monthly rate (RM600 under Budget 2026, RM500 under the prior JKM schedule)
is a separate Budget-speech figure; RM600 is encoded as the primary with a
RM500 fallback constant kept so the UI can render either depending on live
gazette confirmation.
"""

from __future__ import annotations

from app.config import getenv
from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

WARGA_EMAS_AGE_THRESHOLD = 60
FOOD_PLI_RM = 1236.0
WARGA_EMAS_MONTHLY_RM = 600.0
WARGA_EMAS_FALLBACK_MONTHLY_RM = 500.0

_AGENCY = "JKM (Jabatan Kebajikan Masyarakat)"
_PORTAL_URL = "https://www.jkm.gov.my"
_SCHEME_NAME = "JKM Warga Emas — dependent elderly payment"

# Vertex AI Search grounds the primary citation against the live source PDF.
# URI filter constrains the snippet ranker to the expected document so the
# rule cannot accidentally cite a different scheme's PDF.
_RAG_QUERY = getenv("LAYAK_RAG_QUERY_JKM_WARGA_EMAS", "JKM Warga Emas application elderly parent")
_RAG_URI_SUBSTRING = "jkm18.pdf"


def _citations() -> list[RuleCitation]:
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id="rag.jkm_warga_emas.primary",
        fallback_pdf="jkm18.pdf",
    )
    if rag is not None:
        cites.append(rag)
    cites.extend([
        RuleCitation(
            rule_id="jkm.warga_emas.means_test_per_capita",
            source_pdf="jkm18.pdf",
            page_ref="p. 2, Section VII — Maklumat Pendapatan dan Perbelanjaan Bulanan",
            passage=(
                "PENDAPATAN BULANAN: Jumlah pendapatan bulanan keseluruhan pemohon dan isi rumah yang tinggal bersama."
            ),
            source_url=(
                "https://www.jkm.gov.my/jkm/uploads/files/Bahagian%20PW/BORANG%20PERMOHONAN%20JKM%2018%20(2022)(1).pdf"
            ),
        ),
        RuleCitation(
            rule_id="jkm.warga_emas.food_pli_threshold",
            source_pdf="jkm18.pdf",
            page_ref="DOSM 2024 food-PLI constant (external reference)",
            passage=(
                "Per-capita monthly household income must not exceed the DOSM 2024 food-PLI threshold of RM1,236."
            ),
            source_url="https://data.gov.my/data-catalogue/hh_poverty",
        ),
        RuleCitation(
            rule_id="jkm.warga_emas.rate_budget_2026",
            source_pdf="jkm18.pdf",
            page_ref="Budget 2026 speech (external reference)",
            passage=(
                "Monthly payment rate: RM600 (Budget 2026); fallback RM500 where the "
                "uplift is pending JKM18 re-gazette."
            ),
            source_url="https://www.jkm.gov.my",
        ),
    ])
    return cites


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    """Match a profile against JKM Warga Emas on behalf of an elderly dependent.

    Qualifies when:
      - The profile has at least one dependant with relationship `parent` or
        `grandparent` and age ≥ WARGA_EMAS_AGE_THRESHOLD (60 years).
      - Per-capita monthly household income (`monthly_income_rm / household_size`)
        is ≤ FOOD_PLI_RM (RM1,236, DOSM 2024).
    """
    elderly_dependants = [
        d
        for d in profile.dependants
        if d.relationship in ("parent", "grandparent") and d.age >= WARGA_EMAS_AGE_THRESHOLD
    ]
    household_income_rm = profile.household_income_rm
    per_capita = household_income_rm / max(profile.household_size, 1)
    qualifies = bool(elderly_dependants) and per_capita <= FOOD_PLI_RM

    cites = _citations()

    if not qualifies:
        reasons: list[str] = []
        if not elderly_dependants:
            reasons.append(
                out_of_scope_reason(
                    "jkm_warga_emas_no_elderly_parent",
                    language,
                    threshold=WARGA_EMAS_AGE_THRESHOLD,
                )
            )
        if per_capita > FOOD_PLI_RM:
            reasons.append(
                out_of_scope_reason(
                    "jkm_warga_emas_income_above_pli",
                    language,
                    per_capita=per_capita,
                    food_pli=FOOD_PLI_RM,
                )
            )
        copy = scheme_copy("jkm_warga_emas", "out_of_scope", language, reasons=reasons)
        return SchemeMatch(
            scheme_id="jkm_warga_emas",
            scheme_name=_SCHEME_NAME,
            qualifies=False,
            annual_rm=0.0,
            summary=copy["summary"],
            why_qualify=copy["why_qualify"],
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
        )

    annual_rm = WARGA_EMAS_MONTHLY_RM * 12
    eldest = max(elderly_dependants, key=lambda d: d.age)

    copy = scheme_copy(
        "jkm_warga_emas",
        "qualify",
        language,
        per_capita=per_capita,
        food_pli_rm=FOOD_PLI_RM,
        eldest_age=eldest.age,
        monthly_rm=WARGA_EMAS_MONTHLY_RM,
        fallback_monthly_rm=WARGA_EMAS_FALLBACK_MONTHLY_RM,
        monthly_income_rm=household_income_rm,
        household_size=profile.household_size,
    )
    return SchemeMatch(
        scheme_id="jkm_warga_emas",
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=annual_rm,
        summary=copy["summary"],
        why_qualify=copy["why_qualify"],
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
    )
