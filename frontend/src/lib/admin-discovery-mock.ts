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
      source_url:
        'https://bantuantunai.hasil.gov.my/risalah-str-2026-q2.pdf',
      snippet:
        'Bagi keluarga yang mempunyai lima atau lebih kanak-kanak tanggungan, bantuan tahunan adalah RM 2,500 berkuat kuasa pembayaran fasa kedua (Jun 2026).'
    },
    source_url: 'https://bantuantunai.hasil.gov.my/risalah-str-2026-q2.pdf',
    source_content_hash:
      '8b3c2f6e91d4a07c5a2e60a3d7f1bb2c4d895fe1a206c4839b7c1f3d2a6e80b9',
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
      source_url:
        'https://lampiran1.hasil.gov.my/pdf/pdfam/PR_4_2024_amended_2026.pdf',
      snippet:
        'Perenggan 47 — Pelepasan perubatan ibu bapa adalah dinaikkan kepada RM 9,000 setahun, berkuat kuasa Tahun Taksiran 2025.'
    },
    source_url:
      'https://lampiran1.hasil.gov.my/pdf/pdfam/PR_4_2024_amended_2026.pdf',
    source_content_hash:
      'c1d0a7e4b820f93a16c2b8e5d4f8a06b9e1c5d3f7a2b4c6d8e0f1a3b5c7d9e0f',
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
    source_content_hash:
      '3f8a1b4c7d6e9020a3b5c7d9e1f3a5b7c9d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8',
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
    source_content_hash:
      'a92e5f1b7c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6',
    confidence: 0.86
  },
  {
    source_id: 'tnb-bantuan-elektrik',
    scheme_id: 'bantuan_elektrik',
    name: 'Bantuan Elektrik — Kumpulan Isi Rumah Miskin Tegar',
    agency: 'TNB · PETRA (Ministry of Economy)',
    eligibility_summary:
      'Household enrolled in eKasih (KIR Miskin Tegar registry); domestic electricity account in household head\'s name.',
    rate_summary:
      'Monthly rebate cap raised from RM 40 to RM 50; annual ceiling now RM 600 (was RM 480). Income trigger unchanged.',
    citation: {
      source_url:
        'https://ihsanmadani.gov.my/wp-content/uploads/2026/rebat-elektrik-q2.pdf',
      snippet:
        'Penerima KIR Miskin Tegar layak menikmati rebat bil elektrik sehingga RM 50 sebulan, berkuat kuasa kitaran bil April 2026.'
    },
    source_url:
      'https://ihsanmadani.gov.my/wp-content/uploads/2026/rebat-elektrik-q2.pdf',
    source_content_hash:
      'd47b9c2e5a1f8036b4d0c7e9f1a3b5c7d9e1f3a5b7c9d0e2f4a6b8c0d2e4f6a8',
    confidence: 0.82
  },
  {
    source_id: 'perkeso-sksps-2026',
    scheme_id: 'perkeso_sksps',
    name: 'PERKESO SKSPS — Self-Employed Social Security',
    agency: 'PERKESO (SOCSO)',
    eligibility_summary:
      'Self-employed Malaysians across all 20 SKSPS sectors; voluntary enrolment via Form SKSPS-1.',
    rate_summary:
      'Plan 1 base contribution unchanged at RM 232.80 / year; Plan 4 ceiling lifted from RM 596.40 to RM 692.40 to reflect 2026 wage-ceiling refresh.',
    citation: {
      source_url:
        'https://www.perkeso.gov.my/images/Pelan-SKSPS-2026.pdf',
      snippet:
        'Pelan 4 (pendapatan diinsuranskan RM 3,950) — caruman tahunan dikemaskini kepada RM 692.40 berkuat kuasa Januari 2026.'
    },
    source_url:
      'https://www.perkeso.gov.my/images/Pelan-SKSPS-2026.pdf',
    source_content_hash:
      '5e1c8a7d3b6f9024c1e3a5b7c9d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6',
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
      source_url:
        'https://www.kwsp.gov.my/documents/40/2026-i-saraan-incentive.pdf',
      snippet:
        'Insentif tambahan 5% bagi ahli berumur 40 tahun ke atas — diberikan untuk RM 1,000 caruman sukarela pertama setiap tahun.'
    },
    source_url:
      'https://www.kwsp.gov.my/documents/40/2026-i-saraan-incentive.pdf',
    source_content_hash:
      '2b9f1d0e3a8c7b6a5d4f2e0b9c8a7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c',
    confidence: 0.92
  },
  {
    // Unmatched candidate — exercises the "new scheme" path in the detail page.
    // Tests that the moderator UI gracefully handles an extracted scheme the
    // engineer team has not coded a Pydantic rule for yet.
    source_id: 'mof-bantuan-musim-tengkujuh',
    scheme_id: null,
    name: 'Bantuan Khas Musim Tengkujuh 2026',
    agency: 'Ministry of Finance Malaysia',
    eligibility_summary:
      'New flood-relief cash payment for households in Kelantan, Terengganu, and Pahang affected by the 2026 monsoon. Eligibility verified via NADMA registration.',
    rate_summary:
      'One-off RM 1,000 per affected household head, credited to MyKad-linked bank account. Application window: 1 May – 30 Jun 2026.',
    citation: {
      source_url:
        'https://www.mof.gov.my/portal/en/news/press-citations/bantuan-musim-tengkujuh-2026.pdf',
      snippet:
        'Bantuan khas RM 1,000 sekali bayaran ditawarkan kepada ketua isi rumah yang terjejas banjir Musim Tengkujuh 2026 di Kelantan, Terengganu dan Pahang.'
    },
    source_url:
      'https://www.mof.gov.my/portal/en/news/press-citations/bantuan-musim-tengkujuh-2026.pdf',
    source_content_hash:
      '7c4a3e2d1b0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c4b',
    confidence: 0.71
  }
]

