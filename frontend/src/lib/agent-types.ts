/**
 * TypeScript mirror of `backend/app/schema/*.py` Pydantic v2 models.
 *
 * Field names stay snake_case to match the JSON wire format from the backend.
 * Update both sides in lockstep whenever the schema changes.
 */

export type FormType = 'form_b' | 'form_be'

export type IncomeBand = 'b40_hardcore' | 'b40_household' | 'b40_household_with_children' | 'm40' | 't20'

export type Relationship = 'child' | 'parent' | 'spouse' | 'sibling' | 'grandparent' | 'other'

export type Step = 'extract' | 'classify' | 'match' | 'optimize_strategy' | 'compute_upside' | 'generate'

export type SchemeId =
  | 'str_2026'
  | 'jkm_warga_emas'
  | 'jkm_bkk'
  | 'lhdn_form_b'
  | 'lhdn_form_be'
  | 'perkeso_sksps'
  | 'i_saraan'
  | 'budi95'
  | 'mykasih'

// `upside` stacks into the headline annual-relief total. `required_contribution`
// (e.g. PERKESO SKSPS) surfaces a separate block — user pays money, not receives.
// `subsidy_credit` (Phase 12 — BUDI95, MyKasih) is info-only; doesn't stack
// because Layak can't confirm remaining balance via any public API.
// Keep in lockstep with backend `app/schema/scheme.py`.
export type SchemeKind = 'upside' | 'required_contribution' | 'subsidy_credit'

export type Dependant = {
  relationship: Relationship
  age: number
  monthly_income_rm?: number | null
}

export type HouseholdFlags = {
  has_children_under_18: boolean
  has_elderly_dependant: boolean
  income_band: IncomeBand
}

export type Profile = {
  name: string
  age: number
  monthly_income_rm: number
  applicant_monthly_income_rm?: number | null
  household_monthly_income_rm?: number | null
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
  monthly_income_rm?: number | null
}

/** Body of `POST /api/agent/intake_manual` — manual-entry alternative to the three-document upload.
 *
 * Phase 12: the manual-entry path collects `age` directly. No IC field of any
 * kind on the wire; the persisted `Profile` carries no IC information either. */
