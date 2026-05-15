"""SPBT — Skim Pinjaman Buku Teks (free textbook loan, MOE).

SPBT is MOE's universal textbook-loan programme. Universalised in 2008 —
every Malaysian citizen enrolled in a government or government-aided
school (Year 1–Form 5; includes national, national-type Chinese/Tamil,
sekolah agama bantuan kerajaan, sekolah berasrama penuh) receives the
textbook set free of charge on loan from the school's SPBT inventory.

Eligibility (Layak's proxy):
    Any `dependants[*]` with `relationship == "child"` AND `age` in
    [SCHOOL_AGE_MIN, SCHOOL_AGE_MAX]. Citizenship is implicit on the
    Layak intake flow. Private-school + MRSM + special-ed are out of
    scope but Layak does not collect school-type so we surface SPBT
    universally — the school registers the textbook loan, not Layak.

Benefits (in-kind, surfaced as `subsidy_credit`):
    Per-child textbook set value estimated at RM250/year (Year 1–Form 5
    set price range RM200–300 across syllabi). The card surfaces
    eligibility for parental awareness; no application is required.
"""

from __future__ import annotations

from app.config import getenv
from app.rules._i18n import out_of_scope_reason, scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

SCHOOL_AGE_MIN = 7
SCHOOL_AGE_MAX = 17
PER_CHILD_VALUE_RM = 250.0

_SCHEME_ID = "spbt"
_SCHEME_NAME = "SPBT — Skim Pinjaman Buku Teks"
_AGENCY = "KPM (Ministry of Education Malaysia)"
_PORTAL_URL = "https://www.moe.gov.my/en/bantuan-pembelajaran-menu/skim-pinjaman-buku-teks-spbt"
_SOURCE_PDF = "spbt-circular.pdf"

# Vertex AI Search grounds the primary citation against the live source PDF.
# URI filter constrains the snippet ranker to the expected document so the
# rule cannot accidentally cite a different scheme's PDF.
_RAG_QUERY = getenv(
    "LAYAK_RAG_QUERY_SPBT",
    "Skim Pinjaman Buku Teks textbook loan school",
)
_RAG_URI_SUBSTRING = "spbt-circular.pdf"


def _citations() -> list[RuleCitation]:
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id="rag.spbt.primary",
        fallback_pdf="spbt-circular.pdf",
    )
    if rag is not None:
        cites.append(rag)
    cites.extend([
        RuleCitation(
            rule_id="spbt.universal_eligibility",
            source_pdf=_SOURCE_PDF,
            page_ref="MOE SPBT programme page",
            passage=(
                "Skim Pinjaman Buku Teks (SPBT) extends a textbook loan to "
                "every Malaysian citizen enrolled in a government or "
                "government-aided school. The means-test thresholds in force "
                "prior to 2008 were rescinded when SPBT was universalised."
            ),
            source_url="https://www.moe.gov.my/en/bantuan-pembelajaran-menu/skim-pinjaman-buku-teks-spbt",
        ),
        RuleCitation(
            rule_id="spbt.scope_2026",
            source_pdf=_SOURCE_PDF,
            page_ref="BSTP textbook-stock briefing 2026",
            passage=(
                "Eligible schools include national, national-type Chinese, "
                "national-type Tamil, agama bantuan kerajaan, and sekolah "
                "berasrama penuh. Excluded: private schools, MRSM, and "
                "special-education schools (covered by separate programmes)."
            ),
            source_url="https://www.moe.gov.my/en/corporate/divisions-and-units/bahagian-sumber-dan-teknologi-pendidikan",
        ),
    ])
    return cites


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    cites = _citations()
    school_children = [
        d
        for d in profile.dependants
        if d.relationship == "child" and SCHOOL_AGE_MIN <= d.age <= SCHOOL_AGE_MAX
    ]
    qualifies = bool(school_children)

    if not qualifies:
        reasons = [
            out_of_scope_reason(
                "spbt_no_school_age_child",
                language,
                min_age=SCHOOL_AGE_MIN,
                max_age=SCHOOL_AGE_MAX,
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

    child_count = len(school_children)
    annual_value_rm = PER_CHILD_VALUE_RM * child_count
    copy = scheme_copy(
        _SCHEME_ID,
        "qualify",
        language,
        child_count=child_count,
        per_child_value_rm=PER_CHILD_VALUE_RM,
        annual_value_rm=annual_value_rm,
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
