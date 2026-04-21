/**
 * Aisyah canned SSE replay for demo mode (FR-10) and the dev-only `NEXT_PUBLIC_USE_MOCK_SSE=1` escape hatch.
 *
 * Mirrors the live rule-engine output from `backend/app/fixtures/aisyah.py` (which
 * is computed against `backend/app/rules/{str_2026,jkm_warga_emas,lhdn_form_b}.py`).
 * Numbers must stay in lockstep with the backend — after any rule-engine change,
 * re-run the backend fixture and copy the resulting matches over verbatim.
 *
 * Totals (post Phase 1 Task 4 rule engine): JKM RM7,200 + LHDN RM558 + STR RM450
 * = RM8,208/year. Sorted descending by `annual_rm` per `match_schemes` contract.
 */

import type {
  AgentEvent,
  ComputeUpsideResult,
  HouseholdClassification,
  Packet,
  Profile,
  SchemeMatch
} from '@/lib/agent-types'

export const AISYAH_PROFILE: Profile = {
  name: 'Aisyah binti Ahmad',
  ic_last4: '4321',
  age: 34,
  monthly_income_rm: 2800,
  household_size: 4,
  dependants: [
    { relationship: 'child', age: 10, ic_last4: null },
    { relationship: 'child', age: 7, ic_last4: null },
    { relationship: 'parent', age: 70, ic_last4: null }
  ],
  household_flags: {
    has_children_under_18: true,
    has_elderly_dependant: true,
    income_band: 'b40_household_with_children'
  },
  form_type: 'form_b'
}

export const AISYAH_CLASSIFICATION: HouseholdClassification = {
  has_children_under_18: true,
  has_elderly_dependant: true,
  income_band: 'b40_household_with_children',
  per_capita_monthly_rm: 700,
  notes: [
    'Household size: 4.',
    'Per-capita monthly income: RM700.',
    'Filer category: FORM B.',
    '2 child(ren) under 18 in household.',
    '1 parent dependant(s) aged 60+.'
  ]
}

