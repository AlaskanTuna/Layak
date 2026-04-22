"""STR 2026 — household-with-children tier rule engine.

Source of truth: `backend/data/schemes/risalah-str-2026.pdf`, page 2 (`SYARAT
KELAYAKAN` + `Nilai Bantuan STR & SARA 2026` tier table).

Scope for MVP (docs/plan.md Phase 1 Task 4):
    - Household tier only (Isi Rumah).
    - With-children buckets only (1-2, 3-4, ≥5). Couples without children
      (bucket 0) fall outside scope and return qualifies=False.
    - Two income bands: ≤RM2,500 and RM2,501-RM5,000. Above RM5,000 → no match.
    - Returns the STR amount ONLY. SARA is tracked separately in the same PDF and
      is out of scope per docs/prd.md §6.2 and docs/roadmap.md non-goals.

The tier amounts below are transcribed from the risalah's 4x2 tier table. The
test `backend/tests/test_str_2026.py` asserts every RM value appears verbatim on
page 2 of the source PDF.
"""

from __future__ import annotations

from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

# Income band ceilings (monthly household income, RM) — risalah p.2.
BAND_1_CEILING_RM = 2500.0
BAND_2_CEILING_RM = 5000.0

# STR annual amounts per (band, child_count_bucket) — risalah p.2 "Nilai Bantuan
# STR & SARA 2026" column labelled "STR (setahun)".
# Bucket 0 is included for completeness so the unit test can assert every PDF
# value resolves, but `match()` only returns qualifies=True for buckets 1+.
STR_HOUSEHOLD_ANNUAL_RM: dict[str, dict[str, float]] = {
    "le_2500": {
        "0": 700.0,
        "1_2": 1200.0,
        "3_4": 1700.0,
        "5_plus": 2200.0,
    },
    "2501_5000": {
        "0": 200.0,
        "1_2": 450.0,
        "3_4": 700.0,
        "5_plus": 950.0,
    },
}

_AGENCY = "LHDN (HASiL) / Ministry of Finance"
_PORTAL_URL = "https://bantuantunai.hasil.gov.my"
_SCHEME_NAME = "STR 2026 — Household with children tier"

# Phase 8 Task 3 — Vertex AI Search grounds the tier-table citation against the
# live risalah PDF. Query tuned against the standard-edition snippet ranker; the
# URI filter guards against cross-scheme drift (e.g. the query text could
# otherwise rank i-saraan-program.pdf above the STR risalah when both mention
# "Sumbangan Tunai Rahmah" in their Budget extracts).
_RAG_QUERY = "Sumbangan Tunai Rahmah household tier with children"
_RAG_URI_SUBSTRING = "risalah-str-2026.pdf"


def _child_bucket(children_under_18: int) -> str | None:
    """Return the tier-table bucket key for a given child count, or None if off-scope."""
    if children_under_18 <= 0:
        return None
    if children_under_18 <= 2:
        return "1_2"
    if children_under_18 <= 4:
        return "3_4"
    return "5_plus"


def _income_band(monthly_income_rm: float) -> str | None:
    """Return the tier-table band key for a given income, or None if above ceiling."""
    if monthly_income_rm <= BAND_1_CEILING_RM:
        return "le_2500"
    if monthly_income_rm <= BAND_2_CEILING_RM:
        return "2501_5000"
    return None


def _citations() -> list[RuleCitation]:
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id="rag.str_2026.primary",
        fallback_pdf="risalah-str-2026.pdf",
    )
    if rag is not None:
        cites.append(rag)
    cites.extend([
        RuleCitation(
            rule_id="str_2026.household_with_children.tier_table",
            source_pdf="risalah-str-2026.pdf",
            page_ref="p. 2",
            passage="Nilai Bantuan STR & SARA 2026 — Isi Rumah (Tiada Had Umur), tier table.",
            source_url="https://bantuantunai.hasil.gov.my/FAQ/RISALAH%20STR%202026.pdf",
        ),
        RuleCitation(
            rule_id="str_2026.eligibility.household",
            source_pdf="risalah-str-2026.pdf",
            page_ref="p. 2",
            passage=(
                "Pemohon: Lelaki atau wanita yang menjadi ketua keluarga dengan jumlah "
                "pendapatan kasar bulanan isi rumah RM5,000 dan ke bawah."
            ),
            source_url="https://bantuantunai.hasil.gov.my/FAQ/RISALAH%20STR%202026.pdf",
        ),
        RuleCitation(
            rule_id="str_2026.application_form",
            source_pdf="bk-01.pdf",
            page_ref="Borang BK-01",
            passage="Borang permohonan dan kemaskini untuk Sumbangan Tunai Rahmah 2026.",
            source_url=(
                "https://bantuantunai.hasil.gov.my/Borang/"
                "BK-01%20(Borang%20Permohonan%20&%20Kemaskini%20STR%202026).pdf"
            ),
        ),
    ])
    return cites


def _why_qualify(band: str, bucket: str, annual_rm: float, children: int, income: float) -> str:
    band_label = "≤RM2,500" if band == "le_2500" else "RM2,501–RM5,000"
    return (
        f"Your household earns RM{income:,.0f}/month, inside the {band_label} band. "
        f"You have {children} child(ren) under 18, placing you in the '{bucket.replace('_', '-')}' "
        f"children bucket. STR 2026 pays RM{annual_rm:,.0f}/year in two tranches under the "
        f"household-with-children tier. You still apply via BK-01 at "
        f"bantuantunai.hasil.gov.my — Layak drafts the form for you; the final "
        f"determination is LHDN's on application."
    )


def match(profile: Profile) -> SchemeMatch:
    """Match a profile against the STR 2026 household-with-children tier.

    Returns a SchemeMatch with `qualifies=True` if the profile has ≥1 child under
    18 and monthly income ≤RM5,000. All other cases return `qualifies=False` and
    `annual_rm=0` with the same citations, so the provenance panel can still
    explain the non-match.
    """
    children_under_18 = sum(1 for d in profile.dependants if d.relationship == "child" and d.age < 18)
    bucket = _child_bucket(children_under_18)
    band = _income_band(profile.monthly_income_rm)

    cites = _citations()

    if bucket is None or band is None:
        reasons: list[str] = []
        if bucket is None:
            reasons.append("no child under 18 in household")
        if band is None:
            reasons.append(f"income RM{profile.monthly_income_rm:,.0f} exceeds RM5,000 ceiling")
        return SchemeMatch(
            scheme_id="str_2026",
            scheme_name=_SCHEME_NAME,
            qualifies=False,
            annual_rm=0.0,
            summary="Does not qualify under STR 2026 household-with-children tier.",
            why_qualify="Out of scope: " + "; ".join(reasons) + ".",
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
        )

    annual_rm = STR_HOUSEHOLD_ANNUAL_RM[band][bucket]
    band_label = "≤RM2,500" if band == "le_2500" else "RM2,501–RM5,000"
    return SchemeMatch(
        scheme_id="str_2026",
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=annual_rm,
        summary=f"Household-with-children tier, income band {band_label}, {bucket.replace('_', '-')} children bucket.",
        why_qualify=_why_qualify(band, bucket, annual_rm, children_under_18, profile.monthly_income_rm),
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
    )
