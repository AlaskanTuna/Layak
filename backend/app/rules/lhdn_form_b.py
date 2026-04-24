"""LHDN Form B / Form BE — five personal reliefs for YA 2025.

Historical note: this module was originally Form-B-only; it was widened to
cover Form BE (salaried individuals) because every relief we cite — PR
4/2024 §6.1 (individual), §6.2.1 (parent medical), §6.18.2(a) (child #16a),
§6.19.3 (EPF + life insurance), §6.11.3 (lifestyle #9) — applies identically
to resident individuals under both filing categories.
The only differences that matter operationally are the filing deadline
(30 June 2026 for Form B, 30 April 2026 for Form BE) and the agency
portal copy; those are surfaced conditionally below. Module filename kept
as `lhdn_form_b.py` to preserve git-blame continuity; the rule emits
`scheme_id="lhdn_form_b"` or `"lhdn_form_be"` based on `profile.form_type`.

Source of truth: `backend/data/schemes/pr-no-4-2024.pdf` (Public Ruling No.
4/2024, `Taxation of a Resident Individual — Part I: Gifts or Contributions
and Allowable Deductions`, dated 27 December 2024). Relief caps + ITA
paragraph references transcribed from the PR; the test module asserts every
RM value appears verbatim on the cited page.

Filing window reference: `backend/data/schemes/rf-filing-programme-for-2026.pdf`
(LHDN Return-Form Filing Programme 2026):
- Example 2 on doc p.2 sets the Form B submission deadline to 30 June 2026.
- Example 1 on doc p.2 sets the Form BE submission deadline to 30 April 2026.
Both carry a 15-day e-Filing grace period.

Tax-saving estimate uses the YA2025 chargeable-income bracket schedule (see
`_malaysia_tax_ya2025` below) applied twice: once against the unreduced annual
income and once after subtracting the sum of applicable reliefs. The delta is
the realistic annual upside the user sees — identical arithmetic for Form B
and Form BE because the reliefs + brackets are shared.
"""

from __future__ import annotations

from app.config import getenv
from app.rules._i18n import scheme_copy
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import Profile
from app.schema.scheme import RuleCitation, SchemeMatch
from app.services.vertex_ai_search import get_primary_rag_citation

SUPPORTED_YA = "ya_2025"
if SUPPORTED_YA != "ya_2025":
    raise ImportError(
        f"lhdn_form_b only supports YA 2025; caps below are not validated for {SUPPORTED_YA!r}. "
        "Update the cap constants against the matching-year Public Ruling before changing this."
    )

# Relief caps (RM) — pr-no-4-2024.pdf. Each cap is asserted to appear on its
# cited page in test_lhdn_form_b.py.
INDIVIDUAL_RELIEF_RM = 9000.0
PARENT_MEDICAL_CAP_RM = 8000.0
CHILD_16A_PER_CHILD_RM = 2000.0
# PR §6.19.3 splits the combined life-insurance + EPF relief for non-public-
# servant individuals (YA2023+) into two separate sub-caps under paragraphs
# 49(1)(a) and 49(1)(b) of the ITA — RM3,000 for life insurance/family Takaful
# and RM4,000 for EPF. Summed, they equal the pre-YA2023 combined RM7,000.
# The public-servant flat RM7,000 under §49(1A)(c) was deleted effective YA2023.
LIFE_INSURANCE_CAP_RM = 3000.0
EPF_CAP_RM = 4000.0
EPF_LIFE_17_COMBINED_CAP_RM = LIFE_INSURANCE_CAP_RM + EPF_CAP_RM
LIFESTYLE_9_CAP_RM = 2500.0

_FORM_B_DEADLINE = "30 June 2026"
_FORM_BE_DEADLINE = "30 April 2026"
_AGENCY = "LHDN (HASiL)"
_PORTAL_URL = "https://mytax.hasil.gov.my"
_SCHEME_NAME_FORM_B = "LHDN Form B — five YA2025 reliefs"
_SCHEME_NAME_FORM_BE = "LHDN Form BE — five YA2025 reliefs"

# Vertex AI Search grounds the primary citation against the live source PDF.
# URI filter constrains the snippet ranker to the expected document so the
# rule cannot accidentally cite a different scheme's PDF.
_RAG_QUERY = getenv("LAYAK_RAG_QUERY_LHDN_FORM_B", "individual personal relief paragraph 46 RM9000")
_RAG_URI_SUBSTRING = "pr-no-4-2024.pdf"

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


