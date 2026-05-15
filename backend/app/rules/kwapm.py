"""KWAPM — Kumpulan Wang Amanah Pelajar Miskin (MOE means-tested cash).

KWAPM is MOE's means-tested cash aid for very-poor primary-school
students. Distinct from BAP (universal in 2026 at RM150/child Jan): KWAPM
is an annual RM200/child top-up paid to households verified below the
National Poverty Line Income (PGK ~RM2,589/month, DOSM 2022) OR
registered in eKasih.

Eligibility (Layak's proxy):
    `dependants[*]` with `relationship == "child"` AND `age` in
    [PRIMARY_AGE_MIN, PRIMARY_AGE_MAX] AND `income_band ==
    "b40_hardcore"`. The `b40_hardcore` band (<RM1,500/month) is our
    closest available proxy to eKasih-Miskin-Tegar; for the more
    inclusive `b40_household` band (≤RM2,500) the eligibility flips on
    eKasih registration which Layak cannot verify directly.

Benefit:
    RM200/year/child cash, paid by the school to the parent's bank
    account. Counts as `upside`.
"""

from __future__ import annotations

from app.config import getenv
from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

PRIMARY_AGE_MIN = 7
PRIMARY_AGE_MAX = 12
# Per Ihsan MADANI (KWAPM official page) the Bantuan Am Persekolahan (BAmP)
# stream pays RM100/year/child for primary-school students (Year 1–6) and
# RM150/year/child for secondary-school students (Form 1–5). Layak's rule
# gates on primary age (7–12) only, so the constant captures the primary
# rate. Prior value RM200 (legacy) refreshed downward per the Q1 2026
# Ihsan MADANI / Portal Manfaat refresh.
PER_CHILD_ANNUAL_RM = 100.0

_SCHEME_ID = "kwapm"
_SCHEME_NAME = "KWAPM — Kumpulan Wang Amanah Pelajar Miskin"
_AGENCY = "KPM (Ministry of Education Malaysia)"
_PORTAL_URL = "https://www.moe.gov.my/bantuan-kumpulan-wang-amanah-pelajar-miskin-kwapm"
_SOURCE_PDF = "kwapm-circular.pdf"

# Vertex AI Search grounds the primary citation against the live source PDF.
# URI filter constrains the snippet ranker to the expected document so the
# rule cannot accidentally cite a different scheme's PDF.
_RAG_QUERY = getenv(
    "LAYAK_RAG_QUERY_KWAPM",
    "Kumpulan Wang Amanah Pelajar Miskin RM200 annual",
)
_RAG_URI_SUBSTRING = "kwapm-circular.pdf"


def _citations() -> list[RuleCitation]:
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id="rag.kwapm.primary",
        fallback_pdf="kwapm-circular.pdf",
    )
    if rag is not None:
        cites.append(rag)
    cites.extend([
        RuleCitation(
            rule_id="kwapm.eligibility",
            source_pdf=_SOURCE_PDF,
            page_ref="Ihsan MADANI KWAPM initiative page (Q1 2026 refresh)",
            passage=(
                "Bantuan Am Persekolahan (BAmP) under KWAPM is paid to "
                "students from households below the National Poverty Line "
                "Income or registered in eKasih: RM100 per year for primary "
                "school (Year 1–6) and RM150 per year for secondary school "
                "(Form 1–5)."
            ),
            source_url="https://ihsanmadani.gov.my/inisiatif/pendidikan/kumpulan-wang-amanah-pelajar-miskin-kwapm",
        ),
        RuleCitation(
            rule_id="kwapm.bk_emergency_track",
            source_pdf=_SOURCE_PDF,
            page_ref="Ihsan MADANI KWAPM initiative page — Bantuan Khas",
            passage=(
                "KWAPM also runs a Bantuan Khas (BK) emergency-aid track of "
                "RM300 per school for crisis events. Both BAmP and BK are "
                "administered by the school's KWAPM committee — no central "
                "application."
            ),
            source_url="https://ihsanmadani.gov.my/inisiatif/pendidikan/kumpulan-wang-amanah-pelajar-miskin-kwapm",
        ),
    ])
    return cites


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    primary_children = [
        d
        for d in profile.dependants
        if d.relationship == "child" and PRIMARY_AGE_MIN <= d.age <= PRIMARY_AGE_MAX
    ]
    band = profile.household_flags.income_band
    is_hardcore = band == "b40_hardcore"
    qualifies = is_hardcore and bool(primary_children)

    if not qualifies:
        reasons: list[str] = []
        if not is_hardcore:
            reasons.append(
                out_of_scope_reason(
                    "kwapm_band_above_hardcore",
                    language,
                    band=band,
                )
            )
        if not primary_children:
            reasons.append(
                out_of_scope_reason(
                    "kwapm_no_primary_child",
                    language,
                    min_age=PRIMARY_AGE_MIN,
                    max_age=PRIMARY_AGE_MAX,
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

    child_count = len(primary_children)
    annual_rm = PER_CHILD_ANNUAL_RM * child_count
    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        child_count=child_count,
        per_child_rm=PER_CHILD_ANNUAL_RM,
        annual_rm=annual_rm,
        band=band,
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
