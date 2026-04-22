"""PERKESO SKSPS — Self-Employed Employment Injury Scheme (Akta 789).

Phase 7 Task 9. Unlike the other four rules in this package, SKSPS is a
**required contribution**, not an upside. Gig drivers under Akta 789 MUST
contribute monthly (RM19.40–RM49.70 depending on declared monthly income
bracket); Layak surfaces the contribution tier so the user knows what they
owe, but the amount does NOT stack into the annual-relief total.

Implementation notes:
  - `kind="required_contribution"` on the emitted `SchemeMatch` tells the
    frontend to render this in a separate "Required contributions" block.
  - `annual_rm` is always `0.0` — the rule engine + `compute_upside` step
    sum `annual_rm`, so zero keeps the upside total math-correct.
  - The actual annual contribution lives on `annual_contribution_rm`.

Akta 789 eligibility:
  - `employment_type == "gig"` (Profile.form_type == "form_b" in our mapping).
  - Age 18–60 inclusive.

Contribution-plan tiers (PERKESO SKSPS Jadual Caruman, 2024 rates):
    Plan 1: monthly income ≤ RM1,050   → RM19.40/month  → RM232.80/yr
    Plan 2: monthly income ≤ RM1,550   → RM24.90/month  → RM298.80/yr
    Plan 3: monthly income ≤ RM2,950   → RM36.90/month  → RM442.80/yr
    Plan 4: monthly income  > RM2,950  → RM49.70/month  → RM596.40/yr

Source-PDF caveat: the official `perkeso-sksps-rates.pdf` is NOT yet
committed under `backend/data/schemes/` — same pattern as `jkm_bkk.py`.
The rule cites the brochure filename + PERKESO portal URL so the
provenance chain stays linkable when the PDF lands; tests avoid
`pdf_text["perkeso-sksps-rates.pdf"]` assertions.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

# Eligibility window
GIG_AGE_MIN = 18
GIG_AGE_MAX = 60


@dataclass(frozen=True, slots=True)
class _SkspsPlan:
    tier: int
    monthly_rm: float
    annual_rm: float
    income_ceiling_rm: float | None  # None = open-ended top tier

    @property
    def label(self) -> str:
        return f"Plan {self.tier}"


# Ordered lowest-income tier first; the first plan whose ceiling the income
# does not exceed applies. The last plan has `income_ceiling_rm=None` —
# matches any income above the previous plan's ceiling.
_PLANS: tuple[_SkspsPlan, ...] = (
    _SkspsPlan(tier=1, monthly_rm=19.40, annual_rm=232.80, income_ceiling_rm=1050.0),
    _SkspsPlan(tier=2, monthly_rm=24.90, annual_rm=298.80, income_ceiling_rm=1550.0),
    _SkspsPlan(tier=3, monthly_rm=36.90, annual_rm=442.80, income_ceiling_rm=2950.0),
    _SkspsPlan(tier=4, monthly_rm=49.70, annual_rm=596.40, income_ceiling_rm=None),
)


def _plan_for_income(monthly_income_rm: float) -> _SkspsPlan:
    for plan in _PLANS:
        if plan.income_ceiling_rm is None or monthly_income_rm <= plan.income_ceiling_rm:
            return plan
    # Unreachable — last plan has ceiling None and always matches.
    return _PLANS[-1]


_AGENCY = "PERKESO (SOCSO)"
_PORTAL_URL = "https://www.perkeso.gov.my"
_SCHEME_NAME = "PERKESO SKSPS — Self-Employed Social Security"
_SOURCE_PDF = "perkeso-sksps-rates.pdf"


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="perkeso.sksps.akta_789_eligibility",
            source_pdf=_SOURCE_PDF,
            page_ref="Akta 789 · Skim Keselamatan Sosial Pekerjaan Sendiri (external reference)",
            passage=(
                "Semua pekerja sendiri yang berumur antara 18 hingga 60 tahun dan bekerja "
                "dalam sektor pengangkutan penumpang (termasuk e-hailing seperti Grab) wajib "
                "mendaftar dan membuat caruman bulanan di bawah Akta 789 (Akta Keselamatan "
                "Sosial Pekerjaan Sendiri 2017)."
            ),
            source_url="https://www.perkeso.gov.my",
        ),
        RuleCitation(
            rule_id="perkeso.sksps.plan_schedule",
            source_pdf=_SOURCE_PDF,
            page_ref="Jadual Caruman SKSPS — 4-tier income bracket (external reference)",
            passage=(
                "Jadual Caruman SKSPS: Plan 1 (pendapatan bulanan ≤ RM1,050, caruman "
                "RM19.40/bulan); Plan 2 (≤ RM1,550, RM24.90/bulan); Plan 3 (≤ RM2,950, "
                "RM36.90/bulan); Plan 4 (> RM2,950, RM49.70/bulan)."
            ),
            source_url="https://www.perkeso.gov.my",
        ),
    ]


def match(profile: Profile) -> SchemeMatch:
    """Match a self-employed profile against SKSPS + compute the contribution plan.

    Qualifies when `form_type == "form_b"` (self-employed / gig) AND the
    profile's age is 18–60 inclusive. Emits a `required_contribution` match
    with `annual_rm=0.0` (so upside math stays correct) and
    `annual_contribution_rm` set to the selected plan's annual amount.
    """
    cites = _citations()
    is_gig = profile.form_type == "form_b"
    age_in_window = GIG_AGE_MIN <= profile.age <= GIG_AGE_MAX
    qualifies = is_gig and age_in_window

    if not qualifies:
        reasons: list[str] = []
        if not is_gig:
            reasons.append("SKSPS only applies to self-employed / gig filers (Form B)")
        if not age_in_window:
            reasons.append(
                f"applicant age {profile.age} is outside the Akta 789 window "
                f"({GIG_AGE_MIN}–{GIG_AGE_MAX})"
            )
        return SchemeMatch(
            scheme_id="perkeso_sksps",
            scheme_name=_SCHEME_NAME,
            qualifies=False,
            annual_rm=0.0,
            summary="Does not qualify under SKSPS eligibility.",
            why_qualify="Out of scope: " + "; ".join(reasons) + ".",
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
            kind="required_contribution",
            annual_contribution_rm=None,
        )

    plan = _plan_for_income(profile.monthly_income_rm)
    ceiling_note = (
        f"(income > RM{_PLANS[-2].income_ceiling_rm:,.0f})"
        if plan.income_ceiling_rm is None
        else f"(income ≤ RM{plan.income_ceiling_rm:,.0f})"
    )

    return SchemeMatch(
        scheme_id="perkeso_sksps",
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        # Annual RM upside is ZERO for a contribution scheme — this is money
        # the user PAYS. Keeping it at 0.0 means `compute_upside.py`'s sum
        # over `annual_rm` stays correct without needing a filter there.
        annual_rm=0.0,
        summary=(
            f"{plan.label}: RM{plan.monthly_rm:.2f}/month → "
            f"RM{plan.annual_rm:.2f}/year mandatory contribution under Akta 789 {ceiling_note}."
        ),
        why_qualify=(
            f"As a self-employed / gig filer aged {profile.age} with monthly income of "
            f"RM{profile.monthly_income_rm:,.2f}, you fall under the Akta 789 mandate for "
            f"PERKESO SKSPS registration. Your income bracket places you on "
            f"{plan.label} of the SKSPS Jadual Caruman: RM{plan.monthly_rm:.2f}/month "
            f"(RM{plan.annual_rm:.2f}/year). Register via SKSPS-1 at {_PORTAL_URL}. "
            "This is a MANDATORY contribution — Layak surfaces it alongside your "
            "qualifying schemes so you can budget for it; it does NOT stack into your "
            "annual relief total."
        ),
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
        kind="required_contribution",
        annual_contribution_rm=plan.annual_rm,
    )