def _citations(form_type: str) -> list[RuleCitation]:
    """Common relief citations plus the form-specific filing-deadline citation.

    The five reliefs apply identically under Form B and Form BE. Only the
    filing-deadline citation diverges — Example 1 vs Example 2 on doc p.2
    of the RF Filing Programme 2026.
    """
    cites: list[RuleCitation] = []
    rag = get_primary_rag_citation(
        query=_RAG_QUERY,
        uri_substring=_RAG_URI_SUBSTRING,
        rule_id=f"rag.lhdn.{ 'form_b' if form_type == 'form_b' else 'form_be' }.primary",
        fallback_pdf="pr-no-4-2024.pdf",
    )
    if rag is not None:
        cites.append(rag)
    citation_prefix = "lhdn.form_b" if form_type == "form_b" else "lhdn.form_be"
    reliefs = [
        RuleCitation(
            rule_id=f"{citation_prefix}.individual_relief",
            source_pdf="pr-no-4-2024.pdf",
            page_ref="PR 4/2024 §6.1 (doc p.9) — ITA paragraph 46(1)(a)",
            passage=(
                "Paragraph 46(1)(a) of the ITA provides that a deduction of RM9,000 is "
                "allowed to every individual who has total income and is assessed in his own name."
            ),
            source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
        ),
        RuleCitation(
            rule_id=f"{citation_prefix}.parent_medical",
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
            rule_id=f"{citation_prefix}.child_16a",
            source_pdf="pr-no-4-2024.pdf",
            page_ref="PR 4/2024 §6.18.2(a) (doc p.41) — ITA paragraphs 48(1)(a), 48(2)(a)",
            passage=(
                "A deduction of RM2,000 for an unmarried child who at any time in the "
                "basis year is under the age of 18 years."
            ),
            source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
        ),
        RuleCitation(
            rule_id=f"{citation_prefix}.epf_life_17",
            source_pdf="pr-no-4-2024.pdf",
            page_ref="PR 4/2024 §6.19 / §6.19.3 (doc p.46–48) — ITA paragraphs 49(1)(a), 49(1)(b)",
            passage=(
                "§6.19.3 table: effective YA 2023, individuals (other than public servants) "
                "are restricted to RM3,000 for life insurance premium / family Takaful "
                "contribution under paragraph 49(1)(a) and RM4,000 for EPF contributions "
                "under paragraph 49(1)(b) — combined relief up to RM7,000."
            ),
            source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
        ),
        RuleCitation(
            rule_id=f"{citation_prefix}.lifestyle_9",
            source_pdf="pr-no-4-2024.pdf",
            page_ref="PR 4/2024 §6.11.3 (doc p.29)",
            passage=(
                "The total deduction for the amount expended under this paragraph is "
                "subject to a maximum amount of RM2,500."
            ),
            source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
        ),
    ]
    if form_type == "form_b":
        reliefs.append(
            RuleCitation(
                rule_id="lhdn.form_b.filing_deadline",
                source_pdf="rf-filing-programme-for-2026.pdf",
                page_ref="RF Filing Programme 2026, doc p.2, Example 2",
                passage=(
                    "The due date for submission of Form B for Year of Assessment 2025 is "
                    "30 June 2026. Grace period is given until 15 July 2026 for the e-Filing."
                ),
                source_url="https://www.hasil.gov.my/media/fqog1423/rf-filing-programme-for-2026.pdf",
            )
        )
    else:
        reliefs.append(
            RuleCitation(
                rule_id="lhdn.form_be.filing_deadline",
                source_pdf="rf-filing-programme-for-2026.pdf",
                page_ref="RF Filing Programme 2026, doc p.2, Example 1",
                passage=(
                    "The due date for submission of Form BE for Year of Assessment 2025 is "
                    "30 April 2026. Grace period is given until 15 May 2026 for the e-Filing."
                ),
                source_url="https://www.hasil.gov.my/media/fqog1423/rf-filing-programme-for-2026.pdf",
            )
        )
    cites.extend(reliefs)
    return cites


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


def match(
    profile: Profile,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> SchemeMatch:
    """Match a profile against the five YA2025 personal reliefs.

    Qualifies for BOTH Form B (self-employed) and Form BE (salaried) filers —
    the five reliefs (individual, parent medical, child #16a, EPF + life,
    lifestyle) apply identically to any resident individual. The tax saving
    is the delta between YA2025 bracketed tax on unreduced vs reduced
    chargeable income; identical arithmetic across forms.

    The emitted `scheme_id` and `scheme_name` vary with `profile.form_type` so
    the frontend + template router can surface the right filing deadline and
    agency-form layout. See module docstring for the Form B vs BE divergences.
    """
    is_form_b = profile.form_type == "form_b"
    scheme_id = "lhdn_form_b" if is_form_b else "lhdn_form_be"
    scheme_name = _SCHEME_NAME_FORM_B if is_form_b else _SCHEME_NAME_FORM_BE
    deadline = _FORM_B_DEADLINE if is_form_b else _FORM_BE_DEADLINE
    filer_category = "self-employed" if is_form_b else "salaried"
    form_label = "Form B" if is_form_b else "Form BE"
    cites = _citations(profile.form_type)

    reliefs = _applicable_reliefs(profile)
    total_relief = sum(reliefs.values())
    annual_income = profile.monthly_income_rm * 12

    tax_before = _malaysia_tax_ya2025(annual_income)
    tax_after = _malaysia_tax_ya2025(max(0.0, annual_income - total_relief))
    saving = round(tax_before - tax_after, 2)

    if saving <= 0:
        copy = scheme_copy(
            scheme_id,
            "out_of_scope",
            language,
            total_relief=total_relief,
            annual_income=annual_income,
        )
        return SchemeMatch(
            scheme_id=scheme_id,
            scheme_name=scheme_name,
            qualifies=False,
            annual_rm=0.0,
            summary=copy["summary"],
            why_qualify=copy["why_qualify"],
            agency=_AGENCY,
            portal_url=_PORTAL_URL,
            rule_citations=cites,
        )

    applied = ", ".join(f"{k} (RM{v:,.0f})" for k, v in reliefs.items())
    copy = scheme_copy(
        scheme_id,
        "qualify",
        language,
        form_label=form_label,
        filer_category=filer_category,
        annual_income=annual_income,
        total_relief=total_relief,
        saving=saving,
        applied=applied,
        deadline=deadline,
    )
    return SchemeMatch(
        scheme_id=scheme_id,
        scheme_name=scheme_name,
        qualifies=True,
        annual_rm=saving,
        summary=copy["summary"],
        why_qualify=copy["why_qualify"],
        agency=_AGENCY,
        portal_url=_PORTAL_URL,
        rule_citations=cites,
    )
