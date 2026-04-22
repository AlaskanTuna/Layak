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
is a separate Budget-speech figure — see docs/trd.md §9.5 for the fallback
note. Task 4 encodes RM600 as the primary with a RM500 fallback constant kept
so the UI can render either depending on live gazette confirmation.
"""

from __future__ import annotations

from app.config import getenv
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

# Phase 8 Task 3 — Vertex AI Search grounds the primary citation against the
# live source PDF. URI filter constrains the snippet ranker to the expected
# document so the rule cannot accidentally cite a different scheme's PDF.
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


def match(profile: Profile) -> SchemeMatch:
    """Match a profile against JKM Warga Emas on behalf of an elderly dependent.

    Qualifies when:
      - The profile has at least one dependant with `relationship == "parent"` and
        age ≥ WARGA_EMAS_AGE_THRESHOLD (60 years).
      - Per-capita monthly household income (`monthly_income_rm / household_size`)
        is ≤ FOOD_PLI_RM (RM1,236, DOSM 2024).
    """
    elderly_parents = [
        d for d in profile.dependants if d.relationship == "parent" and d.age >= WARGA_EMAS_AGE_THRESHOLD
    ]
    per_capita = profile.monthly_income_rm / max(profile.household_size, 1)
    qualifies = bool(elderly_parents) and per_capita <= FOOD_PLI_RM

    cites = _citations()

    if not qualifies:
        reasons: list[str] = []
        if not elderly_parents:
            reasons.append(f"no parent dependant aged ≥{WARGA_EMAS_AGE_THRESHOLD} in household")
        if per_capita > FOOD_PLI_RM:
            reasons.append(f"per-capita income RM{per_capita:,.0f} exceeds food-PLI RM{FOOD_PLI_RM:,.0f}")
        return SchemeMatch(
            scheme_id="jkm_warga_emas",
            scheme_name=_SCHEME_NAME,
            qualifies=False,
            annual_rm=0.0,
            summary="Does not qualify under JKM Warga Emas means test.",
            why_qualify="Out of scope: " + "; ".join(reasons) + ".",
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
        )

    annual_rm = WARGA_EMAS_MONTHLY_RM * 12
    eldest = max(elderly_parents, key=lambda d: d.age)

    return SchemeMatch(
        scheme_id="jkm_warga_emas",
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=annual_rm,
        summary=(
            f"Per-capita income RM{per_capita:,.0f}/month is below food-PLI "
            f"RM{FOOD_PLI_RM:,.0f} — elderly parent age {eldest.age} qualifies."
        ),
        why_qualify=(
            f"Your household earns RM{profile.monthly_income_rm:,.0f}/month across "
            f"{profile.household_size} members — per-capita income RM{per_capita:,.0f} is "
            f"below the DOSM 2024 food-PLI threshold of RM{FOOD_PLI_RM:,.0f}. Under Budget "
            f"2026 the monthly payment is RM{WARGA_EMAS_MONTHLY_RM:,.0f} (fallback "
            f"RM{WARGA_EMAS_FALLBACK_MONTHLY_RM:,.0f} where the uplift is pending). You "
            f"apply on behalf of the dependent elder using the JKM18 form."
        ),
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
    )
