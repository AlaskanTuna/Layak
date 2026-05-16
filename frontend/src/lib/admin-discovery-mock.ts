'use client'

/**
 * Frontend-only mock implementation of the discovery moderation pipeline.
 *
 * Phase 11 of `docs/plan.md` defines a backend runner agent that re-scrapes
 * gazetted scheme PDFs, diffs content, and stages candidates for moderation.
 * That runner is not green for the demo, so this module stands in for the
 * Phase 11 backend behind the same client API.
 *
 * Mock state is persisted in `localStorage` so refreshes preserve the demo
 * narrative. Bump `STORE_VERSION` to invalidate prior demos cleanly.
 *
 * Toggle via `NEXT_PUBLIC_LAYAK_DISCOVERY_MOCK`:
 *   "1" (default) → use this module
 *   "0"           → fall through to the real backend in `admin-discovery.ts`
 */

import type {
  ActionResponse,
  CandidateDetail,
  CandidateRow,
  CandidateStatus,
  DiscoveryRunSummary,
  QueueFilter,
  QueueResponse,
  SchemeCandidate,
  SchemeHealthResponse
} from '@/lib/admin-discovery-types'

const STORE_VERSION = 1
const STORE_KEY = `layak.mock.discovery.v${STORE_VERSION}`
const VERIFIED_KEY = `layak.mock.verified.v${STORE_VERSION}`
const RUN_COUNT_KEY = `layak.mock.discovery.runCount.v${STORE_VERSION}`

// 10-second simulated pipeline duration, per the demo brief.
export const MOCK_DISCOVERY_DELAY_MS = 10_000

// Custom event other components can listen on to re-fetch after a mock mutation.
// `useVerifiedAt` listens to refresh the `Source verified …` badge on /dashboard/schemes
// the moment a candidate is approved, without waiting for a page reload.
export const MOCK_CHANGED_EVENT = 'layak:discovery-changed'

export function isMockEnabled(): boolean {
  if (typeof process === 'undefined') return true
  return process.env.NEXT_PUBLIC_LAYAK_DISCOVERY_MOCK !== '0'
}

// ---------------------------------------------------------------------------
// localStorage shim
// ---------------------------------------------------------------------------

type StoredCandidate = { detail: CandidateDetail }
type MockStore = { candidates: Record<string, StoredCandidate> }
type VerifiedOverrideMap = Record<string, string>

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeWriteJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota exceeded — silent drop, mock is best-effort */
  }
}

function readStore(): MockStore {
  return safeReadJson<MockStore>(STORE_KEY, { candidates: {} })
}

function writeStore(store: MockStore): void {
  safeWriteJson(STORE_KEY, store)
}

function readVerified(): VerifiedOverrideMap {
  return safeReadJson<VerifiedOverrideMap>(VERIFIED_KEY, {})
}

function writeVerified(map: VerifiedOverrideMap): void {
  safeWriteJson(VERIFIED_KEY, map)
}

function readRunCount(): number {
  return safeReadJson<number>(RUN_COUNT_KEY, 0)
}

function writeRunCount(count: number): void {
  safeWriteJson(RUN_COUNT_KEY, count)
}

function dispatchChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(MOCK_CHANGED_EVENT))
}

// ---------------------------------------------------------------------------
// Seed pool — realistic mid-2026 scheme deltas the agent would surface.
// ---------------------------------------------------------------------------

type SeedCandidate = Omit<SchemeCandidate, 'candidate_id' | 'extracted_at'>

