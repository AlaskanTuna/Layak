"""JKM Bantuan Kanak-Kanak (BKK) — per-capita means test + age-tiered per-child payment.

Complements `jkm_warga_emas.py` (elderly dependant payment); this rule
targets the same means-testable households but gates on children under 18
instead of parents over 60.

Scheme description (JKM BKK, post-Belanjawan-2025 schedule):
    RM250/month per qualifying child aged 6 and under
    RM200/month per qualifying child aged 7 to 17 (inclusive)
    Capped at RM1,000/month per household.

Belanjawan 2025 (tabled 18 Oct 2024) raised the per-child rates from
RM200/RM150 to RM250/RM200. The MOF Portal Manfaat b2026 tree carries the
post-uplift schedule (`https://manfaat.mof.gov.my/b2026/individu/kkjkm`)
as does Ihsan MADANI; Belanjawan 2026 left the rates unchanged.

The committed source PDF at `backend/data/schemes/jkm-bkk-brochure.pdf`
(JKM SPK ISO 9001 procedure, Oct 2024) was finalised alongside Budget
2025 tabling and still reflects the pre-uplift RM200/RM150 schedule. The
rule's primary rate citation now points at the MOF Portal Manfaat live
page instead of the stale PDF; the PDF is retained for the means-test +
application-procedure passages that are unchanged.

Qualifying criteria:
    - At least one child-care dependant has relationship `child` or `sibling`
      and `age < 18`.
    - Per-capita monthly household income ≤ RM1,000 (commonly-cited BKK means
      test, tighter than Warga Emas's food-PLI threshold since BKK is a direct
      cash transfer).
"""

from __future__ import annotations

from app.config import getenv
from app.rules._i18n import bkk_breakdown, bkk_cap_note, out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Dependant, Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

CHILD_AGE_THRESHOLD = 18
# Age boundary for the two per-child rate tiers. Children aged ≤ YOUNGER_BAND_AGE
# get the higher rate; older children (still under 18) get the lower rate.
YOUNGER_BAND_AGE = 6
PER_CAPITA_THRESHOLD_RM = 1000.0
# Belanjawan 2025 (tabled 18 Oct 2024) raised the per-child BKK rates from
# RM200/RM150 to RM250/RM200. Confirmed across MOF Portal Manfaat b2026
# tree, Ihsan MADANI, and contemporaneous Belanjawan-2025 mainstream
# coverage (Kosmo, TRP, RTM, Buzzkini). Belanjawan 2026 left the rates
# unchanged. Note the committed `jkm-bkk-brochure.pdf` is the pre-uplift
# Oct-2024 ISO SPK and still shows the legacy RM200/RM150 rates — kept
# for the means-test passage; rate citation now points at Portal Manfaat.
PER_CHILD_MONTHLY_RM_YOUNGER = 250.0  # ages 0–6 inclusive
PER_CHILD_MONTHLY_RM_OLDER = 200.0  # ages 7–17 inclusive
HOUSEHOLD_MONTHLY_CAP_RM = 1000.0
# Annual cap derived from the monthly cap. Kept as a constant so tests can
# import it instead of reconstructing `1000 * 12` inline.
HOUSEHOLD_ANNUAL_CAP_RM = HOUSEHOLD_MONTHLY_CAP_RM * 12  # 12_000.0

_AGENCY = "JKM (Jabatan Kebajikan Masyarakat)"
_PORTAL_URL = "https://www.jkm.gov.my"
_SCHEME_NAME = "JKM Bantuan Kanak-Kanak — per-child monthly payment"
# JKM SPK ISO 9001 procedure document (Oct 2024) — committed to
# backend/data/schemes/. Documents the BKK programme + means-test verbatim.
# Per-child rates in the PDF are PRE-Belanjawan-2025 (RM200/RM150) and now
# stale; the rate citation in `_citations()` points at the MOF Portal
# Manfaat live page instead.
_SOURCE_PDF = "jkm-bkk-brochure.pdf"

# Vertex AI Search grounds the primary citation against the live source PDF.
# URI filter constrains the snippet ranker to the expected document so the
# rule cannot accidentally cite a different scheme's PDF.
_RAG_QUERY = getenv("LAYAK_RAG_QUERY_JKM_BKK", "Bantuan Kanak-Kanak children household monthly")
_RAG_URI_SUBSTRING = "jkm-bkk-brochure.pdf"


