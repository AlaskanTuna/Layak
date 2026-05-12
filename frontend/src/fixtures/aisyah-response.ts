/**
 * Aisyah canned SSE replay for demo mode and the dev-only `NEXT_PUBLIC_USE_MOCK_SSE=1` escape hatch.
 *
 * Mirrors the live rule-engine output from `backend/app/fixtures/aisyah.py` (which
 * is computed against `backend/app/rules/{str_2026,jkm_warga_emas,jkm_bkk,lhdn_form_b,i_saraan,perkeso_sksps}.py`).
 * Numbers must stay in lockstep with the backend — after any rule-engine change,
 * re-run the backend fixture and copy the resulting matches over verbatim.
 *
 * Upside totals (post BKK Budget-2021 rate update): JKM Warga Emas RM 7,200 +
 * JKM BKK RM 3,600 + LHDN RM 558 + i-Saraan RM 500 + STR RM 450 = RM 12,308/year.
 * Sorted descending by `annual_rm`, then required-contribution schemes (SKSPS)
 * tacked onto the end — Aisyah's SKSPS Plan 3 contribution (RM 442.80/yr)
 * renders separately in the "Required contributions" block and does NOT stack
 * into the RM 12,308 total.
 * Phase 8 re-snapshot (2026-04-23): rule_citations now lead with a Vertex-AI-Search-derived primary citation grounded in `gs://layak-schemes-pdfs/<scheme>.pdf`; AISYAH_UPSIDE.python_snippet + .stdout are captured from gemini-3-flash-preview output (HEAVY_MODEL).
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
        rule_id: 'rag.jkm_warga_emas.primary',
        source_pdf: 'jkm18.pdf',
        page_ref: 'Vertex AI Search retrieval',
        passage:
          'ahli keluarga tidak mencukupi. UNTUK KEGUNAAN PEJABAT No. Siri / / / Kod Negeri / Kod Daerah / No. Daftar Klien Tarikh Pendaftaran Ruj. Fail PERCUMA JKM 18.',
        source_url: 'gs://layak-schemes-pdfs/jkm18.pdf'
      },
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
        passage: 'Per-capita monthly household income must not exceed the DOSM 2024 food-PLI threshold of RM1,236.',
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
    scheme_id: 'jkm_bkk',
    scheme_name: 'JKM Bantuan Kanak-Kanak — per-child monthly payment',
    qualifies: true,
    annual_rm: 3600,
    summary: 'Per-capita income RM 700/month is at/under BKK threshold RM 1,000; 2 × RM 150 (age 7–17) = RM 300/month.',
    why_qualify:
      'Your household earns RM 2,800/month across 4 members — per-capita income RM 700 is at/under the BKK threshold of RM 1,000. Per current Budget 2021 rates: 2 × RM 150 (age 7–17), the annual payment works out to RM 3,600. Apply via Borang Permohonan Bantuan Kanak-Kanak at your nearest Pejabat Kebajikan Masyarakat Daerah.',
    agency: 'JKM (Jabatan Kebajikan Masyarakat)',
    portal_url: 'https://www.jkm.gov.my',
    rule_citations: [
      {
        rule_id: 'rag.jkm_bkk.primary',
        source_pdf: 'jkm-bkk-brochure.pdf',
        page_ref: 'Vertex AI Search retrieval',
        passage:
          'KATEGORI DAN KADAR BANTUAN BULANAN BANTUAN KANAK-KANAK (BKK) — pecahan kadar mengikut umur kanak-kanak dengan had maksimum RM1,000 sebulan setiap keluarga.',
        source_url: 'gs://layak-schemes-pdfs/jkm-bkk-brochure.pdf'
      },
      {
        rule_id: 'jkm.bkk.eligibility_means_test',
        source_pdf: 'jkm-bkk-brochure.pdf',
        page_ref: 'JKM SPK ISO 9001 — Bantuan Kewangan Bulanan, Kategori Bantuan',
        passage:
          'Bantuan Kanak-Kanak (BKK) dibayar kepada isi rumah berpendapatan rendah dengan kanak-kanak berumur di bawah 18 tahun. Had pendapatan per kapita isi rumah tidak melebihi RM1,000 sebulan.',
        source_url: 'https://www.jkm.gov.my/uploads/content-downloads/file_20241025152555.pdf'
      },
      {
        rule_id: 'jkm.bkk.rate_per_child',
        source_pdf: 'jkm-bkk-brochure.pdf',
        page_ref: 'JKM SPK ISO 9001 — Bantuan Kanak-Kanak (BKK), Kadar Bantuan',
        passage:
          'Kadar minimum sebanyak RM150 sehingga maksimum RM1,000 mengikut pecahan berikut: RM200 seorang bagi anak berumur 6 tahun dan ke bawah; RM150 seorang bagi anak berumur 7 tahun hingga 18 tahun; Kadar bantuan maksimum RM1,000/keluarga sebulan.',
        source_url: 'https://www.jkm.gov.my/uploads/content-downloads/file_20241025152555.pdf'
      }
    ]
  },
  {
    scheme_id: 'lhdn_form_b',
    scheme_name: 'LHDN Form B — five YA2025 reliefs',
    qualifies: true,
    annual_rm: 558,
    summary: 'Applied YA2025 reliefs totalling RM30,500 against annual income RM33,600; estimated tax saving RM558.',
    why_qualify:
      'As a Form B (self-employed) filer with an annual income of RM33,600, the following YA2025 reliefs stack: individual (RM9,000), lifestyle_9 (RM2,500), epf_life_17 (RM7,000), parent_medical (RM8,000), child_16a (RM4,000). Applying them reduces your chargeable income by RM30,500 and your tax bill by RM558/year. The Form B filing deadline is 30 June 2026.',
    agency: 'LHDN (HASiL)',
    portal_url: 'https://mytax.hasil.gov.my',
    rule_citations: [
      {
        rule_id: 'rag.lhdn.form_b.primary',
        source_pdf: 'pr-no-4-2024.pdf',
        page_ref: 'Vertex AI Search retrieval',
        passage:
          'INLAND REVENUE BOARD OF MALAYSIA TAXATION OF A RESIDENT INDIVIDUAL PART I — GIFTS OR CONTRIBUTIONS AND ALLOWABLE DEDUCTIONS, Public Ruling No. 4/2024 §6.1 individual relief paragraph 46(1)(a).',
        source_url: 'gs://layak-schemes-pdfs/pr-no-4-2024.pdf'
      },
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
    scheme_id: 'i_saraan',
    scheme_name: 'EPF i-Saraan — voluntary contribution government match',
    qualifies: true,
    annual_rm: 500,
    summary: 'Self-employed Form B filer aged 34 qualifies for the i-Saraan 15% government match up to RM500/year.',
    why_qualify:
      "You're a self-employed filer (Form B) aged 34, within the i-Saraan 18-60 age window. Contribute at least RM3,333.33/year voluntarily into your EPF Account and the government will add the full RM500 — the maximum annual match. Smaller contributions earn a proportional 15% match (e.g. RM1,000 contributed → RM150 government match). Register via the KWSP i-Saraan portal or at any KWSP branch.",
    agency: 'KWSP (Kumpulan Wang Simpanan Pekerja / Employees Provident Fund)',
    portal_url: 'https://www.kwsp.gov.my/en/member/contribution/i-saraan',
    rule_citations: [
      {
        rule_id: 'rag.i_saraan.primary',
        source_pdf: 'i-saraan-program.pdf',
        page_ref: 'Vertex AI Search retrieval',
        passage:
          'Had caruman padanan 15% Kerajaan di bawah program i-Saraan KWSP ditingkatkan kepada RM500 setahun terhad kepada RM5,000 seumur hidup.',
        source_url: 'gs://layak-schemes-pdfs/i-saraan-program.pdf'
      },
      {
        rule_id: 'epf.i_saraan.eligibility',
        source_pdf: 'i-saraan-program.pdf',
        page_ref: 'KWSP i-Saraan program brochure, §Kelayakan (external reference)',
        passage:
          'i-Saraan terbuka kepada warga Malaysia atau Penduduk Tetap yang bekerja sendiri, berumur 18 hingga 60 tahun, tanpa majikan tetap yang mencarum kepada KWSP bagi pihak mereka.',
        source_url: 'https://www.kwsp.gov.my/en/member/contribution/i-saraan'
      },
      {
        rule_id: 'epf.i_saraan.match_rate_and_cap',
        source_pdf: 'i-saraan-program.pdf',
        page_ref: 'KWSP i-Saraan program brochure, §Kadar Padanan Kerajaan (external reference)',
        passage:
          'Kerajaan memadankan 15% daripada caruman sukarela yang dibuat oleh ahli i-Saraan ke dalam Akaun Persaraan KWSP, sehingga had maksimum RM500 setahun setiap ahli.',
        source_url: 'https://www.kwsp.gov.my/en/member/contribution/i-saraan'
      }
    ]
  },
  {
    scheme_id: 'str_2026',
    scheme_name: 'STR 2026 — Household with children tier',
    qualifies: true,
    annual_rm: 450,
    summary: 'Household-with-children tier, income band RM2,501–RM5,000, 1-2 children bucket.',
    why_qualify:
      "Your household earns RM2,800/month, inside the RM2,501–RM5,000 band. You have 2 child(ren) under 18, placing you in the '1-2' children bucket. STR 2026 pays RM450/year in two tranches under the household-with-children tier. You still apply via BK-01 at bantuantunai.hasil.gov.my — Layak drafts the form for you; the final determination is LHDN's on application.",
    agency: 'LHDN (HASiL) / Kementerian Kewangan',
    portal_url: 'https://bantuantunai.hasil.gov.my',
    rule_citations: [
      {
        rule_id: 'rag.str_2026.primary',
        source_pdf: 'risalah-str-2026.pdf',
        page_ref: 'Vertex AI Search retrieval',
        passage:
          'Sumbangan Asas Rahmah (SARA) adalah secara automatik berdasarkan data lulus STR 2026 melibatkan kumpulan Miskin dan Miskin Tegar dalam rekod data eKasih.',
        source_url: 'gs://layak-schemes-pdfs/risalah-str-2026.pdf'
      },
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
  },
  {
    scheme_id: 'perkeso_sksps',
    scheme_name: 'PERKESO SKSPS — Self-Employed Social Security',
    qualifies: true,
    // Upside is zero — SKSPS is a REQUIRED CONTRIBUTION, not a benefit.
    // The actual annual RM Aisyah would PAY lives on `annual_contribution_rm`.
    annual_rm: 0,
    summary: 'Plan 3: RM36.90/month → RM442.80/year mandatory contribution under Akta 789 (income ≤ RM2,950).',
    why_qualify:
      'As a self-employed / gig filer aged 34 with monthly income of RM2,800.00, you fall under the Akta 789 mandate for PERKESO SKSPS registration. Your income bracket places you on Plan 3 of the SKSPS Jadual Caruman: RM36.90/month (RM442.80/year). Register via SKSPS-1 at https://www.perkeso.gov.my. This is a MANDATORY contribution — Layak surfaces it alongside your qualifying schemes so you can budget for it; it does NOT stack into your annual relief total.',
    agency: 'PERKESO (SOCSO)',
    portal_url: 'https://www.perkeso.gov.my',
    kind: 'required_contribution',
    annual_contribution_rm: 442.8,
    rule_citations: [
      {
        rule_id: 'rag.perkeso_sksps.primary',
        source_pdf: 'perkeso-sksps-rates.pdf',
        page_ref: 'Vertex AI Search retrieval',
        passage:
          'KEMENTERIAN SUMBER MANUSIA PERKESO Skim Keselamatan Sosial Pekerjaan Sendiri (LINDUNG Kendiri) memberi perlindungan keselamatan sosial kepada pekerja sendiri.',
        source_url: 'gs://layak-schemes-pdfs/perkeso-sksps-rates.pdf'
      },
      {
        rule_id: 'perkeso.sksps.akta_789_eligibility',
        source_pdf: 'perkeso-sksps-rates.pdf',
        page_ref: 'Akta 789 · Skim Keselamatan Sosial Pekerjaan Sendiri (external reference)',
        passage:
          'Semua pekerja sendiri yang berumur antara 18 hingga 60 tahun dan bekerja dalam sektor pengangkutan penumpang (termasuk e-hailing seperti Grab) wajib mendaftar dan membuat caruman bulanan di bawah Akta 789 (Akta Keselamatan Sosial Pekerjaan Sendiri 2017).',
        source_url: 'https://www.perkeso.gov.my'
      },
      {
        rule_id: 'perkeso.sksps.plan_schedule',
        source_pdf: 'perkeso-sksps-rates.pdf',
        page_ref: 'Jadual Caruman SKSPS — 4-tier income bracket (external reference)',
        passage:
          'Jadual Caruman SKSPS: Plan 1 (pendapatan bulanan ≤ RM1,050, caruman RM19.40/bulan); Plan 2 (≤ RM1,550, RM24.90/bulan); Plan 3 (≤ RM2,950, RM36.90/bulan); Plan 4 (> RM2,950, RM49.70/bulan).',
        source_url: 'https://www.perkeso.gov.my'
      }
    ]
  }
]

export const AISYAH_UPSIDE: ComputeUpsideResult = {
  python_snippet: `jkm_warga_emas = 7200.0
jkm_bkk = 3600.0
lhdn_form_b = 558.0
i_saraan = 500.0
str_2026 = 450.0

total = jkm_warga_emas + jkm_bkk + lhdn_form_b + i_saraan + str_2026

print("{:<54s}{:>12s}".format("Scheme", "Annual (RM)"))
print("-" * 66)
print("{:<54s}{:>12,.2f}".format("JKM Warga Emas — dependent elderly payment", jkm_warga_emas))
print("{:<54s}{:>12,.2f}".format("JKM Bantuan Kanak-Kanak — per-child monthly payment", jkm_bkk))
print("{:<54s}{:>12,.2f}".format("LHDN Form B — five YA2025 reliefs", lhdn_form_b))
print("{:<54s}{:>12,.2f}".format("EPF i-Saraan — voluntary contribution government match", i_saraan))
print("{:<54s}{:>12,.2f}".format("STR 2026 — Household with children tier", str_2026))
print("-" * 66)
print("{:<54s}{:>12,.2f}".format("Total upside (annual)", total))`,
  stdout: `Scheme                                                 Annual (RM)
------------------------------------------------------------------
JKM Warga Emas — dependent elderly payment                7,200.00
JKM Bantuan Kanak-Kanak — per-child monthly payment       3,600.00
LHDN Form B — five YA2025 reliefs                           558.00
EPF i-Saraan — voluntary contribution government match      500.00
STR 2026 — Household with children tier                     450.00
------------------------------------------------------------------
Total upside (annual)                                    12,308.00`,
  total_annual_rm: 12308,
  per_scheme_rm: {
    jkm_warga_emas: 7200,
    jkm_bkk: 3600,
    lhdn_form_b: 558,
    i_saraan: 500,
    str_2026: 450
  }
}

export const AISYAH_PACKET: Packet = {
  drafts: [
    { scheme_id: 'jkm_warga_emas', filename: 'JKM18-warga-emas-draft-4321.pdf', blob_bytes_b64: null },
    { scheme_id: 'jkm_bkk', filename: 'JKM-bkk-draft-4321.pdf', blob_bytes_b64: null },
    { scheme_id: 'lhdn_form_b', filename: 'LHDN-form-b-relief-summary-4321.pdf', blob_bytes_b64: null },
    { scheme_id: 'i_saraan', filename: 'KWSP-i-saraan-draft-4321.pdf', blob_bytes_b64: null },
    { scheme_id: 'str_2026', filename: 'BK-01-STR2026-draft-4321.pdf', blob_bytes_b64: null },
    { scheme_id: 'perkeso_sksps', filename: 'PERKESO-sksps-draft-4321.pdf', blob_bytes_b64: null }
  ],
  generated_at: '2026-04-21T03:30:00Z'
}

/**
 * Ordered SSE replay. Delays are tuned to feel like real Gemini latency
 * without blowing the ≤10 s demo budget: ~3.8 s total end-to-end.
 */