const SEED_POOL: SeedCandidate[] = [
  {
    source_id: 'hasil-str-2026',
    scheme_id: 'str_2026',
    name: 'STR 2026 — Sumbangan Tunai Rahmah',
    agency: 'Ministry of Finance Malaysia',
    eligibility_summary:
      'Household monthly income ≤ RM 5,000 with one or more children; payment scales by income band and child bucket (1–2, 3–4, ≥5).',
    rate_summary:
      'Q2 2026 update: top child bucket (≥5) increased from RM 2,200 to RM 2,500 / year. Bands 1–2 and 3–4 unchanged.',
    citation: {
      source_url: 'https://bantuantunai.hasil.gov.my/risalah-str-2026-q2.pdf',
      snippet:
        'Bagi keluarga yang mempunyai lima atau lebih kanak-kanak tanggungan, bantuan tahunan adalah RM 2,500 berkuat kuasa pembayaran fasa kedua (Jun 2026).'
    },
    source_url: 'https://bantuantunai.hasil.gov.my/risalah-str-2026-q2.pdf',
    source_content_hash: '8b3c2f6e91d4a07c5a2e60a3d7f1bb2c4d895fe1a206c4839b7c1f3d2a6e80b9',
    confidence: 0.94
  },
  {
    source_id: 'lhdn-pr-2025',
    scheme_id: 'lhdn_form_b',
    name: 'LHDN Form B — YA 2025 self-employed reliefs',
    agency: 'LHDN (Inland Revenue Board of Malaysia)',
    eligibility_summary:
      'Self-employed / sole-proprietor filers under Section 4(a) Income Tax Act 1967; reliefs cover personal, EPF voluntary, lifestyle, parental, medical.',
    rate_summary:
      'Public Ruling No. 4/2024 (amended Mar 2026): parental medical relief ceiling raised from RM 8,000 to RM 9,000. Lifestyle and personal reliefs unchanged.',
    citation: {
      source_url: 'https://lampiran1.hasil.gov.my/pdf/pdfam/PR_4_2024_amended_2026.pdf',
      snippet:
        'Perenggan 47 — Pelepasan perubatan ibu bapa adalah dinaikkan kepada RM 9,000 setahun, berkuat kuasa Tahun Taksiran 2025.'
    },
    source_url: 'https://lampiran1.hasil.gov.my/pdf/pdfam/PR_4_2024_amended_2026.pdf',
    source_content_hash: 'c1d0a7e4b820f93a16c2b8e5d4f8a06b9e1c5d3f7a2b4c6d8e0f1a3b5c7d9e0f',
    confidence: 0.91
  },
  {
    source_id: 'jkm-warga-emas',
    scheme_id: 'jkm_warga_emas',
    name: 'JKM Warga Emas — dependent elderly payment',
    agency: 'Jabatan Kebajikan Masyarakat (JKM)',
    eligibility_summary:
      'Filer supports a Malaysian-citizen elderly parent aged 60+ as a dependent; household monthly income within JKM means-test threshold (RM 2,208 single, RM 4,000 family).',
    rate_summary:
      '2026 budget update: monthly support raised from RM 500 to RM 600 per qualifying elderly dependent (annualised RM 7,200).',
    citation: {
      source_url: 'https://www.jkm.gov.my/jkm/uploads/files/JKM18-circular-2026.pdf',
      snippet:
        'Bantuan Warga Emas (BWE) ditambah baik kepada RM 600 sebulan bagi setiap penerima yang berkelayakan mulai Januari 2026.'
    },
    source_url: 'https://www.jkm.gov.my/jkm/uploads/files/JKM18-circular-2026.pdf',
    source_content_hash: '3f8a1b4c7d6e9020a3b5c7d9e1f3a5b7c9d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8',
    confidence: 0.88
  },
  {
    source_id: 'jkm-bkk',
    scheme_id: 'jkm_bkk',
    name: 'JKM Bantuan Kanak-Kanak — per-child monthly aid',
    agency: 'Jabatan Kebajikan Masyarakat (JKM)',
    eligibility_summary:
      'Single-parent or low-income households with school-aged children below 18; income-tested against JKM threshold.',
    rate_summary:
      'New top-up tier added for kids in primary school (7–12): RM 250 / month, up from RM 200 in 2025. Tertiary cohort unchanged.',
    citation: {
      source_url: 'https://www.jkm.gov.my/jkm/uploads/files/BKK-pekeliling-1-2026.pdf',
      snippet:
        'Kadar bantuan bulanan bagi kanak-kanak sekolah rendah (7-12 tahun) dinaikkan kepada RM 250 sebulan setiap kanak-kanak.'
    },
    source_url: 'https://www.jkm.gov.my/jkm/uploads/files/BKK-pekeliling-1-2026.pdf',
    source_content_hash: 'a92e5f1b7c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6',
    confidence: 0.86
  },
  {
    source_id: 'tnb-bantuan-elektrik',
    scheme_id: 'bantuan_elektrik',
    name: 'Bantuan Elektrik — Kumpulan Isi Rumah Miskin Tegar',
    agency: 'TNB · PETRA (Ministry of Economy)',
    eligibility_summary:
      "Household enrolled in eKasih (KIR Miskin Tegar registry); domestic electricity account in household head's name.",
    rate_summary:
      'Monthly rebate cap raised from RM 40 to RM 50; annual ceiling now RM 600 (was RM 480). Income trigger unchanged.',
    citation: {
      source_url: 'https://ihsanmadani.gov.my/wp-content/uploads/2026/rebat-elektrik-q2.pdf',
      snippet:
        'Penerima KIR Miskin Tegar layak menikmati rebat bil elektrik sehingga RM 50 sebulan, berkuat kuasa kitaran bil April 2026.'
    },
    source_url: 'https://ihsanmadani.gov.my/wp-content/uploads/2026/rebat-elektrik-q2.pdf',
    source_content_hash: 'd47b9c2e5a1f8036b4d0c7e9f1a3b5c7d9e1f3a5b7c9d0e2f4a6b8c0d2e4f6a8',
    confidence: 0.82
  },
  {
    source_id: 'perkeso-sksps-2026',
    scheme_id: 'perkeso_sksps',
    name: 'PERKESO SKSPS — Self-Employed Social Security',
    agency: 'PERKESO (SOCSO)',
    eligibility_summary: 'Self-employed Malaysians across all 20 SKSPS sectors; voluntary enrolment via Form SKSPS-1.',
    rate_summary:
      'Plan 1 base contribution unchanged at RM 232.80 / year; Plan 4 ceiling lifted from RM 596.40 to RM 692.40 to reflect 2026 wage-ceiling refresh.',
    citation: {
      source_url: 'https://www.perkeso.gov.my/images/Pelan-SKSPS-2026.pdf',
      snippet:
        'Pelan 4 (pendapatan diinsuranskan RM 3,950) — caruman tahunan dikemaskini kepada RM 692.40 berkuat kuasa Januari 2026.'
    },
    source_url: 'https://www.perkeso.gov.my/images/Pelan-SKSPS-2026.pdf',
    source_content_hash: '5e1c8a7d3b6f9024c1e3a5b7c9d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6',
    confidence: 0.79
  },
  {
    source_id: 'kwsp-i-saraan',
    scheme_id: 'i_saraan',
    name: 'EPF i-Saraan — voluntary contribution government match',
    agency: 'KWSP (Employees Provident Fund)',
    eligibility_summary:
      'Self-employed Malaysian citizens aged 18–55; voluntary contribution into KWSP Akaun i-Saraan during the calendar year.',
    rate_summary:
      '15% government match cap stays at RM 500 / year; new top-up: members aged 40+ receive an additional 5% match for the first RM 1,000 contributed.',
    citation: {
      source_url: 'https://www.kwsp.gov.my/documents/40/2026-i-saraan-incentive.pdf',
      snippet:
        'Insentif tambahan 5% bagi ahli berumur 40 tahun ke atas — diberikan untuk RM 1,000 caruman sukarela pertama setiap tahun.'
    },
    source_url: 'https://www.kwsp.gov.my/documents/40/2026-i-saraan-incentive.pdf',
    source_content_hash: '2b9f1d0e3a8c7b6a5d4f2e0b9c8a7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c',
    confidence: 0.92
  },
  {
    source_id: 'mof-sara-rate-schedule',
    scheme_id: 'sara',
    name: 'SARA — Sumbangan Asas Rahmah (MyKad credit)',
    agency: 'Ministry of Finance Malaysia',
    eligibility_summary:
      'Adult Malaysian individual with household monthly income ≤ RM 5,000 enrolled in eKasih; benefit auto-credited to MyKad each cycle.',
    rate_summary:
      'May 2026 schedule: per-cycle credit raised from RM 100 to RM 120 across all six 2026 disbursement windows (annualised RM 1,440 → RM 1,440 + RM 120 × 6 cap RM 2,400 retained).',
    citation: {
      source_url: 'https://sara.gov.my/jadual-kadar-2026-may.pdf',
      snippet:
        'Mulai Mei 2026, nilai kredit setiap kitaran SARA dinaikkan kepada RM 120 sekitaran bagi penerima berkelayakan dengan pendapatan isi rumah ≤ RM 5,000.'
    },
    source_url: 'https://sara.gov.my/jadual-kadar-2026-may.pdf',
    source_content_hash: '4b3a2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b',
    confidence: 0.85
  },
  {
    source_id: 'mof-mykasih-sara-rm100',
    scheme_id: 'mykasih',
    name: 'MyKasih SARA RM100 — one-off MyKad credit top-up',
    agency: 'Ministry of Finance Malaysia',
    eligibility_summary:
      'Existing SARA recipients with one or more registered school-age children; one-off RM 100 top-up credited alongside the regular SARA cycle.',
    rate_summary:
      'Programme extended into Q3 2026 with the RM 100 cap unchanged; eligibility broadened to include B40+ households earning ≤ RM 5,500 / month.',
    citation: {
      source_url: 'https://www.mof.gov.my/portal/en/news/press-citations/mykasih-sara-rm100-q3-extension.html',
      snippet:
        'Penambahan satu kali RM 100 di bawah inisiatif MyKasih SARA dilanjutkan ke suku ketiga 2026 dengan had pendapatan isi rumah ≤ RM 5,500.'
    },
    source_url: 'https://www.mof.gov.my/portal/en/news/press-citations/mykasih-sara-rm100-q3-extension.html',
    source_content_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    confidence: 0.74
  },
  {
    source_id: 'perkeso-sip-coverage',
    scheme_id: 'perkeso_sip',
    name: 'PERKESO SIP — Employment Insurance scheme',
    agency: 'PERKESO (SOCSO)',
    eligibility_summary:
      'Employees insured under SIP via employer EIS contributions; benefits include Job Search Allowance, Reduced Income Allowance, and re-employment placement.',
    rate_summary:
      '2026 update: Job Search Allowance ceiling raised from RM 4,000 to RM 4,500 / month for the first 3 months; subsequent months unchanged.',
    citation: {
      source_url: 'https://eis.perkeso.gov.my/manual/SIP-coverage-2026.pdf',
      snippet:
        'Elaun Mencari Pekerjaan (EMP) — kadar bagi tiga bulan pertama dikemaskini kepada RM 4,500 mulai Januari 2026.'
    },
    source_url: 'https://eis.perkeso.gov.my/manual/SIP-coverage-2026.pdf',
    source_content_hash: '6c5b4a3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b',
    confidence: 0.83
  },
  {
    source_id: 'budi95-press-release',
    scheme_id: 'budi95',
    name: 'BUDI95 — RON95 petrol subsidy (MyKad scan at pump)',
    agency: 'Ministry of Finance Malaysia',
    eligibility_summary:
      'Malaysian citizen aged 16+ with a valid driving licence (classes A/A1/B/B1/B2/C/D/DA); MyKad scanned at participating petrol stations.',
    rate_summary:
      'Monthly subsidised quota lowered from 200 L to 150 L per MyKad effective June 2026; subsidised price RM 1.99/L retained.',
    citation: {
      source_url: 'https://www.budi95.gov.my/en/news/quota-revision-june-2026.html',
      snippet:
        'Kuota subsidi RON95 di bawah BUDI95 dikurangkan kepada 150 liter sebulan setiap MyKad mulai Jun 2026 manakala harga subsidi RM 1.99 seliter dikekalkan.'
    },
    source_url: 'https://www.budi95.gov.my/en/news/quota-revision-june-2026.html',
    source_content_hash: '1f0e9d8c7b6a5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e',
    confidence: 0.77
  },
  {
    source_id: 'kpm-bap-circular',
    scheme_id: 'bap',
    name: 'BAP — Bantuan Awal Persekolahan',
    agency: 'Ministry of Education (KPM)',
    eligibility_summary:
      'Pupils enrolled in public primary or secondary schools whose parents file Form B / BE / employer payroll income ≤ RM 5,000 / month.',
    rate_summary:
      '2026 circular increases the per-child grant from RM 150 to RM 200, credited via school sometime in late January per academic year.',
    citation: {
      source_url: 'https://www.moe.gov.my/bantuan-awal-persekolahan/circular-bap-2026.pdf',
      snippet:
        'Bantuan Awal Persekolahan (BAP) — kadar bantuan dikemaskini kepada RM 200 setiap murid mulai sesi persekolahan 2026.'
    },
    source_url: 'https://www.moe.gov.my/bantuan-awal-persekolahan/circular-bap-2026.pdf',
    source_content_hash: '8e7d6c5b4a3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f',
    confidence: 0.88
  },
  {
    source_id: 'kpm-rmt-circular',
    scheme_id: 'rmt',
    name: 'RMT — Rancangan Makanan Tambahan',
    agency: 'Ministry of Education (KPM)',
    eligibility_summary:
      'Primary school pupils from low-income households endorsed by the school RMT committee; complimentary daily meal during academic terms.',
    rate_summary:
      '2026 menu pack budget raised from RM 4.00 to RM 5.50 per meal for SK schools in B40 catchment districts; rural ceiling unchanged.',
    citation: {
      source_url: 'https://www.moe.gov.my/rancangan-makanan-tambahan/rmt-pekeliling-2026.pdf',
      snippet:
        'Kos makanan Rancangan Makanan Tambahan (RMT) bagi sekolah B40 dinaikkan kepada RM 5.50 setiap hidangan mulai Januari 2026.'
    },
    source_url: 'https://www.moe.gov.my/rancangan-makanan-tambahan/rmt-pekeliling-2026.pdf',
    source_content_hash: '2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e',
    confidence: 0.81
  },
  {
    source_id: 'kpm-spbt-circular',
    scheme_id: 'spbt',
    name: 'SPBT — Skim Pinjaman Buku Teks',
    agency: 'Ministry of Education (KPM)',
    eligibility_summary:
      'All Malaysian pupils in public schools receive textbook loans (auto enrolment); supplementary subject books distributed via school SPBT committee.',
    rate_summary:
      '2026 circular adds Year 4 Bahasa Cina / Tamil textbooks under SPBT auto-loan; nominal book value rises from RM 250 to RM 280 / child.',
    citation: {
      source_url:
        'https://www.moe.gov.my/bantuan-pembelajaran-menu/skim-pinjaman-buku-teks-spbt/spbt-pekeliling-2026.pdf',
      snippet:
        'Buku teks tambahan SJKC / SJKT Tahun 4 dimasukkan ke dalam senarai SPBT mulai sesi 2026; nilai pinjaman setiap murid dianggar RM 280.'
    },
    source_url:
      'https://www.moe.gov.my/bantuan-pembelajaran-menu/skim-pinjaman-buku-teks-spbt/spbt-pekeliling-2026.pdf',
    source_content_hash: '7b6a5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c',
    confidence: 0.86
  },
  {
    source_id: 'kpm-kwapm-circular',
    scheme_id: 'kwapm',
    name: 'KWAPM — Kumpulan Wang Amanah Pelajar Miskin',
    agency: 'Ministry of Education (KPM)',
    eligibility_summary:
      'Pupils in primary or secondary public schools from households earning ≤ RM 1,500 / month; endorsed by the school KWAPM committee.',
    rate_summary:
      '2026 cycle raises per-pupil grant from RM 200 to RM 250 / year; secondary cohort gains a new uniform allowance of RM 80 / year.',
    citation: {
      source_url: 'https://www.moe.gov.my/bantuan-kumpulan-wang-amanah-pelajar-miskin-kwapm/kwapm-pekeliling-2026.pdf',
      snippet:
        'Bantuan Kumpulan Wang Amanah Pelajar Miskin (KWAPM) — kadar bantuan tahunan dinaikkan kepada RM 250 setiap pelajar mulai 2026.'
    },
    source_url: 'https://www.moe.gov.my/bantuan-kumpulan-wang-amanah-pelajar-miskin-kwapm/kwapm-pekeliling-2026.pdf',
    source_content_hash: '5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
    confidence: 0.83
  },
  {
    source_id: 'kpwkm-taska-permata',
    scheme_id: 'taska_permata',
    name: 'TASKA / TADIKA Permata — childcare fee subsidy',
    agency: 'KPWKM · Jabatan Permata',
    eligibility_summary:
      'Working parents enrolled with PERMATA-registered TASKA / TADIKA; household income ≤ RM 5,000 / month per parent.',
    rate_summary:
      '2026 subsidy ceiling raised from RM 165 to RM 180 / child / month (annualised RM 2,160) for TASKA; TADIKA tier unchanged at RM 90 / month.',
    citation: {
      source_url:
        'https://www.kpwkm.gov.my/portal-main/list-services?type=taman-asuhan-kanak-kanak&doc=permata-circular-2026.pdf',
      snippet:
        'Subsidi yuran TASKA Permata bagi keluarga berpendapatan RM 5,000 ke bawah dikemaskini kepada RM 180 sebulan setiap kanak-kanak mulai Januari 2026.'
    },
    source_url:
      'https://www.kpwkm.gov.my/portal-main/list-services?type=taman-asuhan-kanak-kanak&doc=permata-circular-2026.pdf',
    source_content_hash: '0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d',
    confidence: 0.8
  },
  {
    source_id: 'moh-peka-b40',
    scheme_id: 'peka_b40',
    name: 'PeKa B40 — health screening voucher',
    agency: 'Ministry of Health · ProtectHealth',
    eligibility_summary:
      'Adult Malaysian aged 40+ in B40 households (eKasih / STR-flagged); annual non-communicable disease screening at participating GP clinics.',
    rate_summary:
      '2026 voucher value raised from RM 200 to RM 250 per beneficiary; cardiovascular risk panel added to the bundled screening list.',
    citation: {
      source_url: 'https://protecthealth.com.my/peka-b40/circular-2026.pdf',
      snippet:
        'Baucar saringan PeKa B40 — nilai dinaikkan kepada RM 250 setiap penerima dan ditambah panel risiko kardiovaskular mulai 2026.'
    },
    source_url: 'https://protecthealth.com.my/peka-b40/circular-2026.pdf',
    source_content_hash: '3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f',
    confidence: 0.82
  },
  {
    source_id: 'mof-mysalam',
    scheme_id: 'mysalam',
    name: 'MySalam — critical illness + hospitalisation income protection',
    agency: 'Ministry of Finance Malaysia',
    eligibility_summary:
      'Malaysian citizens aged 18–65 in B40 / STR-flagged households; auto-enrolled via STR processing.',
    rate_summary:
      '2026 coverage refresh: 36-disease list extended to 40 critical illnesses; one-time lump-sum payout raised from RM 8,000 to RM 10,000.',
    citation: {
      source_url: 'https://www.mysalam.com.my/documents/mysalam-2026-coverage.pdf',
      snippet:
        'Senarai penyakit kritikal dilanjutkan kepada 40 keadaan dan bayaran sekali gus dinaikkan kepada RM 10,000 mulai pelan 2026.'
    },
    source_url: 'https://www.mysalam.com.my/documents/mysalam-2026-coverage.pdf',
    source_content_hash: 'b1a0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0',
    confidence: 0.79
  },
  {
    source_id: 'lhdn-form-be',
    scheme_id: 'lhdn_form_be',
    name: 'LHDN Form BE — YA 2025 salaried reliefs',
    agency: 'LHDN (Inland Revenue Board of Malaysia)',
    eligibility_summary:
      'Salaried filers under Section 4(b) Income Tax Act 1967 with monthly PCB deducted; reliefs cover personal, EPF, lifestyle, parental, medical.',
    rate_summary:
      'Public Ruling No. 4/2024 (Form BE amended Mar 2026): lifestyle relief sub-cap for digital subscriptions raised from RM 2,500 to RM 3,000.',
    citation: {
      source_url: 'https://lampiran1.hasil.gov.my/pdf/pdfam/PR_4_2024_amended_2026_BE.pdf',
      snippet:
        'Bagi Borang BE Tahun Taksiran 2025, sub-had pelepasan gaya hidup digital ialah RM 3,000, naik daripada RM 2,500 pada tahun sebelumnya.'
    },
    source_url: 'https://lampiran1.hasil.gov.my/pdf/pdfam/PR_4_2024_amended_2026_BE.pdf',
    source_content_hash: '6f5e4d3c2b1a0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d',
    confidence: 0.9
  },
  {
    source_id: 'kwsp-i-suri',
    scheme_id: 'i_suri',
    name: 'KWSP i-Suri — homemaker savings incentive',
    agency: 'KWSP (Employees Provident Fund)',
    eligibility_summary:
      'Female Malaysian citizens registered as homemakers under eKasih / STR with valid MyKad; voluntary i-Suri account contributions.',
    rate_summary:
      'Government incentive raised from RM 300 to RM 360 / year (matching RM 30 / month for 12 months); previously RM 25 / month.',
    citation: {
      source_url: 'https://www.kwsp.gov.my/documents/40/2026-i-suri-incentive.pdf',
      snippet:
        'Insentif Kerajaan i-Suri ditambah baik kepada RM 360 setahun (RM 30 sebulan) bagi ahli homemaker yang memenuhi syarat eKasih mulai 2026.'
    },
    source_url: 'https://www.kwsp.gov.my/documents/40/2026-i-suri-incentive.pdf',
    source_content_hash: 'd4c3b2a1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3',
    confidence: 0.81
  }
]

