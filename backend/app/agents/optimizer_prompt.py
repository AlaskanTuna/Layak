"""Few-shot prompt block for the Cross-Scheme Strategy Optimizer.

Layer 4 of the 5-layer grounding stack (spec §3.5). Three worked examples
demonstrate the expected output shape, tone, and citation discipline. The
Gemini call sees these AS PART of the system prompt — they anchor the
model on `interaction_id` values that exist in the YAML registry and on
citation triples that match the registry's `(pdf, section, page)` shape.

Each example pairs a stripped-down profile snapshot + matched-scheme list
with the StrategyAdvice JSON record we want the model to emit. The
examples deliberately cover all three severity levels (`info`, `warn`,
`act`) so the model learns the severity mapping is editorial, not arbitrary.
"""

from __future__ import annotations

FEW_SHOT_BLOCK = """\
EXAMPLE 1 — Aisyah-class household with elderly dependant
=========================================================

Profile snapshot:
  monthly_income_rm: 2800
  household_size: 4
  has_elderly_dependant: true
  has_children_under_18: true
  form_type: form_b

Matched schemes: str_2026, jkm_warga_emas, jkm_bkk, lhdn_form_b
Triggered interaction rules: lhdn_dependent_parent_single_claimer

Expected output (one record):
{
  "advice_id": "<uuid4 hex>",
  "interaction_id": "lhdn_dependent_parent_single_claimer",
  "severity": "warn",
  "headline": "Coordinate the RM 1,500 dependent-parent relief with siblings",
  "rationale": "Only one filer per parent can claim this relief. Whichever sibling files at the highest marginal tax bracket should claim — split the cash informally so the family captures the maximum benefit.",
  "citation": {"pdf": "pr-no-4-2024.pdf", "section": "§5.2", "page": 12},
  "confidence": 0.86,
  "suggested_chat_prompt": "Who in my family should claim the dependent-parent relief, and how do we coordinate it on the LHDN portal?",
  "applies_to_scheme_ids": ["lhdn_form_b"]
}


EXAMPLE 2 — Low-income filer matched on i-Saraan
================================================

Profile snapshot:
  monthly_income_rm: 2400
  household_size: 3
  has_elderly_dependant: false
  form_type: form_b

Matched schemes: str_2026, lhdn_form_b, i_saraan
Triggered interaction rules: i_saraan_liquidity_tradeoff

Expected output (one record):
{
  "advice_id": "<uuid4 hex>",
  "interaction_id": "i_saraan_liquidity_tradeoff",
  "severity": "info",
  "headline": "Weigh i-Saraan's RM 500 match against the locked-in EPF contribution",
  "rationale": "i-Saraan pays back up to RM 500/year on a RM 3,333 voluntary contribution — but that cash is locked until retirement. On a tight monthly budget, the trade-off may not be worth it this year.",
  "citation": {"pdf": "i-saraan-program.pdf", "section": "§3", "page": 3},
  "confidence": 0.78,
  "suggested_chat_prompt": "Given my monthly income, is i-Saraan worth the locked-in EPF contribution this year?",
  "applies_to_scheme_ids": ["i_saraan"]
}


EXAMPLE 3 — Form B filer with ambiguous spouse status
=====================================================

Profile snapshot:
  monthly_income_rm: 6500
  household_size: 2
  has_elderly_dependant: false
  form_type: form_b

Matched schemes: lhdn_form_b
Triggered interaction rules: lhdn_spouse_relief_filing_status

Expected output (one record):
{
  "advice_id": "<uuid4 hex>",
  "interaction_id": "lhdn_spouse_relief_filing_status",
  "severity": "act",
  "headline": "Confirm your spouse's filing status before claiming the RM 4,000 relief",
  "rationale": "Spouse relief only applies on joint assessment or when your spouse has no separate Form B/BE income. Over-claiming triggers an LHDN audit later — verify the filing status first.",
  "citation": {"pdf": "pr-no-4-2024.pdf", "section": "§4.1", "page": 9},
  "confidence": 0.92,
  "suggested_chat_prompt": "My spouse and I have different income types — should we file jointly or separately for the relief?",
  "applies_to_scheme_ids": ["lhdn_form_b"]
}


EXAMPLE 4 — No interaction rules trip
=====================================

Profile snapshot: any
Matched schemes: any
Triggered interaction rules: (none)

Expected output: an empty list `[]`. DO NOT invent advisories when no
registered interaction rule trips. The frontend renders a separate
"no conflicts detected" card in this case.
"""
