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

## Why RM4,000 Beats RM2,800

RM4,000/month has higher expected upside than RM2,800/month because Layak includes estimated LHDN tax relief savings. Both cases still qualify for STR, JKM Warga Emas, BKK, and i-Saraan, but the RM4,000 case has more taxable income for the same reliefs to reduce.

- RM2,800 LHDN saving: RM558.00
- RM4,000 LHDN saving: RM1,255.00

That makes RM4,000 a threshold sweet spot: still low enough to qualify for the household aid rules, but high enough for larger tax-relief savings.

## Pass/Fail Labels

- **Pass**: extracted income is within RM1 of the expected income and scheme outcomes match.
- **Soft fail**: income differs by more than RM1, but scheme outcomes and PERKESO tier still match.
- **Hard fail**: at least one scheme outcome or PERKESO tier flips.
- **Extraction fail**: missing/invalid `Profile` or pipeline extraction error.