// ---------------------------------------------------------------------------
// Public mock API
// ---------------------------------------------------------------------------

function candidateIdForSeed(seed: SeedCandidate): string {
  // Stable per-scheme key — every re-scrape reuses the same id so two
  // pending rows for the same scheme never coexist in the queue.
  return seed.scheme_id ? `mock-${seed.scheme_id}` : `mock-new-${seed.source_id}`
}

export async function mockTrigger(): Promise<DiscoveryRunSummary> {
  const startedAt = new Date().toISOString()
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DISCOVERY_DELAY_MS))
  const finishedAt = new Date().toISOString()

  const runNumber = readRunCount() + 1
  writeRunCount(runNumber)

  // Re-scrape every in-scope source on each trigger. Idempotency rule:
  // a freshly-extracted pending candidate REPLACES the existing pending
  // row for the same scheme, but never clobbers an approved / rejected /
  // changes-requested row — moderated state is preserved across re-runs.
  const store = readStore()
  let changedCount = 0
  for (const seed of SEED_POOL) {
    const candidateId = candidateIdForSeed(seed)
    const existing = store.candidates[candidateId]
    if (existing && existing.detail.status !== 'pending') {
      // Moderated — leave it alone. The reviewer already made a call.
      continue
    }
    store.candidates[candidateId] = {
      detail: {
        candidate: { ...seed, candidate_id: candidateId, extracted_at: finishedAt },
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        admin_note: null
      }
    }
    changedCount += 1
  }
  writeStore(store)
  dispatchChanged()

  // Sources_checked reflects every source the agent visited (always the
  // full seed pool); sources_changed only counts rows the queue actually
  // rewrote, so re-runs with everything already moderated read as zero.
  return {
    started_at: startedAt,
    finished_at: finishedAt,
    sources_checked: SEED_POOL.length,
    sources_changed: changedCount,
    candidates_extracted: changedCount,
    candidates_persisted: changedCount,
    errors: []
  }
}