export type MockEvent = { event: AgentEvent; delayMs: number }

// Phase 11 Feature 4 — synthetic timestamps in ascending order so the
// technical layer's `[hh:mm:ss]` prefix reads naturally on demo playback.
const MOCK_TS = {
  extract: '2026-05-12T12:00:01Z',
  classify: '2026-05-12T12:00:02Z',
  match: '2026-05-12T12:00:04Z',
  optimize_strategy: '2026-05-12T12:00:05Z',
  compute_upside: '2026-05-12T12:00:06Z',
  generate: '2026-05-12T12:00:09Z'
} as const

// Phase 11 Feature 2 — Aisyah trips the dependent-parent advisory because
// her profile carries has_elderly_dependant=true on form_b. The demo
// fixture's StrategyAdvice mirrors what the live optimizer would emit.
const AISYAH_DEMO_ADVISORY = {
  advice_id: 'demo-aisyah-001',
  interaction_id: 'lhdn_dependent_parent_single_claimer',
  severity: 'warn' as const,
  headline: 'Coordinate the RM 1,500 dependent-parent relief with siblings',
  rationale:
    'Only one filer per parent can claim this relief. The sibling at the highest marginal tax bracket should claim — split the cash informally so the family captures the maximum benefit.',
  citation: { pdf: 'pr-no-4-2024.pdf', section: '§5.2', page: 12 },
  confidence: 0.86,
  suggested_chat_prompt:
    'Who in my family should claim the dependent-parent relief, and how do we coordinate it on the LHDN portal?',
  applies_to_scheme_ids: ['lhdn_form_b']
}

