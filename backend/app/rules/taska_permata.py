"""TASKA Permata — preschool fee subsidy framework (KPWKM + JPA variants).

Two TASKA fee-subsidy mechanisms operate concurrently in Malaysia:

1. **KPWKM Jabatan Permata** — community TASKA / TADIKA Permata centres for
   low- and middle-income households (gross income ≤ RM5,000/month).
   Documented on `permata.gov.my` and the Ihsan MADANI initiative pages;
   no canonical PDF circular is published publicly.

2. **JPA Pekeliling Perkhidmatan 1/2023** — equivalent RM180/month TASKA
   fee subsidy for civil servants ("pegawai Perkhidmatan Awam") regardless
   of income band. This is the source we commit as
   `taska-permata-circular.pdf` because it is the most authoritative
   downloadable PDF describing the RM180/month rate, paying mechanism,
   and centre-registration requirements that mirror the KPWKM variant.

Eligibility (Layak's proxy):
    `household_monthly_income_rm <= INCOME_CAP_RM` AND at least one
    `dependants[*]` with `relationship == "child"` AND `age` in
    [PRESCHOOL_AGE_MIN, PRESCHOOL_AGE_MAX]. The B40-cap path matches the
    KPWKM Permata Komuniti requirements; civil-servant filers can access
    the JPA variant regardless of band but Layak does not track sector
    employment so we stay on the household-income gate.

Benefit:
    Up to RM180/month fee subsidy per child. Annualised at 11 school
    months ≈ RM1,980/year/child. Counts as `upside`.
"""

from __future__ import annotations

from app.config import getenv
from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

PRESCHOOL_AGE_MIN = 0
PRESCHOOL_AGE_MAX = 6
INCOME_CAP_RM = 5000.0
MONTHLY_SUBSIDY_RM = 180.0
SUBSIDY_MONTHS_PER_YEAR = 11

_SCHEME_ID = "taska_permata"
_SCHEME_NAME = "TASKA Permata — KPWKM Preschool Subsidy"
_AGENCY = "KPWKM (Ministry of Women, Family & Community Development) — Jabatan Permata"
_PORTAL_URL = "https://www.kpwkm.gov.my/portal-main/list-services?type=taman-asuhan-kanak-kanak"
_SOURCE_PDF = "taska-permata-circular.pdf"

# Vertex AI Search grounds the primary citation against the live source PDF.
# URI filter constrains the snippet ranker to the expected document so the
# rule cannot accidentally cite a different scheme's PDF.
_RAG_QUERY = getenv(
    "LAYAK_RAG_QUERY_TASKA_PERMATA",
    "TASKA Permata preschool fee subsidy RM180 monthly",
)
_RAG_URI_SUBSTRING = "taska-permata-circular.pdf"


def _citations() -> list[RuleCitation]:
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id="rag.taska_permata.primary",
        fallback_pdf="taska-permata-circular.pdf",
    )
    if rag is not None:
        cites.append(rag)
    cites.extend([
        RuleCitation(
            rule_id="taska_permata.jpa_pekeliling_rate",
            source_pdf=_SOURCE_PDF,
            page_ref="JPA Pekeliling Perkhidmatan Bilangan 1 Tahun 2023",
            passage=(
                "Pekeliling Perkhidmatan Bilangan 1 Tahun 2023: subsidi yuran "
                "pengasuhan TASKA RM180 sebulan setiap kanak-kanak di pusat "
                "TASKA berdaftar (di tempat kerja sektor awam). The KPWKM "
                "Jabatan Permata community variant mirrors this RM180/month "
                "rate for households at or below RM5,000/month gross income."
            ),
            source_url="https://docs.jpa.gov.my/docs/pp/2023/pp012023.pdf",
        ),
        RuleCitation(
            rule_id="taska_permata.kpwkm_community_scope",
            source_pdf=_SOURCE_PDF,
            page_ref="KPWKM TASKA services directory",
            passage=(
                "The Ministry of Women, Family & Community Development "
                "(KPWKM) supervises TASKA registration, training, and the "
                "Permohonan Subsidi Yuran Pengasuhan Kanak-Kanak childcare "
                "fee subsidy programme through its services directory."
            ),
            source_url="https://www.kpwkm.gov.my/portal-main/list-services?type=taman-asuhan-kanak-kanak",
        ),
    ])
    return cites


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    household_income = profile.household_income_rm
    income_eligible = household_income <= INCOME_CAP_RM
    preschool_children = [
        d
        for d in profile.dependants
        if d.relationship == "child" and PRESCHOOL_AGE_MIN <= d.age <= PRESCHOOL_AGE_MAX
    ]
    qualifies = income_eligible and bool(preschool_children)

    if not qualifies:
        reasons: list[str] = []
        if not income_eligible:
            reasons.append(
                out_of_scope_reason(
                    "taska_permata_income_above_cap",
                    language,
                    household_income=household_income,
                    cap=INCOME_CAP_RM,
                )
            )
        if not preschool_children:
            reasons.append(
                out_of_scope_reason(
                    "taska_permata_no_preschool_child",
                    language,
                    min_age=PRESCHOOL_AGE_MIN,
                    max_age=PRESCHOOL_AGE_MAX,
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

    child_count = len(preschool_children)
    annual_rm = MONTHLY_SUBSIDY_RM * SUBSIDY_MONTHS_PER_YEAR * child_count
    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        child_count=child_count,
        monthly_subsidy_rm=MONTHLY_SUBSIDY_RM,
        annual_rm=annual_rm,
        household_income=household_income,
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