export function mockFetchQueue(filter: QueueFilter): QueueResponse {
  const store = readStore()
  let rows = Object.values(store.candidates)
  if (filter !== 'all') {
    rows = rows.filter((entry) => entry.detail.status === filter)
  }
  const items: CandidateRow[] = rows.map(({ detail }) => ({
    candidate_id: detail.candidate.candidate_id,
    source_id: detail.candidate.source_id,
    scheme_id: detail.candidate.scheme_id,
    name: detail.candidate.name,
    agency: detail.candidate.agency,
    status: detail.status,
    created_at: detail.candidate.extracted_at,
    reviewed_at: detail.reviewed_at,
    confidence: detail.candidate.confidence
  }))
  items.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
  return { items }
}

export function mockFetchCandidate(candidateId: string): CandidateDetail {
  const store = readStore()
  const entry = store.candidates[candidateId]
  if (!entry) {
    throw new Error(`Candidate not found: ${candidateId}`)
  }
  return entry.detail
}

function transition(
  candidateId: string,
  target: CandidateStatus,
  note: string | null,
  options: { writeVerified?: boolean } = {}
): ActionResponse {
  const store = readStore()
  const entry = store.candidates[candidateId]
  if (!entry) {
    throw new Error(`Candidate not found: ${candidateId}`)
  }
  const reviewedAt = new Date().toISOString()
  entry.detail = {
    ...entry.detail,
    status: target,
    reviewed_by: 'mock-admin',
    reviewed_at: reviewedAt,
    admin_note: note
  }
  store.candidates[candidateId] = entry
  writeStore(store)

  let manifestYaml: string | null = null
  if (target === 'approved') {
    manifestYaml = buildMockManifest(entry.detail.candidate, note ?? null)

    // Stamp verified_at for the matched scheme so the schemes-page badge
    // flips to "Source verified just now". Unmatched candidates skip this —
    // there's no canonical scheme to associate the verification with.
    if (options.writeVerified !== false && entry.detail.candidate.scheme_id) {
      const verified = readVerified()
      verified[entry.detail.candidate.scheme_id] = reviewedAt
      writeVerified(verified)
    }
  }

  dispatchChanged()

  return {
    candidate_id: candidateId,
    status: target,
    manifest_path:
      manifestYaml !== null
        ? `data/discovered/${entry.detail.candidate.scheme_id ?? candidateId.slice(0, 8)}-mock.yaml`
        : null,
    manifest_yaml: manifestYaml
  }
}

