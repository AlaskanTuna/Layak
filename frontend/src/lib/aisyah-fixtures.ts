/**
 * Fetches the bundled Aisyah PDFs from /public/fixtures/ and returns
 * them as File objects ready to feed into the real intake pipeline.
 * Mirrors the shape of an `<input type="file">` selection so the
 * UploadWidget treats sample-load and user-upload identically.
 *
 * Dependants are not extractable from MyKad / payslip / TNB documents,
 * so we ship them as an explicit override that the backend overlays on
 * the OCR-extracted Profile (same path the live Household fieldset uses).
 */

import type { DependantInput } from '@/lib/agent-types'
import type { UploadFiles } from '@/components/evaluation/upload-widget'

const FIXTURE_BASE = '/fixtures'

const FIXTURE_FILES = {
  ic: 'aisyah-mykad.pdf',
  payslip: 'aisyah-payslip.pdf',
  utility: 'aisyah-utility.pdf'
} as const

export const AISYAH_DEPENDANT_OVERRIDES: DependantInput[] = [
  { relationship: 'child', age: 10 },
  { relationship: 'child', age: 7 },
  { relationship: 'parent', age: 70 }
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

export async function loadAisyahFixtureFiles(): Promise<UploadFiles> {
  const [ic, payslip, utility] = await Promise.all([
    fetchAsFile(FIXTURE_FILES.ic),
    fetchAsFile(FIXTURE_FILES.payslip),
    fetchAsFile(FIXTURE_FILES.utility)
  ])
  return { ic, payslip, utility }
}
