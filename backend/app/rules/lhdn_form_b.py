"""LHDN Form B — five personal reliefs for YA 2025.

Source of truth: `backend/data/schemes/pr-no-4-2024.pdf` (Public Ruling No.
4/2024, `Taxation of a Resident Individual — Part I: Gifts or Contributions
and Allowable Deductions`, dated 27 December 2024). Relief caps + ITA
paragraph references transcribed from the PR; the test module asserts every
RM value appears verbatim on the cited page.

Filing window reference: `backend/data/schemes/rf-filing-programme-for-2026.pdf`
(LHDN Return-Form Filing Programme 2026). Example 2 on doc p.2 sets the Form B
submission deadline to 30 June 2026 with a 15-day e-Filing grace period.

Tax-saving estimate uses the YA2025 chargeable-income bracket schedule (see
`_malaysia_tax_ya2025` below) applied twice: once against the unreduced annual
income and once after subtracting the sum of applicable reliefs. The delta is
the realistic annual upside the user sees.
"""

from __future__ import annotations

from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch

SUPPORTED_YA = "ya_2025"
if SUPPORTED_YA != "ya_2025":
    raise ImportError(
        f"lhdn_form_b only supports YA 2025; caps below are not validated for {SUPPORTED_YA!r}. "
        "Update the cap constants against the matching-year Public Ruling before changing this."
    )

# Relief caps (RM) — pr-no-4-2024.pdf.
# Each cap is asserted to appear on its cited page in test_lhdn_form_b.py.
INDIVIDUAL_RELIEF_RM = 9000.0
PARENT_MEDICAL_CAP_RM = 8000.0
CHILD_16A_PER_CHILD_RM = 2000.0
EPF_LIFE_17_COMBINED_CAP_RM = 7000.0
LIFESTYLE_9_CAP_RM = 2500.0

_FORM_B_DEADLINE = "30 June 2026"
_AGENCY = "LHDN (HASiL)"
_PORTAL_URL = "https://mytax.hasil.gov.my"
_SCHEME_NAME = "LHDN Form B — five YA2025 reliefs"

# YA2025 personal income tax brackets for resident individuals (Schedule 1, ITA).
# Stored as (upper bound of chargeable income, marginal rate).
_TAX_BRACKETS_YA2025: list[tuple[float, float]] = [
    (5_000.0, 0.00),
    (20_000.0, 0.01),
    (35_000.0, 0.03),
    (50_000.0, 0.06),
    (70_000.0, 0.11),
    (100_000.0, 0.19),
    (400_000.0, 0.25),
    (600_000.0, 0.26),
    (2_000_000.0, 0.28),
    (float("inf"), 0.30),
]


def _malaysia_tax_ya2025(chargeable_rm: float) -> float:
    """Compute personal income tax on a chargeable-income amount using YA2025 brackets."""
    if chargeable_rm <= 0:
        return 0.0
    tax = 0.0
    prev = 0.0
    remaining = chargeable_rm
    for upper, rate in _TAX_BRACKETS_YA2025:
        span = min(upper - prev, remaining)
        if span <= 0:
            break
        tax += span * rate
        remaining -= span
        prev = upper
        if remaining <= 0:
            break
    return round(tax, 2)


def _citations() -> list[RuleCitation]:
    return [
        RuleCitation(
            rule_id="lhdn.form_b.individual_relief",
            source_pdf="pr-no-4-2024.pdf",
            page_ref="PR 4/2024 §6.1 (doc p.9) — ITA paragraph 46(1)(a)",
            passage=(
                "Paragraph 46(1)(a) of the ITA provides that a deduction of RM9,000 is "
                "allowed to every individual who has total income and is assessed in his own name."
            ),
            source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
        ),
        RuleCitation(
            rule_id="lhdn.form_b.parent_medical",
            source_pdf="pr-no-4-2024.pdf",
            page_ref="PR 4/2024 §6.2.1 (doc p.9) — ITA paragraph 46(1)(c)",
            passage=(
                "A deduction up to a maximum of RM8,000 is allowed to an individual on "
                "the expenses incurred by him for the medical treatment, special needs "
                "or carer expenses for parents."
            ),
            source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
        ),
        RuleCitation(
            rule_id="lhdn.form_b.child_16a",
            source_pdf="pr-no-4-2024.pdf",
            page_ref="PR 4/2024 §6.18.2(a) (doc p.41) — ITA paragraphs 48(1)(a), 48(2)(a)",
            passage=(
                "A deduction of RM2,000 for an unmarried child who at any time in the "
                "basis year is under the age of 18 years."
            ),
            source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
        ),
        RuleCitation(
            rule_id="lhdn.form_b.epf_life_17",
            source_pdf="pr-no-4-2024.pdf",
            page_ref="PR 4/2024 §6.20 (doc p.47) — ITA paragraph 49(1)(a)",
            passage=(
                "Life insurance premium / family Takaful contribution payments of up to "
                "RM7,000 under paragraph 49(1)(a) of the ITA."
            ),
            source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
        ),
        RuleCitation(
            rule_id="lhdn.form_b.lifestyle_9",
            source_pdf="pr-no-4-2024.pdf",
            page_ref="PR 4/2024 §6.11.3 (doc p.29)",
            passage=(
                "The total deduction for the amount expended under this paragraph is "
                "subject to a maximum amount of RM2,500."
            ),
            source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
        ),
        RuleCitation(
            rule_id="lhdn.form_b.filing_deadline",
            source_pdf="rf-filing-programme-for-2026.pdf",
            page_ref="RF Filing Programme 2026, doc p.2, Example 2",
            passage=(
                "The due date for submission of Form B for Year of Assessment 2025 is "
                "30 June 2026. Grace period is given until 15 July 2026 for the e-Filing."
            ),
            source_url="https://www.hasil.gov.my/media/fqog1423/rf-filing-programme-for-2026.pdf",
        ),
    ]