export const AISYAH_SCHEME_MATCHES: SchemeMatch[] = [
  {
    scheme_id: 'jkm_warga_emas',
    scheme_name: 'JKM Warga Emas — dependent elderly payment',
    qualifies: true,
    annual_rm: 7200,
    summary: 'Per-capita income RM700/month is below food-PLI RM1,236 — elderly parent age 70 qualifies.',
    why_qualify:
      'Your household earns RM2,800/month across 4 members — per-capita income RM700 is below the DOSM 2024 food-PLI threshold of RM1,236. Under Budget 2026 the monthly payment is RM600 (fallback RM500 where the uplift is pending). You apply on behalf of the dependent elder using the JKM18 form.',
    agency: 'JKM (Jabatan Kebajikan Masyarakat)',
    portal_url: 'https://www.jkm.gov.my',
    rule_citations: [
      {
        rule_id: 'jkm.warga_emas.means_test_per_capita',
        source_pdf: 'jkm18.pdf',
        page_ref: 'p. 2, Section VII — Maklumat Pendapatan dan Perbelanjaan Bulanan',
        passage:
          'PENDAPATAN BULANAN: Jumlah pendapatan bulanan keseluruhan pemohon dan isi rumah yang tinggal bersama.',
        source_url:
          'https://www.jkm.gov.my/jkm/uploads/files/Bahagian%20PW/BORANG%20PERMOHONAN%20JKM%2018%20(2022)(1).pdf'
      },
      {
        rule_id: 'jkm.warga_emas.food_pli_threshold',
        source_pdf: 'jkm18.pdf',
        page_ref: 'DOSM 2024 food-PLI constant (external reference)',
        passage:
          'Per-capita monthly household income must not exceed the DOSM 2024 food-PLI threshold of RM1,236.',
        source_url: 'https://data.gov.my/data-catalogue/hh_poverty'
      },
      {
        rule_id: 'jkm.warga_emas.rate_budget_2026',
        source_pdf: 'jkm18.pdf',
        page_ref: 'Budget 2026 speech (external reference)',
        passage:
          'Monthly payment rate: RM600 (Budget 2026); fallback RM500 where the uplift is pending JKM18 re-gazette.',
        source_url: 'https://www.jkm.gov.my'
      }
    ]
  },
  {
    scheme_id: 'lhdn_form_b',
    scheme_name: 'LHDN Form B — five YA2025 reliefs',
    qualifies: true,
    annual_rm: 558,
    summary:
      'Applied YA2025 reliefs totalling RM30,500 against annual income RM33,600; estimated tax saving RM558.',
    why_qualify:
      'As a Form B (self-employed) filer with an annual income of RM33,600, the following YA2025 reliefs stack: individual (RM9,000), lifestyle_9 (RM2,500), epf_life_17 (RM7,000), parent_medical (RM8,000), child_16a (RM4,000). Applying them reduces your chargeable income by RM30,500 and your tax bill by RM558/year. The Form B filing deadline is 30 June 2026.',
    agency: 'LHDN (HASiL)',
    portal_url: 'https://mytax.hasil.gov.my',
    rule_citations: [
      {
        rule_id: 'lhdn.form_b.individual_relief',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: 'PR 4/2024 §6.1 (doc p.9) — ITA paragraph 46(1)(a)',
        passage:
          'Paragraph 46(1)(a) of the ITA provides that a deduction of RM9,000 is allowed to every individual who has total income and is assessed in his own name.',
        source_url: 'https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf'
      },
      {
        rule_id: 'lhdn.form_b.parent_medical',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: 'PR 4/2024 §6.2.1 (doc p.9) — ITA paragraph 46(1)(c)',
        passage:
          'A deduction up to a maximum of RM8,000 is allowed to an individual on the expenses incurred by him for the medical treatment, special needs or carer expenses for parents.',
        source_url: 'https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf'
      },
      {
        rule_id: 'lhdn.form_b.child_16a',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: 'PR 4/2024 §6.18.2(a) (doc p.41) — ITA paragraphs 48(1)(a), 48(2)(a)',
        passage:
          'A deduction of RM2,000 for an unmarried child who at any time in the basis year is under the age of 18 years.',
        source_url: 'https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf'
      },
      {
        rule_id: 'lhdn.form_b.epf_life_17',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: 'PR 4/2024 §6.19 / §6.19.3 (doc p.46–48) — ITA paragraphs 49(1)(a), 49(1)(b)',
        passage:
          '§6.19.3 table: effective YA 2023, individuals (other than public servants) are restricted to RM3,000 for life insurance premium / family Takaful contribution under paragraph 49(1)(a) and RM4,000 for EPF contributions under paragraph 49(1)(b) — combined relief up to RM7,000.',
        source_url: 'https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf'
      },
      {
        rule_id: 'lhdn.form_b.lifestyle_9',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: 'PR 4/2024 §6.11.3 (doc p.29)',
        passage:
          'The total deduction for the amount expended under this paragraph is subject to a maximum amount of RM2,500.',
        source_url: 'https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf'
      },
      {
        rule_id: 'lhdn.form_b.filing_deadline',
        source_pdf: 'rf-filing-programme-for-2026.pdf',
        page_ref: 'RF Filing Programme 2026, doc p.2, Example 2',
        passage:
          'The due date for submission of Form B for Year of Assessment 2025 is 30 June 2026. Grace period is given until 15 July 2026 for the e-Filing.',
        source_url: 'https://www.hasil.gov.my/media/fqog1423/rf-filing-programme-for-2026.pdf'
      }
    ]
  },
  {
    scheme_id: 'str_2026',
    scheme_name: 'STR 2026 — Household with children tier',
    qualifies: true,
    annual_rm: 450,
    summary:
      'Household-with-children tier, income band RM2,501–RM5,000, 1-2 children bucket.',
    why_qualify:
      "Your household earns RM2,800/month, inside the RM2,501–RM5,000 band. You have 2 child(ren) under 18, placing you in the '1-2' children bucket. STR 2026 pays RM450/year in two tranches under the household-with-children tier. You still apply via BK-01 at bantuantunai.hasil.gov.my — Layak drafts the form for you; the final determination is LHDN's on application.",
    agency: 'LHDN (HASiL) / Ministry of Finance',
    portal_url: 'https://bantuantunai.hasil.gov.my',
    rule_citations: [
      {
        rule_id: 'str_2026.household_with_children.tier_table',
        source_pdf: 'risalah-str-2026.pdf',
        page_ref: 'p. 2',
        passage: 'Nilai Bantuan STR & SARA 2026 — Isi Rumah (Tiada Had Umur), tier table.',
        source_url: 'https://bantuantunai.hasil.gov.my/FAQ/RISALAH%20STR%202026.pdf'
      },
      {
        rule_id: 'str_2026.eligibility.household',
        source_pdf: 'risalah-str-2026.pdf',
        page_ref: 'p. 2',
        passage:
          'Pemohon: Lelaki atau wanita yang menjadi ketua keluarga dengan jumlah pendapatan kasar bulanan isi rumah RM5,000 dan ke bawah.',
        source_url: 'https://bantuantunai.hasil.gov.my/FAQ/RISALAH%20STR%202026.pdf'
      },
      {
        rule_id: 'str_2026.application_form',
        source_pdf: 'bk-01.pdf',
        page_ref: 'Borang BK-01',
        passage: 'Borang permohonan dan kemaskini untuk Sumbangan Tunai Rahmah 2026.',
        source_url:
          'https://bantuantunai.hasil.gov.my/Borang/BK-01%20(Borang%20Permohonan%20&%20Kemaskini%20STR%202026).pdf'
      }
    ]
  }
]

