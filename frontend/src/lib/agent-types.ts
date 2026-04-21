/**
 * TypeScript mirror of `backend/app/schema/*.py` Pydantic v2 models.
 *
 * Field names stay snake_case to match the JSON wire format from the backend.
 * Update both sides in lockstep whenever the schema changes.
 */

export type FormType = 'form_b' | 'form_be'

export type IncomeBand =
  | 'b40_hardcore'
  | 'b40_household'
  | 'b40_household_with_children'
  | 'm40'
  | 't20'

export type Relationship = 'child' | 'parent' | 'spouse' | 'sibling' | 'other'

export type Step = 'extract' | 'classify' | 'match' | 'compute_upside' | 'generate'

export type SchemeId = 'str_2026' | 'jkm_warga_emas' | 'lhdn_form_b'

export type Dependant = {
  relationship: Relationship
  age: number
  ic_last4: string | null
}

export type HouseholdFlags = {
  has_children_under_18: boolean
  has_elderly_dependant: boolean
  income_band: IncomeBand
}

export type Profile = {
  name: string
  ic_last4: string
  age: number
  monthly_income_rm: number
  household_size: number
  dependants: Dependant[]
  household_flags: HouseholdFlags
  form_type: FormType
  address?: string | null
  monthly_kwh?: number | null
}

export type EmploymentType = 'gig' | 'salaried'

export type DependantInput = {
  relationship: Relationship
  age: number
  ic_last4: string | null
}

/** Body of `POST /api/agent/intake_manual` — manual-entry alternative to the three-document upload (FR-21). */
export type ManualEntryPayload = {
  name: string
  /** ISO-8601 `YYYY-MM-DD`. */
  date_of_birth: string
  ic_last4: string
  monthly_income_rm: number
  employment_type: EmploymentType
  address: string | null
  /** Monthly electricity consumption in kWh from the utility bill. Optional. */
  monthly_kwh: number | null
  dependants: DependantInput[]
}

export type HouseholdClassification = {
  has_children_under_18: boolean
  has_elderly_dependant: boolean
  income_band: IncomeBand
  per_capita_monthly_rm: number
  notes: string[]
}

export type RuleCitation = {
  rule_id: string
  source_pdf: string
  page_ref: string
  passage: string
  source_url: string | null
}

export type SchemeMatch = {
  scheme_id: SchemeId
  scheme_name: string
  qualifies: boolean
  annual_rm: number
  summary: string
  why_qualify: string
  agency: string
  portal_url: string
  rule_citations: RuleCitation[]
}

export type PacketDraft = {
  scheme_id: string
  filename: string
  blob_bytes_b64: string | null
}

export type Packet = {
  drafts: PacketDraft[]
  generated_at: string
}

export type ExtractResult = { profile: Profile }
export type ClassifyResult = { classification: HouseholdClassification }
export type MatchResult = { matches: SchemeMatch[] }
export type ComputeUpsideResult = {
  python_snippet: string
  stdout: string
  total_annual_rm: number
  per_scheme_rm: Record<string, number>
}
export type GenerateResult = { packet: Packet }

export type StepStartedEvent = { type: 'step_started'; step: Step }
export type StepResultEvent =
  | { type: 'step_result'; step: 'extract'; data: ExtractResult }
  | { type: 'step_result'; step: 'classify'; data: ClassifyResult }
  | { type: 'step_result'; step: 'match'; data: MatchResult }
  | { type: 'step_result'; step: 'compute_upside'; data: ComputeUpsideResult }
  | { type: 'step_result'; step: 'generate'; data: GenerateResult }
export type DoneEvent = { type: 'done'; packet: Packet }
export type ErrorEvent = { type: 'error'; step: Step | null; message: string }

export type AgentEvent = StepStartedEvent | StepResultEvent | DoneEvent | ErrorEvent

export const PIPELINE_STEPS: Step[] = ['extract', 'classify', 'match', 'compute_upside', 'generate']

export const STEP_LABELS: Record<Step, string> = {
  extract: 'Extract profile',
  classify: 'Classify household',
  match: 'Match schemes',
  compute_upside: 'Compute upside',
  generate: 'Generate drafts'
}