def _applicable_reliefs(profile: Profile) -> dict[str, float]:
    """Return the per-relief cap amounts that apply to this profile."""
    children_under_18 = sum(1 for d in profile.dependants if d.relationship == "child" and d.age < 18)
    has_parent_dependant = any(d.relationship == "parent" for d in profile.dependants)

    reliefs: dict[str, float] = {
        "individual": INDIVIDUAL_RELIEF_RM,
        "lifestyle_9": LIFESTYLE_9_CAP_RM,
        "epf_life_17": EPF_LIFE_17_COMBINED_CAP_RM,
    }
    if has_parent_dependant:
        reliefs["parent_medical"] = PARENT_MEDICAL_CAP_RM
    if children_under_18 > 0:
        reliefs["child_16a"] = CHILD_16A_PER_CHILD_RM * children_under_18
    return reliefs


def match(profile: Profile) -> SchemeMatch:
    """Match a profile against the five Form B YA2025 reliefs.

    Qualifies when `profile.form_type == "form_b"`. The tax saving is the delta
    between YA2025 bracketed tax on unreduced vs reduced chargeable income.
    """
    cites = _citations()

    if profile.form_type != "form_b":
        return SchemeMatch(
            scheme_id="lhdn_form_b",
            scheme_name=_SCHEME_NAME,
            qualifies=False,
            annual_rm=0.0,
            summary="Form B rule does not apply — profile filed under Form BE.",
            why_qualify="Out of scope: only Form B (self-employed) filers qualify for this rule.",
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
        )

    reliefs = _applicable_reliefs(profile)
    total_relief = sum(reliefs.values())
    annual_income = profile.monthly_income_rm * 12

    tax_before = _malaysia_tax_ya2025(annual_income)
    tax_after = _malaysia_tax_ya2025(max(0.0, annual_income - total_relief))
    saving = round(tax_before - tax_after, 2)

    if saving <= 0:
        return SchemeMatch(
            scheme_id="lhdn_form_b",
            scheme_name=_SCHEME_NAME,
            qualifies=False,
            annual_rm=0.0,
            summary=(f"Total relief RM{total_relief:,.0f} already exceeds chargeable income — no further tax saving."),
            why_qualify=(
                f"Out of scope: annual chargeable income RM{annual_income:,.0f} produces "
                f"zero tax under YA2025 brackets even before reliefs — nothing to save."
            ),
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
        )

    applied = ", ".join(f"{k} (RM{v:,.0f})" for k, v in reliefs.items())
    return SchemeMatch(
        scheme_id="lhdn_form_b",
        scheme_name=_SCHEME_NAME,
        qualifies=True,
        annual_rm=saving,
        summary=(
            f"Applied YA2025 reliefs totalling RM{total_relief:,.0f} against annual "
            f"income RM{annual_income:,.0f}; estimated tax saving RM{saving:,.0f}."
        ),
        why_qualify=(
            f"As a Form B (self-employed) filer with an annual income of RM{annual_income:,.0f}, "
            f"the following YA2025 reliefs stack: {applied}. Applying them reduces your "
            f"chargeable income by RM{total_relief:,.0f} and your tax bill by "
            f"RM{saving:,.0f}/year. The Form B filing deadline is {_FORM_B_DEADLINE}."
        ),
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
    )
