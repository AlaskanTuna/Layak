/**
 * Static baseline metadata for each in-scope scheme.
 *
 * Used by the admin moderation diff view to render the unified
 * proposed-vs-current view: the discovery agent's extracted candidate
 * is diffed against this baseline so reviewers see what the agent thinks
 * changed.
 *
 * This is intentionally a short editorial summary, not a verbatim copy of
 * the Pydantic rule's match() output — the diff is exploratory ("the source
 * page now says X; we currently teach Y"), not a code patch. Engineers
 * still hand-write rule updates against the YAML manifest written on
 * approve. Keep this in sync with backend/app/rules/{scheme_id}.py when
 * rule semantics change materially.
 */

export type SchemeBaseline = {
  name: string
  agency: string
  eligibility_summary: string
  rate_summary: string
}

export const SCHEME_BASELINES: Record<string, SchemeBaseline> = {
  str_2026: {
    name: 'STR 2026 — Sumbangan Tunai Rahmah',
    agency: 'LHDN (HASiL) / Kementerian Kewangan',
    eligibility_summary:
      'Household tier with children; monthly income ≤ RM 5,000; size-of-household child buckets 1–2, 3–4, ≥5.',
    rate_summary: 'RM 200 – RM 2,200 / year by income band × child bucket. Risalah p.2.'
  },
  jkm_warga_emas: {
    name: 'JKM Warga Emas — dependent elderly payment',
    agency: 'JKM (Jabatan Kebajikan Masyarakat)',
    eligibility_summary:
      'Filer supports an elderly parent (age ≥ 60) as a dependent; household monthly income within JKM threshold.',
    rate_summary: 'RM 500 / month per qualifying elderly dependant; up to RM 6,000 / year.'
  },
  jkm_bkk: {
    name: 'JKM Bantuan Kanak-Kanak — per-child monthly payment',
    agency: 'JKM (Jabatan Kebajikan Masyarakat)',
    eligibility_summary:
      'Single-parent households or households with school-aged children; income tested against JKM threshold.',
    rate_summary: 'RM 150 – RM 250 / month per child depending on age band; up to RM 3,000 / year per child.'
  },
  lhdn_form_b: {
    name: 'LHDN Form B — YA2025 self-employed reliefs',
    agency: 'LHDN (HASiL)',
    eligibility_summary:
      'Self-employed / business filers; five core reliefs (personal, EPF, lifestyle, parental, medical).',
    rate_summary: 'Up to RM 9,000 personal + bracketed reliefs per Public Ruling 4/2024.'
  },
  lhdn_form_be: {
    name: 'LHDN Form BE — YA2025 salaried reliefs',
    agency: 'LHDN (HASiL)',
    eligibility_summary:
      'Salaried filers (PCB withheld); five core reliefs (personal, EPF, lifestyle, parental, medical).',
    rate_summary: 'Up to RM 9,000 personal + bracketed reliefs per Public Ruling 4/2024.'
  },
  perkeso_sksps: {
    name: 'PERKESO SKSPS — Self-Employed Social Security',
    agency: 'PERKESO (SOCSO)',
    eligibility_summary: 'Self-employed Malaysians enrolled under PERKESO SKSPS scheme.',
    rate_summary: 'Tiered annual contribution — kind=required_contribution, not an upside scheme.'
  },
  i_saraan: {
    name: 'EPF i-Saraan — voluntary contribution govt match',
    agency: 'KWSP (Employees Provident Fund)',
    eligibility_summary: 'Self-employed Malaysians making voluntary EPF contributions.',
    rate_summary: 'Government matches 15% of voluntary contribution, capped at RM 500 / year.'
  }
}

export function baselineFor(schemeId: string | null): SchemeBaseline | null {
  if (!schemeId) return null
  return SCHEME_BASELINES[schemeId] ?? null
}