export const AISYAH_MOCK_EVENTS: MockEvent[] = [
  { event: { type: 'step_started', step: 'extract' }, delayMs: 100 },
  { event: { type: 'step_result', step: 'extract', data: { profile: AISYAH_PROFILE } }, delayMs: 900 },
  {
    event: { type: 'narrative', step: 'extract', headline: 'Read your documents', data_point: 'RM 2,800' },
    delayMs: 40
  },
  {
    event: {
      type: 'technical',
      step: 'extract',
      timestamp: MOCK_TS.extract,
      log_lines: [
        'tool=extract_profile',
        '  uploads=ic:jpg payslip:pdf utility:pdf',
        '  ic=***-**-4321',
        '  monthly_income_rm=2800.0',
        '  household_size=4',
        '  dependants=3',
        '  form_type=form_b',
        '  latency_ms=820'
      ]
    },
    delayMs: 20
  },

  { event: { type: 'step_started', step: 'classify' }, delayMs: 150 },
  {
    event: { type: 'step_result', step: 'classify', data: { classification: AISYAH_CLASSIFICATION } },
    delayMs: 450
  },
  {
    event: {
      type: 'narrative',
      step: 'classify',
      headline: 'Worked out your household band',
      data_point: 'b40_household_with_children'
    },
    delayMs: 40
  },
  {
    event: {
      type: 'technical',
      step: 'classify',
      timestamp: MOCK_TS.classify,
      log_lines: [
        'tool=classify_household',
        '  income_band=b40_household_with_children',
        '  per_capita_monthly_rm=700.0',
        '  has_children_under_18=True',
        '  has_elderly_dependant=True',
        '  notes_count=4',
        '  latency_ms=320'
      ]
    },
    delayMs: 20
  },

  { event: { type: 'step_started', step: 'match' }, delayMs: 150 },
  {
    event: { type: 'step_result', step: 'match', data: { matches: AISYAH_SCHEME_MATCHES } },
    delayMs: 700
  },
  {
    event: {
      type: 'narrative',
      step: 'match',
      headline: 'Matched against the federal scheme library',
      data_point: '5 qualifying'
    },
    delayMs: 40
  },
  {
    event: {
      type: 'technical',
      step: 'match',
      timestamp: MOCK_TS.match,
      log_lines: [
        'tool=match_schemes',
        '  rules_evaluated=6  qualifying=5',
        '  ✓ str_2026 rm=2500 cite=risalah-str-2026.pdf:p.2',
        '  ✓ jkm_warga_emas rm=6000 cite=jkm18.pdf:p.4',
        '  ✓ jkm_bkk rm=3000 cite=jkm18.pdf:p.6',
        '  ✓ lhdn_form_b rm=4500 cite=pr-no-4-2024.pdf:p.12',
        '  ✓ i_saraan rm=500 cite=i-saraan.pdf:p.3',
        '  · perkeso_sksps',
        '  latency_ms=540'
      ]
    },
    delayMs: 20
  },

  { event: { type: 'step_started', step: 'optimize_strategy' }, delayMs: 150 },
  {
    event: {
      type: 'step_result',
      step: 'optimize_strategy',
      data: { advisories: [AISYAH_DEMO_ADVISORY] }
    },
    delayMs: 600
  },
  {
    event: {
      type: 'narrative',
      step: 'optimize_strategy',
      headline: 'Looked for cross-scheme strategy notes',
      data_point: '1 warn'
    },
    delayMs: 40
  },
  {
    event: {
      type: 'technical',
      step: 'optimize_strategy',
      timestamp: MOCK_TS.optimize_strategy,
      log_lines: [
        'tool=optimize_strategy (Gemini 2.5 Pro structured)',
        '  rules_loaded=3  rules_triggered=1  advisories_emitted=1',
        '  triggered=[lhdn_dependent_parent_single_claimer]',
        '  ✓ lhdn_dependent_parent_single_claimer sev=warn conf=0.86 cite=pr-no-4-2024.pdf:§5.2:p12',
        '  latency_ms=820'
      ]
    },
    delayMs: 20
  },

  { event: { type: 'step_started', step: 'compute_upside' }, delayMs: 150 },
  {
    event: { type: 'step_result', step: 'compute_upside', data: AISYAH_UPSIDE },
    delayMs: 700
  },
  {
    event: {
      type: 'narrative',
      step: 'compute_upside',
      headline: 'Calculated your annual upside',
      data_point: 'RM 16,500'
    },
    delayMs: 40
  },
  {
    event: {
      type: 'technical',
      step: 'compute_upside',
      timestamp: MOCK_TS.compute_upside,
      log_lines: [
        'tool=compute_upside (Gemini code_execution)',
        '  total_annual_rm=16500.00',
        '  python_snippet_chars=420  stdout_chars=180',
        '  per_scheme=[str_2026=2500, jkm_warga_emas=6000, jkm_bkk=3000, lhdn_form_b=4500, i_saraan=500]',
        '  stdout[0]=STR 2026: RM 2500',
        '  latency_ms=2100'
      ]
    },
    delayMs: 20
  },

  { event: { type: 'step_started', step: 'generate' }, delayMs: 150 },
  {
    event: { type: 'step_result', step: 'generate', data: { packet: AISYAH_PACKET } },
    delayMs: 550
  },
  {
    event: {
      type: 'narrative',
      step: 'generate',
      headline: 'Drafted application packets',
      data_point: '5 ready'
    },
    delayMs: 40
  },
  {
    event: {
      type: 'technical',
      step: 'generate',
      timestamp: MOCK_TS.generate,
      log_lines: [
        'tool=generate_packet (WeasyPrint + Jinja)',
        '  drafts=5',
        '  · str_2026 218.0KB',
        '  · jkm_warga_emas 195.0KB',
        '  · jkm_bkk 203.0KB',
        '  · lhdn_form_b 251.0KB',
        '  · i_saraan 187.0KB',
        '  latency_ms=1500'
      ]
    },
    delayMs: 20
  },

  { event: { type: 'done', packet: AISYAH_PACKET }, delayMs: 100 }
]