def _citations() -> list[RuleCitation]:
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id="rag.jkm_bkk.primary",
        fallback_pdf="jkm-bkk-brochure.pdf",
    )
    if rag is not None:
        cites.append(rag)
    cites.extend([
        RuleCitation(
            rule_id="jkm.bkk.eligibility_means_test",
            source_pdf=_SOURCE_PDF,
            page_ref="JKM SPK ISO 9001 — Bantuan Kewangan Bulanan, Kategori Bantuan",
            passage=(
                "Bantuan Kanak-Kanak (BKK) dibayar kepada isi rumah berpendapatan rendah "
                "dengan kanak-kanak berumur di bawah 18 tahun. Had pendapatan per kapita "
                "isi rumah tidak melebihi RM1,000 sebulan."
            ),
            source_url="https://www.jkm.gov.my/uploads/content-downloads/file_20241025152555.pdf",
        ),
        RuleCitation(
            rule_id="jkm.bkk.rate_per_child",
            source_pdf=_SOURCE_PDF,
            page_ref="Portal Manfaat MOF (post-Belanjawan-2025 schedule, live in b2026 tree)",
            passage=(
                "Belanjawan 2025 (tabled 18 Oct 2024) raised the BKK per-child "
                "rates from RM200/RM150 to RM250 per month for children aged "
                "6 years and below and RM200 per month for children aged 7 to "
                "18 years. The household maximum stays at RM1,000/month. "
                "Belanjawan 2026 left the schedule unchanged."
            ),
            source_url="https://manfaat.mof.gov.my/b2026/individu/kkjkm",
        ),
    ])
    return cites


def _qualifying_children(profile: Profile) -> list[Dependant]:
    """Return BKK child-care recipients under 18, in input order."""
    return [
        d
        for d in profile.dependants
        if d.relationship in ("child", "sibling") and d.age < CHILD_AGE_THRESHOLD
    ]


def _per_child_monthly_rm(age: int) -> float:
    """Map a qualifying child's age to its monthly Budget-2021 BKK rate."""
    return PER_CHILD_MONTHLY_RM_YOUNGER if age <= YOUNGER_BAND_AGE else PER_CHILD_MONTHLY_RM_OLDER


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    """Match a profile against JKM BKK.

    Qualifies when at least one qualifying child is present AND per-capita
    household income ≤ RM 1,000. Monthly payment sums the per-child rate
    (RM 200 for age ≤ 6, RM 150 for age 7–17), capped at RM 1,000/month per
    household. Annual = capped monthly × 12.
    """
    cites = _citations()

    qualifying_children = _qualifying_children(profile)
    household_income_rm = profile.household_income_rm
    per_capita = household_income_rm / max(profile.household_size, 1)
    qualifies = len(qualifying_children) > 0 and per_capita <= PER_CAPITA_THRESHOLD_RM

    if not qualifies:
        reasons: list[str] = []
        if not qualifying_children:
            reasons.append(
                out_of_scope_reason(
                    "jkm_bkk_no_child",
                    language,
                    threshold=CHILD_AGE_THRESHOLD,
                )
            )
        if per_capita > PER_CAPITA_THRESHOLD_RM:
            reasons.append(
                out_of_scope_reason(
                    "jkm_bkk_income_above_threshold",
                    language,
                    per_capita=per_capita,
                    threshold=PER_CAPITA_THRESHOLD_RM,
                )
            )
        copy = scheme_copy("jkm_bkk", "out_of_scope", language, reasons=reasons)
        return SchemeMatch(
            scheme_id="jkm_bkk",
            scheme_name=_SCHEME_NAME,
            qualifies=False,
            annual_rm=0.0,
            summary=copy["summary"],
            why_qualify=copy["why_qualify"],
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
        )

    younger_count = sum(1 for d in qualifying_children if d.age <= YOUNGER_BAND_AGE)
    older_count = len(qualifying_children) - younger_count
    uncapped_monthly = (
        younger_count * PER_CHILD_MONTHLY_RM_YOUNGER + older_count * PER_CHILD_MONTHLY_RM_OLDER
    )
    capped_monthly = min(uncapped_monthly, HOUSEHOLD_MONTHLY_CAP_RM)
    annual_rm = capped_monthly * 12

    cap_note = (
        bkk_cap_note(HOUSEHOLD_MONTHLY_CAP_RM, language)
        if uncapped_monthly > HOUSEHOLD_MONTHLY_CAP_RM
        else ""
    )
    breakdown = bkk_breakdown(
        younger_count=younger_count,
        younger_rate=PER_CHILD_MONTHLY_RM_YOUNGER,
        younger_age_max=YOUNGER_BAND_AGE,
        older_count=older_count,
        older_rate=PER_CHILD_MONTHLY_RM_OLDER,
        language=language,
    )

    copy = scheme_copy(
        "jkm_bkk",
        "qualify",
        language,
        per_capita=per_capita,
        threshold_rm=PER_CAPITA_THRESHOLD_RM,
        breakdown=breakdown,
        cap_note=cap_note,
        capped_monthly=capped_monthly,
        annual_rm=annual_rm,
        monthly_income_rm=household_income_rm,
        household_size=profile.household_size,
    )
    return SchemeMatch(
        scheme_id="jkm_bkk",
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=annual_rm,
        summary=copy["summary"],
        why_qualify=copy["why_qualify"],
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
    )
