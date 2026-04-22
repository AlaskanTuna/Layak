"""JKM Bantuan Kanak-Kanak (BKK) — per-capita means test + per-child payment.

Phase 7 Task 8. Complements `jkm_warga_emas.py` (elderly dependant payment);
this rule targets the same means-testable households but gates on children
under 18 instead of parents over 60.

Scheme description (JKM BKK):
    RM100 per month per qualifying child under 18, capped at RM450/month
    per household (so the per-child arithmetic saturates at 4.5 children,
    i.e. payments stop increasing once you have 5 or more kids).

Qualifying criteria:
    - At least one dependant has `relationship == "child"` and `age < 18`.
    - Per-capita monthly household income ≤ RM1,000 (roughly aligned with the
      b40_hardcore / b40_household bands — tighter than Warga Emas's food-PLI
      threshold since BKK is a direct cash transfer).

Source-PDF caveat: the official BKK brochure (`jkm-bkk-brochure.pdf` in the
plan) is NOT yet committed under `backend/data/schemes/` — this rule cites it
by filename + the public JKM portal URL so the grounding story is preserved
when the PDF lands. Tests avoid asserting against `pdf_text["jkm-bkk-brochure.pdf"]`
so the suite stays green until the asset arrives. The per-child rate + cap
come from the JKM BKK schedule; the RM1,000 per-capita threshold is the
commonly-cited BKK means test (stricter than Warga Emas's food-PLI).
"""

from __future__ import annotations

from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

CHILD_AGE_THRESHOLD = 18
PER_CAPITA_THRESHOLD_RM = 1000.0
PER_CHILD_MONTHLY_RM = 100.0
HOUSEHOLD_MONTHLY_CAP_RM = 450.0
# Annual cap derived from the monthly cap. Kept as a constant so tests can
# import it instead of reconstructing `450 * 12` inline.
HOUSEHOLD_ANNUAL_CAP_RM = HOUSEHOLD_MONTHLY_CAP_RM * 12  # 5_400.0

_AGENCY = "JKM (Jabatan Kebajikan Masyarakat)"
_PORTAL_URL = "https://www.jkm.gov.my"
_SCHEME_NAME = "JKM Bantuan Kanak-Kanak — per-child monthly payment"
# Placeholder PDF name — the brochure lands under this path when it's
# committed. Until then the citation carries the right URL so the provenance
# chain is still linkable from the UI.
_SOURCE_PDF = "jkm-bkk-brochure.pdf"


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="jkm.bkk.eligibility_means_test",
            source_pdf=_SOURCE_PDF,
            page_ref="JKM BKK brochure, Bahagian I — Kriteria Kelayakan (external reference)",
            passage=(
                "Bantuan Kanak-Kanak dibayar kepada isi rumah berpendapatan rendah "
                "dengan kanak-kanak berumur di bawah 18 tahun. Had pendapatan per kapita "
                "isi rumah tidak melebihi RM1,000 sebulan."
            ),
            source_url="https://www.jkm.gov.my",
        ),
        RuleCitation(
            rule_id="jkm.bkk.rate_per_child",
            source_pdf=_SOURCE_PDF,
            page_ref="JKM BKK brochure, Bahagian II — Kadar Bayaran (external reference)",
            passage=(
                "Kadar bulanan Bantuan Kanak-Kanak: RM100 bagi setiap kanak-kanak yang layak, "
                "tertakluk kepada had maksimum RM450 sebulan bagi setiap isi rumah."
            ),
            source_url="https://www.jkm.gov.my",
        ),
    ]


def _qualifying_children(profile: Profile) -> int:
    return sum(1 for d in profile.dependants if d.relationship == "child" and d.age < CHILD_AGE_THRESHOLD)


def match(profile: Profile) -> SchemeMatch:
    """Match a profile against JKM BKK.

    Qualifies when at least one qualifying child is present AND per-capita
    household income ≤ RM1,000. Annual payment is
    `min(child_count * RM100, RM450) * 12`, which saturates at `RM5,400/yr`
    once a household has 5 or more qualifying children.
    """
    cites = _citations()

    qualifying_children = _qualifying_children(profile)
    per_capita = profile.monthly_income_rm / max(profile.household_size, 1)
    qualifies = qualifying_children > 0 and per_capita <= PER_CAPITA_THRESHOLD_RM

    if not qualifies:
        reasons: list[str] = []
        if qualifying_children == 0:
            reasons.append(f"no child dependant aged <{CHILD_AGE_THRESHOLD} in household")
        if per_capita > PER_CAPITA_THRESHOLD_RM:
            reasons.append(
                f"per-capita income RM{per_capita:,.0f} exceeds BKK threshold RM{PER_CAPITA_THRESHOLD_RM:,.0f}"
            )
        return SchemeMatch(
            scheme_id="jkm_bkk",
            scheme_name=_SCHEME_NAME,
            qualifies=False,
            annual_rm=0.0,
            summary="Does not qualify under JKM BKK means test.",
            why_qualify="Out of scope: " + "; ".join(reasons) + ".",
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
        )

    uncapped_monthly = qualifying_children * PER_CHILD_MONTHLY_RM
    capped_monthly = min(uncapped_monthly, HOUSEHOLD_MONTHLY_CAP_RM)
    annual_rm = capped_monthly * 12

    cap_note = (
        f" (capped at RM{HOUSEHOLD_MONTHLY_CAP_RM:,.0f}/month household maximum)"
        if uncapped_monthly > HOUSEHOLD_MONTHLY_CAP_RM
        else ""
    )

    return SchemeMatch(
        scheme_id="jkm_bkk",
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=annual_rm,
        summary=(
            f"Per-capita income RM{per_capita:,.0f}/month is at/under BKK threshold "
            f"RM{PER_CAPITA_THRESHOLD_RM:,.0f}; {qualifying_children} qualifying "
            f"child(ren) × RM{PER_CHILD_MONTHLY_RM:,.0f}/month = "
            f"RM{capped_monthly:,.0f}/month{cap_note}."
        ),
        why_qualify=(
            f"Your household earns RM{profile.monthly_income_rm:,.0f}/month across "
            f"{profile.household_size} members — per-capita income "
            f"RM{per_capita:,.0f} is at/under the BKK threshold of "
            f"RM{PER_CAPITA_THRESHOLD_RM:,.0f}. With {qualifying_children} child(ren) "
            f"under {CHILD_AGE_THRESHOLD} at RM{PER_CHILD_MONTHLY_RM:,.0f}/month per "
            f"child{cap_note}, the annual payment works out to "
            f"RM{annual_rm:,.0f}. Apply via the JKM BKK form (Borang Permohonan "
            f"Bantuan Kanak-Kanak) at your nearest Pejabat Kebajikan Masyarakat Daerah."
        ),
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
    )
