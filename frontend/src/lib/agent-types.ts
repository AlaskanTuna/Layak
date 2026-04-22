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

export type SchemeId = 'str_2026' | 'jkm_warga_emas' | 'lhdn_form_b' | 'lhdn_form_be'

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
  monthly_cost_rm?: number | null
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
  /** Monthly electricity cost in RM from the utility bill. Optional. */
  monthly_cost_rm: number | null
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
export type DoneEvent = { type: 'done'; packet: Packet; eval_id?: string | null }

// Phase 7 Task 6 — SSE ErrorEvent.category mirrors backend
// `app/schema/events.py:ErrorCategory`. Keep the two sides in lockstep:
// adding a category here must land a matching entry in the Python Literal
// AND category-tailored copy in `frontend/src/lib/i18n/locales/*.json`.
export type ErrorCategory =
  | 'quota_exhausted'
  | 'service_unavailable'
  | 'deadline_exceeded'
  | 'permission_denied'
  | 'extract_validation'

export type ErrorEvent = {
  type: 'error'
  step: Step | null
  message: string
  category?: ErrorCategory | null
  eval_id?: string | null
}

export type AgentEvent = StepStartedEvent | StepResultEvent | DoneEvent | ErrorEvent

export const PIPELINE_STEPS: Step[] = ['extract', 'classify', 'match', 'compute_upside', 'generate']

export const STEP_LABELS: Record<Step, string> = {
  extract: 'Extract profile',
  classify: 'Classify household',
  match: 'Match schemes',
  compute_upside: 'Compute upside',
  generate: 'Generate drafts'
}

/* ------------------------------------------------------------------ */
/* Firestore mirrors — see backend/app/schema/firestore.py             */
/* ------------------------------------------------------------------ */

export type EvaluationStatus = 'running' | 'complete' | 'error'

export type Tier = 'free' | 'pro'

export type EvaluationStepState = 'pending' | 'running' | 'complete' | 'error'

export type EvaluationStepStates = Record<Step, EvaluationStepState>

export type EvaluationErrorDoc = {
  step: Step | null
  message: string
  category?: ErrorCategory | null
}

/** Persisted trace of the `compute_upside` step's Gemini Code Execution call. */
export type ComputeUpsideTrace = {
  pythonSnippet: string
  stdout: string
  perSchemeRM: Record<string, number>
}

/** Mirror of `evaluations/{evalId}` returned by `GET /api/evaluations/{id}`. */
export type EvaluationDoc = {
  userId: string
  status: EvaluationStatus
  createdAt: string | null
  completedAt: string | null
  profile: Profile | null
  classification: HouseholdClassification | null
  matches: SchemeMatch[]
  totalAnnualRM: number
  upsideTrace: ComputeUpsideTrace | null
  stepStates: EvaluationStepStates
  error: EvaluationErrorDoc | null
}

export type EvaluationListItem = {
  id: string
  status: EvaluationStatus
  totalAnnualRM: number
  createdAt: string | null
  completedAt: string | null
}

export type EvaluationListResponse = {
  items: EvaluationListItem[]
  nextPageToken: string | null
}

/** Mirror of `GET /api/quota` — Phase 3 Task 4 frontend QuotaMeter. */
export type QuotaResponse = {
  tier: Tier
  /** Free tier: 5. Pro tier: -1 (unlimited sentinel). */
  limit: number
  used: number
  /** Free tier: max(0, limit-used). Pro tier: -1. */
  remaining: number
  windowHours: number
  /** ISO-8601 UTC. For Pro this is `now` (carries no meaning). */
  resetAt: string
}

/** Mirror of the 429 body emitted by `enforce_quota`. */
export type RateLimitErrorBody = {
  error: 'rate_limit'
  tier: Tier
  limit: number
  windowHours: number
  resetAt: string
  message: string
}
