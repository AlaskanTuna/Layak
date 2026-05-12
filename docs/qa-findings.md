# QA Findings: Noisy Income Extraction

## Purpose

This note records the expected outcomes for Aisyah-style noisy income extraction tests. The target field is `Profile.monthly_income_rm`; downstream scheme outcomes are deterministic once this value, `form_type`, and household dependants are fixed.

Assumed profile for all cases:

- Aisyah, Form B / gig worker
- Household size: 4
- Dependants: child age 10, child age 7, parent age 70
- Upload flow must include the dependant override, because the documents alone do not reliably disclose household composition.

## Expected Upside

| Test case | Intended extracted income | STR | JKM Warga Emas | BKK | LHDN | i-Saraan | Expected annual upside |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline clean | RM2,800 | RM450 | RM7,200 | RM3,600 | RM558.00 | RM500 | RM12,308.00 |
| Gross-vs-net, JKM pass | RM4,944 | RM450 | RM7,200 | RM0 | RM2,111.24 | RM500 | RM10,261.24 |
| Just-over JKM fail | RM4,945 | RM450 | RM0 | RM0 | RM2,112.20 | RM500 | RM3,062.20 |
| BKK boundary pass | RM4,000 | RM450 | RM7,200 | RM3,600 | RM1,255.00 | RM500 | RM13,005.00 |
| BKK just-fail | RM4,001 | RM450 | RM7,200 | RM0 | RM1,255.60 | RM500 | RM9,405.60 |
| STR cliff fail | RM5,001 | RM0 | RM0 | RM0 | RM2,165.96 | RM500 | RM2,665.96 |

PERKESO SKSPS is not counted as upside. It should render as a required contribution: Plan 3 for RM2,800, and Plan 4 for the other threshold cases.

## Test Outcome

Overall extraction and downstream calculation are accurate for the noisy-income cases tested. The model extracted the intended income values closely enough for the rule engine to produce the expected scheme outcomes and annual-upside totals.

All tested cases passed except the deliberate negative case where the final net income / net payout line was excluded from the document. In that condition, the extraction agent may treat the visible gross income as `monthly_income_rm` because the uploaded document no longer contains the final payout value it is expected to extract.

This confirms the main calculation path is sound, and isolates the remaining issue to OCR/extraction behavior under missing-net-income documents.

## Why RM4,000 Beats RM2,800

RM4,000/month has higher expected upside than RM2,800/month because Layak includes estimated LHDN tax relief savings. Both cases still qualify for STR, JKM Warga Emas, BKK, and i-Saraan, but the RM4,000 case has more taxable income for the same reliefs to reduce.

- RM2,800 LHDN saving: RM558.00
- RM4,000 LHDN saving: RM1,255.00

That makes RM4,000 a threshold sweet spot: still low enough to qualify for the household aid rules, but high enough for larger tax-relief savings.

## Extraction Risks Found

If the net payout line is deliberately cropped, hidden, or cut off, the OCR agent is likely to pass through the largest visible income figure instead of doing wage-statement arithmetic. For example, it may treat gross ride fare as `monthly_income_rm` when the actual net payout is absent or partially unreadable.

This should be treated as an OCR prompt-harnessing issue, not a rule-engine issue. The extraction agent currently receives only the uploaded image/PDF bytes and returns the fields it can see. A future prompt/test pass should explicitly instruct it to:

- prefer an explicit final net payout / net pay / amount credited line when visible;
- avoid treating gross earnings as net income when deductions are present;
- return a low-confidence extraction error or `null`-equivalent failure path when the final payout line is cut off and arithmetic would be required;
- never silently calculate a net amount from noisy rows unless the product explicitly chooses to support arithmetic inside extraction.

## Household Income And Per-Capita Caveat

Current code uses total `monthly_income_rm` for the household income band (`b40_hardcore`, `b40_household`, `b40_household_with_children`, `m40`, `t20`). It does **not** divide by household size for B40/M40/T20 classification. This matches the intended Malaysian household-income framing: a household around RM12,000/month remains `t20` even if it has many children.

The schemes that currently calculate per-capita income are:

- **JKM Warga Emas**: `monthly_income_rm / household_size <= RM1,236`
- **JKM BKK**: `monthly_income_rm / household_size <= RM1,000`

The schemes that currently do **not** use per-capita income are:

- **STR 2026**: total monthly household income bands, with child-count buckets
- **LHDN Form B / BE**: annualized `monthly_income_rm` for tax-saving estimate
- **i-Saraan**: Form B / self-employed status and age window
- **PERKESO SKSPS**: Form B / gig status, age window, and total monthly income for contribution plan tier

No logic change is proposed here. This caveat is recorded so QA does not incorrectly expect B40/M40/T20 to become per-capita when household size changes.

## Spouse Income Gap

The current `Profile` stores one `monthly_income_rm` value and dependants can include a spouse relationship, but there is no structured spouse-income field. This is a gap for household-income testing and future scheme logic because spouse earnings may contribute to total household income and can affect eligibility thresholds.

Future QA fixtures should include at least one spouse-income scenario once the schema supports it:

- applicant income only;
- spouse income only;
- both applicant and spouse income visible;
- spouse listed as dependant with unknown income;
- spouse income that pushes total household income across a threshold.

Until then, noisy-income tests should state whether `monthly_income_rm` means applicant monthly income or total household monthly income for that fixture.

## Pass/Fail Labels

- **Pass**: extracted income is within RM1 of the expected income and scheme outcomes match.
- **Soft fail**: income differs by more than RM1, but scheme outcomes and PERKESO tier still match.
- **Hard fail**: at least one scheme outcome or PERKESO tier flips.
- **Extraction fail**: missing/invalid `Profile` or pipeline extraction error.
