/**
 * Salaried-persona mirror of aisyah-fixtures.ts.
 *
 * Fetches the bundled Cikgu Farhan PDFs from /public/fixtures/ and returns
 * them as File objects ready to feed into the real intake pipeline. Same
 * shape as the Aisyah loader so UploadWidget can dispatch on a persona id
 * without branching on the loader signature.
 *
 * Farhan is the Form BE (salaried teacher) demo persona — age 38, spouse +
 * two school-age children. Dependants are not extractable from the MyKad /
 * payslip / TNB documents, so they ship as an explicit override the backend
 * overlays on the OCR-extracted Profile.
 */

import type { DependantInput } from '@/lib/agent-types'
import type { UploadFiles } from '@/components/evaluation/upload-widget'

const FIXTURE_BASE = '/fixtures'

const FIXTURE_FILES = {
  ic: 'farhan-mykad.pdf',
  payslip: 'farhan-payslip.pdf',
  utility: 'farhan-utility.pdf'
} as const

// Derived from the synthetic payslip ("Pasangan + 2 anak"): spouse + two
// school-age children. Ages kept in the 7-11 range so LHDN Form BE child
// relief (#16a, under-18) fires twice.
export const FARHAN_DEPENDANT_OVERRIDES: DependantInput[] = [
  { relationship: 'spouse', age: 36 },
  { relationship: 'child', age: 10 },
  { relationship: 'child', age: 7 }
]

async function fetchAsFile(filename: string): Promise<File> {
  const url = `${FIXTURE_BASE}/${filename}`
  const res = await fetch(url, { cache: 'force-cache' })
  if (!res.ok) {
    throw new Error(`Could not load fixture ${filename}: ${res.status} ${res.statusText}`)
  }
  const blob = await res.blob()
  return new File([blob], filename, { type: 'application/pdf' })
}

export async function loadFarhanFixtureFiles(): Promise<UploadFiles> {
  const [ic, payslip, utility] = await Promise.all([
    fetchAsFile(FIXTURE_FILES.ic),
    fetchAsFile(FIXTURE_FILES.payslip),
    fetchAsFile(FIXTURE_FILES.utility)
  ])
  return { ic, payslip, utility }
}