export const AISYAH_UPSIDE: ComputeUpsideResult = {
  python_snippet: `# Layak — annual RM upside computation
# Gemini Code Execution would run this in a sandbox under Gemini 2.5 Pro.

jkm_warga_emas = 7200  # JKM Warga Emas — dependent elderly payment
lhdn_form_b = 558  # LHDN Form B — five YA2025 reliefs
str_2026 = 450  # STR 2026 — Household with children tier

total = jkm_warga_emas + lhdn_form_b + str_2026

print("{:<42s}{:>12s}".format("Scheme", "Annual (RM)"))
print("-" * 55)
print("{:<42s}{:>12,}".format('JKM Warga Emas — dependent elderly payment', jkm_warga_emas))
print("{:<42s}{:>12,}".format('LHDN Form B — five YA2025 reliefs', lhdn_form_b))
print("{:<42s}{:>12,}".format('STR 2026 — Household with children tier', str_2026))
print("-" * 55)
print("{:<42s}{:>12,}".format("Total upside (annual)", total))`,
  stdout: `Scheme                                     Annual (RM)
-------------------------------------------------------
JKM Warga Emas — dependent elderly payment       7,200
LHDN Form B — five YA2025 reliefs                  558
STR 2026 — Household with children tier            450
-------------------------------------------------------
Total upside (annual)                            8,208`,
  total_annual_rm: 8208,
  per_scheme_rm: {
    jkm_warga_emas: 7200,
    lhdn_form_b: 558,
    str_2026: 450
  }
}

export const AISYAH_PACKET: Packet = {
  drafts: [
    { scheme_id: 'jkm_warga_emas', filename: 'JKM18-warga-emas-draft-4321.pdf', blob_bytes_b64: null },
    { scheme_id: 'lhdn_form_b', filename: 'LHDN-form-b-relief-summary-4321.pdf', blob_bytes_b64: null },
    { scheme_id: 'str_2026', filename: 'BK-01-STR2026-draft-4321.pdf', blob_bytes_b64: null }
  ],
  generated_at: '2026-04-21T03:30:00Z'
}

/**
 * Ordered SSE replay. Delays are tuned to feel like real Gemini latency
 * without blowing the ≤10 s demo budget: ~3.8 s total end-to-end.
 */
export type MockEvent = { event: AgentEvent; delayMs: number }

export const AISYAH_MOCK_EVENTS: MockEvent[] = [
  { event: { type: 'step_started', step: 'extract' }, delayMs: 100 },
  { event: { type: 'step_result', step: 'extract', data: { profile: AISYAH_PROFILE } }, delayMs: 900 },

  { event: { type: 'step_started', step: 'classify' }, delayMs: 150 },
  {
    event: { type: 'step_result', step: 'classify', data: { classification: AISYAH_CLASSIFICATION } },
    delayMs: 450
  },

  { event: { type: 'step_started', step: 'match' }, delayMs: 150 },
  {
    event: { type: 'step_result', step: 'match', data: { matches: AISYAH_SCHEME_MATCHES } },
    delayMs: 700
  },

  { event: { type: 'step_started', step: 'compute_upside' }, delayMs: 150 },
  {
    event: { type: 'step_result', step: 'compute_upside', data: AISYAH_UPSIDE },
    delayMs: 700
  },

  { event: { type: 'step_started', step: 'generate' }, delayMs: 150 },
  {
    event: { type: 'step_result', step: 'generate', data: { packet: AISYAH_PACKET } },
    delayMs: 550
  },

  { event: { type: 'done', packet: AISYAH_PACKET }, delayMs: 100 }
]