export function mockApprove(candidateId: string, note?: string): ActionResponse {
  return transition(candidateId, 'approved', note ?? null)
}

export function mockReject(candidateId: string, note?: string): ActionResponse {
  return transition(candidateId, 'rejected', note ?? null)
}

export function mockRequestChanges(candidateId: string, note?: string): ActionResponse {
  return transition(candidateId, 'changes_requested', note ?? null)
}

export function mockDelete(candidateId: string): void {
  const store = readStore()
  delete store.candidates[candidateId]
  writeStore(store)
  dispatchChanged()
}

export function mockFetchSchemeHealth(): SchemeHealthResponse {
  const verified = readVerified()
  const store = readStore()
  // Build a hash map per scheme_id, preferring the most-recent verified_at.
  const items = Object.entries(verified).map(([schemeId, verifiedAt]) => {
    const approvedCandidate = Object.values(store.candidates).find(
      (entry) => entry.detail.candidate.scheme_id === schemeId && entry.detail.status === 'approved'
    )
    return {
      scheme_id: schemeId,
      verified_at: verifiedAt,
      source_content_hash: approvedCandidate?.detail.candidate.source_content_hash ?? null
    }
  })
  return { items }
}

export function getMockVerifiedOverrides(): VerifiedOverrideMap {
  return readVerified()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMockManifest(candidate: SchemeCandidate, note: string | null): string {
  // Minimal YAML emitter to avoid a runtime dep. The detail card just hands
  // this blob to the user as a downloadable file; format-perfect YAML is not
  // required for the demo flow.
  const indent = (n: number) => ' '.repeat(n)
  const escape = (value: string) => value.replace(/"/g, '\\"')
  const lines: string[] = []
  lines.push('# Layak — discovered scheme manifest (mock)')
  lines.push(`candidate_id: "${candidate.candidate_id}"`)
  lines.push(`scheme_id: ${candidate.scheme_id ? `"${candidate.scheme_id}"` : 'null'}`)
  lines.push(`name: "${escape(candidate.name)}"`)
  lines.push(`agency: "${escape(candidate.agency)}"`)
  lines.push(`source_id: "${candidate.source_id}"`)
  lines.push(`source_url: "${candidate.source_url}"`)
  lines.push(`source_content_hash: "${candidate.source_content_hash}"`)
  lines.push(`confidence: ${candidate.confidence}`)
  lines.push(`extracted_at: "${candidate.extracted_at}"`)
  lines.push('eligibility_summary: |')
  for (const line of candidate.eligibility_summary.split('\n')) {
    lines.push(`${indent(2)}${line}`)
  }
  lines.push('rate_summary: |')
  for (const line of candidate.rate_summary.split('\n')) {
    lines.push(`${indent(2)}${line}`)
  }
  lines.push('citation:')
  lines.push(`${indent(2)}source_url: "${candidate.citation.source_url}"`)
  lines.push(`${indent(2)}snippet: |`)
  for (const line of candidate.citation.snippet.split('\n')) {
    lines.push(`${indent(4)}${line}`)
  }
  if (note) {
    lines.push('admin_note: |')
    for (const line of note.split('\n')) {
      lines.push(`${indent(2)}${line}`)
    }
  }
  return lines.join('\n') + '\n'
}