// ---------------------------------------------------------------------------
// Public mock API
// ---------------------------------------------------------------------------

export async function mockTrigger(): Promise<DiscoveryRunSummary> {
  const startedAt = new Date().toISOString()
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DISCOVERY_DELAY_MS))
  const finishedAt = new Date().toISOString()

  const runNumber = readRunCount() + 1
  writeRunCount(runNumber)

  // Rotate which seeds are surfaced each run so re-clicks produce a different
  // batch — matches the "agent re-scrapes and finds different deltas" mental
  // model. Batch size oscillates 4↔3 so the KPIs visibly change run-to-run.
  const batchSize = runNumber % 2 === 1 ? 4 : 3
  const offset = ((runNumber - 1) * 3) % SEED_POOL.length

  const picks: SchemeCandidate[] = []
  for (let i = 0; i < batchSize; i++) {
    const seedIdx = (offset + i) % SEED_POOL.length
    const seed = SEED_POOL[seedIdx]
    picks.push({
      ...seed,
      candidate_id: `mock-r${runNumber}-${seedIdx}`,
      extracted_at: finishedAt
    })
  }

  const store = readStore()
  for (const pick of picks) {
    store.candidates[pick.candidate_id] = {
      detail: {
        candidate: pick,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        admin_note: null
      }
    }
  }
  writeStore(store)
  dispatchChanged()

  // Sources_checked deliberately > batch size — reflects the agent visiting
  // every gazetted source page even when only a subset reports a content
  // delta. Numbers chosen to feel realistic in the KPI tiles.
  return {
    started_at: startedAt,
    finished_at: finishedAt,
    sources_checked: SEED_POOL.length + 4,
    sources_changed: batchSize,
    candidates_extracted: batchSize,
    candidates_persisted: batchSize,
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
      (entry) =>
        entry.detail.candidate.scheme_id === schemeId && entry.detail.status === 'approved'
    )
    return {
      scheme_id: schemeId,
      verified_at: verifiedAt,
      source_content_hash:
        approvedCandidate?.detail.candidate.source_content_hash ?? null
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
