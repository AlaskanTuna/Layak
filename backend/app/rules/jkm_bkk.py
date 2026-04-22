"""JKM Bantuan Kanak-Kanak (BKK) — per-capita means test + age-tiered per-child payment.

Phase 7 Task 8. Complements `jkm_warga_emas.py` (elderly dependant payment);
this rule targets the same means-testable households but gates on children
under 18 instead of parents over 60.

Scheme description (JKM BKK, current Budget 2021 schedule per JKM SPK ISO 9001
procedure document, Oct 2024):
    RM200/month per qualifying child aged 6 and under
    RM150/month per qualifying child aged 7 to 17 (inclusive)
    Capped at RM1,000/month per household.

The pre-2021 schedule (RM100/child flat, RM450/household cap) is obsolete; the
asset at `backend/data/schemes/jkm-bkk-brochure.pdf` is the current SPK and
documents these rates verbatim under "BANTUAN BULANAN — BANTUAN KANAK-KANAK
(BKK)".

Qualifying criteria:
    - At least one dependant has `relationship == "child"` and `age < 18`.
    - Per-capita monthly household income ≤ RM1,000 (commonly-cited BKK means
      test, tighter than Warga Emas's food-PLI threshold since BKK is a direct
      cash transfer).
"""

from __future__ import annotations

from app.schema.profile import Dependant, Profile
from app.schema.scheme import RuleCitation, SchemeMatch

CHILD_AGE_THRESHOLD = 18
# Age boundary for the two per-child rate tiers. Children aged ≤ YOUNGER_BAND_AGE
# get the higher rate; older children (still under 18) get the lower rate.
YOUNGER_BAND_AGE = 6
PER_CAPITA_THRESHOLD_RM = 1000.0
PER_CHILD_MONTHLY_RM_YOUNGER = 200.0  # ages 0–6 inclusive
PER_CHILD_MONTHLY_RM_OLDER = 150.0  # ages 7–17 inclusive
HOUSEHOLD_MONTHLY_CAP_RM = 1000.0
# Annual cap derived from the monthly cap. Kept as a constant so tests can
# import it instead of reconstructing `1000 * 12` inline.
HOUSEHOLD_ANNUAL_CAP_RM = HOUSEHOLD_MONTHLY_CAP_RM * 12  # 12_000.0

_AGENCY = "JKM (Jabatan Kebajikan Masyarakat)"
_PORTAL_URL = "https://www.jkm.gov.my"
_SCHEME_NAME = "JKM Bantuan Kanak-Kanak — per-child monthly payment"
# JKM SPK ISO 9001 procedure document (Oct 2024) — committed to
# backend/data/schemes/. Documents the current BKK rates verbatim.
_SOURCE_PDF = "jkm-bkk-brochure.pdf"


def _citations() -> list[RuleCitation]:
    return [
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
            page_ref="JKM SPK ISO 9001 — Bantuan Kanak-Kanak (BKK), Kadar Bantuan",
            passage=(
                "Kadar minimum sebanyak RM150 sehingga maksimum RM1,000 mengikut "
                "pecahan berikut: RM200 seorang bagi anak berumur 6 tahun dan ke bawah; "
                "RM150 seorang bagi anak berumur 7 tahun hingga 18 tahun; "
                "Kadar bantuan maksimum RM1,000/keluarga sebulan."
            ),
            source_url="https://www.jkm.gov.my/uploads/content-downloads/file_20241025152555.pdf",
        ),
    ]


def _qualifying_children(profile: Profile) -> list[Dependant]:
    """Return the list of child dependants under 18, in input order."""
    return [
        d
        for d in profile.dependants
        if d.relationship == "child" and d.age < CHILD_AGE_THRESHOLD
    ]


def _per_child_monthly_rm(age: int) -> float:
    """Map a qualifying child's age to its monthly Budget-2021 BKK rate."""
    return PER_CHILD_MONTHLY_RM_YOUNGER if age <= YOUNGER_BAND_AGE else PER_CHILD_MONTHLY_RM_OLDER


def match(profile: Profile) -> SchemeMatch:
    """Match a profile against JKM BKK.

    Qualifies when at least one qualifying child is present AND per-capita
    household income ≤ RM 1,000. Monthly payment sums the per-child rate
    (RM 200 for age ≤ 6, RM 150 for age 7–17), capped at RM 1,000/month per
    household. Annual = capped monthly × 12.
    """
    cites = _citations()

    qualifying_children = _qualifying_children(profile)
    per_capita = profile.monthly_income_rm / max(profile.household_size, 1)
    qualifies = len(qualifying_children) > 0 and per_capita <= PER_CAPITA_THRESHOLD_RM

    if not qualifies:
        reasons: list[str] = []
        if not qualifying_children:
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

    younger_count = sum(1 for d in qualifying_children if d.age <= YOUNGER_BAND_AGE)
    older_count = len(qualifying_children) - younger_count
    uncapped_monthly = (
        younger_count * PER_CHILD_MONTHLY_RM_YOUNGER + older_count * PER_CHILD_MONTHLY_RM_OLDER
    )
    capped_monthly = min(uncapped_monthly, HOUSEHOLD_MONTHLY_CAP_RM)
    annual_rm = capped_monthly * 12

    cap_note = (
        f" (capped at RM{HOUSEHOLD_MONTHLY_CAP_RM:,.0f}/month household maximum)"
        if uncapped_monthly > HOUSEHOLD_MONTHLY_CAP_RM
        else ""
    )

    breakdown_parts: list[str] = []
    if younger_count:
        breakdown_parts.append(
            f"{younger_count} × RM{PER_CHILD_MONTHLY_RM_YOUNGER:,.0f} (age ≤{YOUNGER_BAND_AGE})"
        )
    if older_count:
        breakdown_parts.append(
            f"{older_count} × RM{PER_CHILD_MONTHLY_RM_OLDER:,.0f} (age {YOUNGER_BAND_AGE + 1}–17)"
        )
    breakdown = " + ".join(breakdown_parts)

    return SchemeMatch(
        scheme_id="jkm_bkk",
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=annual_rm,
        summary=(
            f"Per-capita income RM{per_capita:,.0f}/month is at/under BKK threshold "
            f"RM{PER_CAPITA_THRESHOLD_RM:,.0f}; "
            f"{breakdown} = RM{capped_monthly:,.0f}/month{cap_note}."
        ),
        why_qualify=(
            f"Your household earns RM{profile.monthly_income_rm:,.0f}/month across "
            f"{profile.household_size} members — per-capita income "
            f"RM{per_capita:,.0f} is at/under the BKK threshold of "
            f"RM{PER_CAPITA_THRESHOLD_RM:,.0f}. Per current Budget 2021 rates: "
            f"{breakdown}{cap_note}, the annual payment works out to "
            f"RM{annual_rm:,.0f}. Apply via Borang Permohonan Bantuan Kanak-Kanak "
            f"at your nearest Pejabat Kebajikan Masyarakat Daerah."
        ),
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
    )