export type ManualEntryPayload = {
  name: string
  /** Age in whole years (0–130). */
  age: number
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
  /** Annual benefit paid to the user. Always `0` for
   * `kind === 'required_contribution'` — the mandatory amount lives on
   * `annual_contribution_rm` instead so upside math stays correct. */
  annual_rm: number
  summary: string
  why_qualify: string
  agency: string
  portal_url: string
  rule_citations: RuleCitation[]
  /** Defaults to `'upside'` on backend matches that pre-date the
   * required_contribution split. Optional on the type so older persisted
   * Firestore docs still deserialise in TypeScript. */
  kind?: SchemeKind
  /** Annual mandatory contribution the user PAYS under this scheme. Only set
   * when `kind === 'required_contribution'`. */
  annual_contribution_rm?: number | null
  /** ISO-8601 date string (e.g. `"2026-12-31"`) when the scheme's benefit
   * expires / is forfeited. Set on time-bound `subsidy_credit` schemes
   * (MyKasih RM100 → `"2026-12-31"`); `null` for rolling / open-ended
   * schemes (BUDI95 monthly quota; all `upside` and `required_contribution`
   * rules). Frontend renders it in bold on the card. */
  expires_at_iso?: string | null
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

// Phase 11 Feature 2 — Cross-Scheme Strategy Optimizer types.

export type StrategySeverity = 'info' | 'warn' | 'act'

export type StrategyCitation = {
  pdf: string
  section?: string | null
  page?: number | null
}

export type StrategyAdvice = {
  advice_id: string
  interaction_id: string
  severity: StrategySeverity
  /** ≤ 80 chars; pre-localised at v1 in editorial English. */
  headline: string
  /** ≤ 280 chars. */
  rationale: string
  citation: StrategyCitation
  /** 0–1. Frontend gates: ≥0.8 full card; 0.5–0.8 soft suggestion + CTA. */
  confidence: number
  /** Populates the chat input on the "Ask Cik Lay about this" handoff.
   *  `null` means no CTA is shown for this card. */
  suggested_chat_prompt: string | null
  applies_to_scheme_ids: string[]
}

export type OptimizeStrategyResult = { advisories: StrategyAdvice[] }

// Phase 11 Feature 3 — What-If Scenario types.

export type DeltaStatus = 'gained' | 'lost' | 'tier_changed' | 'amount_changed' | 'unchanged'

export type SchemeDelta = {
  scheme_id: SchemeId
  status: DeltaStatus
  baseline_annual_rm: number | null
  new_annual_rm: number | null
  delta_rm: number
  note: string | null
}

export type WhatIfSuggestion = {
  field: 'monthly_income_rm' | 'dependants_count' | 'elderly_dependants_count'
  suggested_value: number
  label: string
  scheme_id: SchemeId | null
}

/** POST body for `/api/evaluations/{evalId}/what-if`. */
export type WhatIfRequest = {
  overrides: {
    monthly_income_rm?: number
    dependants_count?: number
    elderly_dependants_count?: number
  }
}

export type WhatIfResponse = {
  total_annual_rm: number
  matches: SchemeMatch[]
  strategy: StrategyAdvice[]
  deltas: SchemeDelta[]
  classification: HouseholdClassification
  suggestions: WhatIfSuggestion[]
}

export type StepStartedEvent = { type: 'step_started'; step: Step }
export type StepResultEvent =
  | { type: 'step_result'; step: 'extract'; data: ExtractResult }
  | { type: 'step_result'; step: 'classify'; data: ClassifyResult }
  | { type: 'step_result'; step: 'match'; data: MatchResult }
  | { type: 'step_result'; step: 'optimize_strategy'; data: OptimizeStrategyResult }
  | { type: 'step_result'; step: 'compute_upside'; data: ComputeUpsideResult }
  | { type: 'step_result'; step: 'generate'; data: GenerateResult }

// Phase 11 Feature 4 — two-tier reasoning surface. The backend emits one
// of each per pipeline step, right after the matching step_result.
// Existing SSE consumers can ignore both safely (default branch in the
// reducer is a no-op pass-through).
export type PipelineNarrativeEvent = {
  type: 'narrative'
  step: Step
  /** ≤ 80 chars; pre-localised by the backend in the user's language. */
  headline: string
  /** ≤ 40 chars; the single most useful number/label from this step. */
  data_point: string | null
}
export type PipelineTechnicalEvent = {
  type: 'technical'
  step: Step
  /** ISO-8601 UTC. */
  timestamp: string
  /** 1–20 monospaced lines. Always English (developer audience). */
  log_lines: string[]
}

export type DoneEvent = { type: 'done'; packet: Packet; eval_id?: string | null }

// SSE ErrorEvent.category mirrors backend
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

export type AgentEvent =
  | StepStartedEvent
  | StepResultEvent
  | PipelineNarrativeEvent
  | PipelineTechnicalEvent
  | DoneEvent
  | ErrorEvent

export const PIPELINE_STEPS: Step[] = [
  'extract',
  'classify',
  'match',
  'optimize_strategy',
  'compute_upside',
  'generate'
]

export const STEP_LABELS: Record<Step, string> = {
  extract: 'Extract profile',
  classify: 'Classify household',
  match: 'Match schemes',
  optimize_strategy: 'Optimize strategy',
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
  /** Phase 11 Feature 4 — accumulated lay/dev tier event payloads.
   * Optional so legacy evaluations created before the schema bump still
   * deserialise; the frontend treats `undefined` as empty arrays. */
  narrativeLog?: PipelineNarrativeEvent[]
  technicalLog?: PipelineTechnicalEvent[]
  /** Phase 11 Feature 2 — Cross-Scheme Strategy advisories. Optional for
   * backward compat with pre-Feature-2 evaluations. */
  strategy?: StrategyAdvice[]
}

export type EvaluationListItem = {
  id: string
  status: EvaluationStatus
  totalAnnualRM: number
  createdAt: string | null
  completedAt: string | null
  draftCount: number
}

export type EvaluationListResponse = {
  items: EvaluationListItem[]
  nextPageToken: string | null
}

/** Mirror of `GET /api/quota` — drives the frontend QuotaMeter. */
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
