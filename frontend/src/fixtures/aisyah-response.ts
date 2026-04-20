/**
 * Aisyah canned SSE replay for demo mode (FR-10) and `NEXT_PUBLIC_USE_MOCK_SSE=1`.
 *
 * Mirrors `backend/app/fixtures/aisyah.py` exactly for profile + scheme matches
 * so the wired-mode and mock-mode outputs render identical RM figures.
 *
 * Totals: STR RM1,200 + JKM RM7,200 + LHDN RM1,008 = RM9,408/year.
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
    'Household income RM2,800 / 4 members = RM700 per capita per month.',
    'Below food-PLI threshold of RM1,236 (DOSM 2024) — triggers JKM Warga Emas means test.'
  ]
}

export const AISYAH_SCHEME_MATCHES: SchemeMatch[] = [
  {
    scheme_id: 'str_2026',
    scheme_name: 'STR 2026 — Household with children (tier 2)',
    qualifies: true,
    annual_rm: 1200,
    summary: 'Household-with-children tier 2, income band RM2,501–5,000.',
    why_qualify:
      'Your household earns RM2,800/month, inside the RM2,501–5,000 band. Two children under 18 trigger the household-with-children tier. STR 2026 pays two tranches totalling RM1,200 this year. You apply via BK-01 — Layak drafts it for you; the final determination is LHDN’s on application.',
    agency: 'LHDN (HASiL) / MOF',
    portal_url: 'https://bantuantunai.hasil.gov.my',
    rule_citations: [
      {
        rule_id: 'str_2026.household_with_children.tier_2',
        source_pdf: 'risalah-str-2026.pdf',
        page_ref: 'p. 3',
        passage: 'Isi rumah dengan anak bawah 18 tahun, pendapatan bulanan RM2,501–5,000 …',
        source_url: 'https://bantuantunai.hasil.gov.my/FAQ/RISALAH%20STR%202026.pdf'
      },
      {
        rule_id: 'str_2026.application_form',
        source_pdf: 'bk-01.pdf',
        page_ref: 'Borang BK-01 (Permohonan & Kemaskini STR 2026)',
        passage: 'Borang permohonan dan kemaskini untuk Sumbangan Tunai Rahmah 2026.',
        source_url:
          'https://bantuantunai.hasil.gov.my/Borang/BK-01%20(Borang%20Permohonan%20&%20Kemaskini%20STR%202026).pdf'
      }
    ]
  },
  {
    scheme_id: 'jkm_warga_emas',
    scheme_name: 'JKM Warga Emas (dependent father, age 70)',
    qualifies: true,
    annual_rm: 7200,
    summary: 'Per-capita income RM700/mo is below food-PLI RM1,236 — father qualifies.',
    why_qualify:
      'Your father (age 70) lives in the household. Per-capita income is RM2,800 ÷ 4 = RM700/month — below the food-PLI threshold of RM1,236 (DOSM 2024). Budget 2026 gazetted rate is RM600/month (fallback RM500 where the uplift is pending). You apply on his behalf using JKM18.',
    agency: 'JKM',
    portal_url: 'https://www.jkm.gov.my',
    rule_citations: [
      {
        rule_id: 'jkm.warga_emas.means_test_per_capita',
        source_pdf: 'jkm18.pdf',
        page_ref: 'p. 2',
        passage: 'Pendapatan isi rumah per kapita tidak melebihi had kemiskinan tegar.',
        source_url:
          'https://www.jkm.gov.my/jkm/uploads/files/Bahagian%20PW/BORANG%20PERMOHONAN%20JKM%2018%20(2022)(1).pdf'
      }
    ]
  },
  {
    scheme_id: 'lhdn_form_b',
    scheme_name: 'LHDN Form B — five reliefs (YA2025)',
    qualifies: true,
    annual_rm: 1008,
    summary: 'Five stackable reliefs; tax delta estimated at RM1,008/year at the 3% bracket.',
    why_qualify:
      'As a self-employed gig worker you file Form B (not Form BE). Five reliefs stack for YA2025: individual (RM9,000), parent medical (up to RM8,000), two child reliefs under #16a (RM2,000 each), EPF + life insurance under #17 (combined cap RM7,000), and lifestyle #9 (up to RM2,500).',
    agency: 'LHDN (HASiL)',
    portal_url: 'https://mytax.hasil.gov.my',
    rule_citations: [
      {
        rule_id: 'lhdn.form_b.individual_relief',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: 'individual relief, RM9,000 cap',
        passage: 'Individual and dependent relatives — RM9,000.',
        source_url: 'https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf'
      },
      {
        rule_id: 'lhdn.form_b.parent_medical',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: 'parent medical, RM8,000 cap',
        passage: 'Medical expenses for parents — capped at RM8,000.',
        source_url: 'https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf'
      },
      {
        rule_id: 'lhdn.form_b.child_16a',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: '§16a, RM2,000 per qualifying child',
        passage: 'Child relief #16a — RM2,000 per qualifying child under 18.',
        source_url: 'https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf'
      },
      {
        rule_id: 'lhdn.form_b.epf_life_17',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: '§17, combined EPF + life insurance RM7,000 cap',
        passage: 'EPF contributions and life insurance premiums — combined cap RM7,000.',
        source_url: 'https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf'
      },
      {
        rule_id: 'lhdn.form_b.lifestyle_9',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: '§9, lifestyle RM2,500 cap',
        passage: 'Lifestyle relief #9 — up to RM2,500.',
        source_url: 'https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf'
      },
      {
        rule_id: 'lhdn.form_b.filing_deadline',
        source_pdf: 'rf-filing-programme-for-2026.pdf',
        page_ref: 'Form B filing deadline',
        passage: 'Form B (self-employed) — 30 June 2026; grace period to 15 July 2026.',
        source_url: 'https://www.hasil.gov.my/media/fqog1423/rf-filing-programme-for-2026.pdf'
      }
    ]
  }
]

export const AISYAH_UPSIDE: ComputeUpsideResult = {
  python_snippet: `schemes = {
    "str_2026": 1200.0,
    "jkm_warga_emas": 7200.0,
    "lhdn_form_b": 1008.0,
}
total = sum(schemes.values())
print(f"Total annual upside: RM{total:,.2f}")
for scheme, rm in sorted(schemes.items(), key=lambda kv: -kv[1]):
    print(f"  {scheme}: RM{rm:,.2f}")`,
  stdout: `Total annual upside: RM9,408.00
  jkm_warga_emas: RM7,200.00
  str_2026: RM1,200.00
  lhdn_form_b: RM1,008.00`,
  total_annual_rm: 9408,
  per_scheme_rm: {
    str_2026: 1200,
    jkm_warga_emas: 7200,
    lhdn_form_b: 1008
  }
}

export const AISYAH_PACKET: Packet = {
  drafts: [
    { scheme_id: 'str_2026', filename: 'bk01-str-2026-draft.pdf', blob_bytes_b64: null },
    { scheme_id: 'jkm_warga_emas', filename: 'jkm18-warga-emas-draft.pdf', blob_bytes_b64: null },
    { scheme_id: 'lhdn_form_b', filename: 'lhdn-form-b-ya2025-draft.pdf', blob_bytes_b64: null }
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
