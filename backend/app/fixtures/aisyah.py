"""Aisyah canned fixture — Grab driver, Kuantan, Form B filer (docs/prd.md §3.1).

Used by:
  - Stub FunctionTools (Phase 1 Task 1) while Gemini wiring is deferred to Task 3.
  - Demo-mode fallback path (FR-10) surfaced by the frontend.
  - Rule-engine unit tests (Phase 1 Task 4) as the expected-output baseline.

Numbers are deliberately defensible against the committed scheme PDFs under
backend/data/schemes/. Totals: STR 1,200 + JKM Warga Emas 7,200 + LHDN 1,008 =
RM9,408/year, clears the docs/plan.md Task 4 headline target of ≥RM7,000/year.
"""

from __future__ import annotations

from app.schema.profile import Dependant, HouseholdFlags, Profile
from app.schema.scheme import RuleCitation, SchemeMatch

AISYAH_PROFILE = Profile(
    name="Aisyah binti Ahmad",
    ic_last4="4321",
    age=34,
    monthly_income_rm=2800.0,
    household_size=4,
    dependants=[
        Dependant(relationship="child", age=10),
        Dependant(relationship="child", age=7),
        Dependant(relationship="parent", age=70),
    ],
    household_flags=HouseholdFlags(
        has_children_under_18=True,
        has_elderly_dependant=True,
        income_band="b40_household_with_children",
    ),
    form_type="form_b",
)


AISYAH_SCHEME_MATCHES: list[SchemeMatch] = [
    SchemeMatch(
        scheme_id="str_2026",
        scheme_name="STR 2026 — Household with children (tier 2)",
        qualifies=True,
        annual_rm=1200.0,
        summary="Household-with-children tier 2, income band RM2,501–5,000.",
        why_qualify=(
            "Your household earns RM2,800/month, inside the RM2,501–5,000 band. Two children "
            "under 18 trigger the household-with-children tier. STR 2026 pays two tranches "
            "totalling RM1,200 this year. You apply via BK-01 — Layak drafts it for you; "
            "the final determination is LHDN's on application."
        ),
        agency="LHDN (HASiL) / MOF",
        portal_url="https://bantuantunai.hasil.gov.my",
        rule_citations=[
            RuleCitation(
                rule_id="str_2026.household_with_children.tier_2",
                source_pdf="risalah-str-2026.pdf",
                page_ref="p. 3",
                passage="Isi rumah dengan anak bawah 18 tahun, pendapatan bulanan RM2,501–5,000 …",
                source_url="https://bantuantunai.hasil.gov.my/FAQ/RISALAH%20STR%202026.pdf",
            ),
            RuleCitation(
                rule_id="str_2026.application_form",
                source_pdf="bk-01.pdf",
                page_ref="Borang BK-01 (Permohonan & Kemaskini STR 2026)",
                passage="Borang permohonan dan kemaskini untuk Sumbangan Tunai Rahmah 2026.",
                source_url=(
                    "https://bantuantunai.hasil.gov.my/Borang/"
                    "BK-01%20(Borang%20Permohonan%20&%20Kemaskini%20STR%202026).pdf"
                ),
            ),
        ],
    ),
    SchemeMatch(
        scheme_id="jkm_warga_emas",
        scheme_name="JKM Warga Emas (dependent father, age 70)",
        qualifies=True,
        annual_rm=7200.0,
        summary="Per-capita income RM700/mo is below food-PLI RM1,236 — father qualifies.",
        why_qualify=(
            "Your father (age 70) lives in the household. Per-capita income is RM2,800 ÷ 4 "
            "= RM700/month — below the food-PLI threshold of RM1,236 (DOSM 2024). Budget 2026 "
            "gazetted rate is RM600/month (fallback RM500 where the uplift is pending). You "
            "apply on his behalf using JKM18."
        ),
        agency="JKM",
        portal_url="https://www.jkm.gov.my",
        rule_citations=[
            RuleCitation(
                rule_id="jkm.warga_emas.means_test_per_capita",
                source_pdf="jkm18.pdf",
                page_ref="p. 2",
                passage="Pendapatan isi rumah per kapita tidak melebihi had kemiskinan tegar.",
                source_url=(
                    "https://www.jkm.gov.my/jkm/uploads/files/Bahagian%20PW/"
                    "BORANG%20PERMOHONAN%20JKM%2018%20(2022)(1).pdf"
                ),
            ),
        ],
    ),
    SchemeMatch(
        scheme_id="lhdn_form_b",
        scheme_name="LHDN Form B — five reliefs (YA2025)",
        qualifies=True,
        annual_rm=1008.0,
        summary="Five stackable reliefs; tax delta estimated at RM1,008/year at the 3% bracket.",
        why_qualify=(
            "As a self-employed gig worker you file Form B (not Form BE). Five reliefs "
            "stack for YA2025: individual (RM9,000), parent medical (up to RM8,000), two "
            "child reliefs under #16a (RM2,000 each), EPF + life insurance under #17 "
            "(combined cap RM7,000), and lifestyle #9 (up to RM2,500)."
        ),
        agency="LHDN (HASiL)",
        portal_url="https://mytax.hasil.gov.my",
        rule_citations=[
            RuleCitation(
                rule_id="lhdn.form_b.individual_relief",
                source_pdf="pr-no-4-2024.pdf",
                page_ref="individual relief, RM9,000 cap",
                passage="Individual and dependent relatives — RM9,000.",
                source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
            ),
            RuleCitation(
                rule_id="lhdn.form_b.parent_medical",
                source_pdf="pr-no-4-2024.pdf",
                page_ref="parent medical, RM8,000 cap",
                passage="Medical expenses for parents — capped at RM8,000.",
                source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
            ),
            RuleCitation(
                rule_id="lhdn.form_b.child_16a",
                source_pdf="pr-no-4-2024.pdf",
                page_ref="§16a, RM2,000 per qualifying child",
                passage="Child relief #16a — RM2,000 per qualifying child under 18.",
                source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
            ),
            RuleCitation(
                rule_id="lhdn.form_b.epf_life_17",
                source_pdf="pr-no-4-2024.pdf",
                page_ref="§17, combined EPF + life insurance RM7,000 cap",
                passage="EPF contributions and life insurance premiums — combined cap RM7,000.",
                source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
            ),
            RuleCitation(
                rule_id="lhdn.form_b.lifestyle_9",
                source_pdf="pr-no-4-2024.pdf",
                page_ref="§9, lifestyle RM2,500 cap",
                passage="Lifestyle relief #9 — up to RM2,500.",
                source_url="https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf",
            ),
            RuleCitation(
                rule_id="lhdn.form_b.filing_deadline",
                source_pdf="rf-filing-programme-for-2026.pdf",
                page_ref="Form B filing deadline",
                passage="Form B (self-employed) — 30 June 2026; grace period to 15 July 2026.",
                source_url="https://www.hasil.gov.my/media/fqog1423/rf-filing-programme-for-2026.pdf",
            ),
        ],
    ),
]
