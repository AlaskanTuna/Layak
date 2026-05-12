'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { UploadFiles } from '@/components/evaluation/upload-widget'
import { AISYAH_MOCK_EVENTS } from '@/fixtures/aisyah-response'
import { authedFetch } from '@/lib/firebase'
import type {
  AgentEvent,
  ComputeUpsideResult,
  DependantInput,
  ErrorCategory,
  HouseholdClassification,
  ManualEntryPayload,
  Packet,
  PipelineNarrativeEvent,
  PipelineTechnicalEvent,
  Profile,
  RateLimitErrorBody,
  SchemeMatch,
  Step,
  StrategyAdvice
} from '@/lib/agent-types'
import { PIPELINE_STEPS } from '@/lib/agent-types'
import { notificationStore } from '@/lib/notification-store'

export type StepStatus = 'pending' | 'active' | 'complete' | 'error'

export type PipelinePhase = 'idle' | 'streaming' | 'done' | 'error'

export type PipelineState = {
  phase: PipelinePhase
  stepStates: Record<Step, StepStatus>
  profile: Profile | null
  classification: HouseholdClassification | null
  matches: SchemeMatch[]
  upside: ComputeUpsideResult | null
  packet: Packet | null
  /** Set when the backend SSE `done` event lands with a Firestore doc id.
   * Mock mode (no backend round-trip) leaves this `null`. */
  evalId: string | null
  /** Populated when the backend returns 429 — drives the waitlist modal. */
  quotaExceeded: RateLimitErrorBody | null
  error: string | null
  /** Category slug from the SSE `ErrorEvent`. `null` when the pipeline has
   * not errored OR the error didn't match a known category. Drives the
   * category-tailored CTAs in `<ErrorRecoveryCard>`. */
  errorCategory: ErrorCategory | null
  /** Phase 11 Feature 4 — accumulated lay/dev tier events in stream order. */
  narrativeEvents: PipelineNarrativeEvent[]
  technicalEvents: PipelineTechnicalEvent[]
  /** Phase 11 Feature 2 — Cross-Scheme Strategy advisories from the
   *  optimize_strategy step. Empty when the optimizer hasn't run yet, or
   *  when no interaction rules tripped. */
  strategy: StrategyAdvice[]
}

export type StartOptions =
  | { mode: 'mock' }
  | { mode: 'real'; files: UploadFiles; dependants?: DependantInput[] }
  | { mode: 'manual'; payload: ManualEntryPayload }

const INITIAL_STEP_STATES: Record<Step, StepStatus> = {
  extract: 'pending',
  classify: 'pending',
  match: 'pending',
  optimize_strategy: 'pending',
  compute_upside: 'pending',
  generate: 'pending'
}

const INITIAL_STATE: PipelineState = {
  phase: 'idle',
  stepStates: { ...INITIAL_STEP_STATES },
  profile: null,
  classification: null,
  matches: [],
  upside: null,
  packet: null,
  evalId: null,
  quotaExceeded: null,
  error: null,
  errorCategory: null,
  narrativeEvents: [],
  technicalEvents: [],
  strategy: []
}

function shouldForceMock(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_USE_MOCK_SSE === '1'
}

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

/**
 * Reducer for a single SSE event. Returns next state given prior state.
 * Split out so the same logic drives mock replay and the real stream.
 */
export function applyEvent(prev: PipelineState, event: AgentEvent): PipelineState {
  switch (event.type) {
    case 'step_started':
      return {
        ...prev,
        phase: 'streaming',
        stepStates: { ...prev.stepStates, [event.step]: 'active' }
      }
    case 'step_result': {
      const next: PipelineState = {
        ...prev,
        stepStates: { ...prev.stepStates, [event.step]: 'complete' }
      }
      if (event.step === 'extract') next.profile = event.data.profile
      if (event.step === 'classify') next.classification = event.data.classification
      if (event.step === 'match') next.matches = event.data.matches
      if (event.step === 'optimize_strategy') next.strategy = event.data.advisories
      if (event.step === 'compute_upside') next.upside = event.data
      if (event.step === 'generate') next.packet = event.data.packet
      return next
    }
    case 'narrative':
      return { ...prev, narrativeEvents: [...prev.narrativeEvents, event] }
    case 'technical':
      return { ...prev, technicalEvents: [...prev.technicalEvents, event] }
    case 'done':
      return {
        ...prev,
        phase: 'done',
        packet: event.packet,
        evalId: event.eval_id ?? prev.evalId
      }
    case 'error': {
      const stepStates = { ...prev.stepStates }
      if (event.step) stepStates[event.step] = 'error'
      return {
        ...prev,
        phase: 'error',
        error: event.message,
        errorCategory: event.category ?? null,
        stepStates,
        evalId: event.eval_id ?? prev.evalId
      }
    }
  }
}

async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<AgentEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let index: number
      while ((index = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, index)
        buffer = buffer.slice(index + 2)
        const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'))
        if (!dataLine) continue
        const payload = dataLine.slice(5).trim()
        if (!payload) continue
        yield JSON.parse(payload) as AgentEvent
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function useAgentPipeline(): {
  state: PipelineState
  start: (opts: StartOptions) => void
  reset: () => void
  acknowledgeQuotaExceeded: () => void
} {
  const { t } = useTranslation()
  const [state, setState] = useState<PipelineState>(INITIAL_STATE)
  const abortRef = useRef<AbortController | null>(null)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const prevPhaseRef = useRef<PipelinePhase>(INITIAL_STATE.phase)

  const cleanup = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setState(INITIAL_STATE)
  }, [cleanup])

  const acknowledgeQuotaExceeded = useCallback(() => {
    setState((prev) => (prev.quotaExceeded ? { ...prev, quotaExceeded: null } : prev))
  }, [])

  const startMock = useCallback(() => {
    cleanup()
    setState({ ...INITIAL_STATE, phase: 'streaming' })
    let cumulativeMs = 0
    AISYAH_MOCK_EVENTS.forEach(({ event, delayMs }) => {
      cumulativeMs += delayMs
      const handle = setTimeout(() => {
        setState((prev) => applyEvent(prev, event))
      }, cumulativeMs)
      timeoutsRef.current.push(handle)
    })
  }, [cleanup])

  const streamFromResponse = useCallback((controller: AbortController, request: () => Promise<Response>) => {
    ;(async () => {
      try {
        const res = await request()
        // Surface 429 as a structured quota state without ever entering
        // `streaming`. The upload client opens the waitlist modal off
        // `state.quotaExceeded`.
        if (res.status === 429) {
          const body = (await res.json().catch(() => null)) as RateLimitErrorBody | null
          const fallback: RateLimitErrorBody = {
            error: 'rate_limit',
            tier: 'free',
            limit: 5,
            windowHours: 24,
            resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            message: 'Free-tier evaluation quota reached.'
          }
          setState(() => ({ ...INITIAL_STATE, quotaExceeded: body ?? fallback }))
          const usedBody = body ?? fallback
          const resetHours = Math.max(1, Math.round((new Date(usedBody.resetAt).getTime() - Date.now()) / 3_600_000))
          notificationStore.notify({
            title: t('common.notifications.events.quotaExceeded.title'),
            description: t('common.notifications.events.quotaExceeded.body', { hours: resetHours }),
            severity: 'error',
            toast: true,
            groupKey: 'quota-exceeded'
          })
          return
        }
        if (!res.ok || !res.body) {
          throw new Error(`Backend returned ${res.status} ${res.statusText}`)
        }
        for await (const event of parseSseStream(res.body)) {
          setState((prev) => applyEvent(prev, event))
        }
      } catch (err) {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : String(err)
        setState((prev) => ({
          ...prev,
          phase: 'error',
          error: message,
          // Network-layer failure — no backend category reached us, so the
          // recovery card falls back to its generic "start over" branch.
          errorCategory: null,
          stepStates: markFirstActiveStepErrored(prev.stepStates)
        }))
      }
    })()
  }, [t])

  const startReal = useCallback(
    (files: UploadFiles, dependants: DependantInput[] | undefined) => {
      cleanup()
      setState({ ...INITIAL_STATE, phase: 'streaming' })

      const controller = new AbortController()
      abortRef.current = controller

      const form = new FormData()
      form.append('ic', files.ic)
      form.append('payslip', files.payslip)
      form.append('utility', files.utility)
      // The backend treats a non-empty `dependants` form field as an override —
      // the OCR path otherwise returns an empty household because MyKad /
      // payslip / utility bills don't disclose dependants.
      if (dependants && dependants.length > 0) {
        form.append('dependants', JSON.stringify(dependants))
      }

      streamFromResponse(controller, () =>
        authedFetch(`${getBackendUrl()}/api/agent/intake`, {
          method: 'POST',
          body: form,
          signal: controller.signal
        })
      )
    },
    [cleanup, streamFromResponse]
  )

  const startManual = useCallback(
    (payload: ManualEntryPayload) => {
      cleanup()
      setState({ ...INITIAL_STATE, phase: 'streaming' })

      const controller = new AbortController()
      abortRef.current = controller

      streamFromResponse(controller, () =>
        authedFetch(`${getBackendUrl()}/api/agent/intake_manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        })
      )
    },
    [cleanup, streamFromResponse]
  )

  const start = useCallback(
    (opts: StartOptions) => {
      if (opts.mode === 'mock' || shouldForceMock()) {
        startMock()
      } else if (opts.mode === 'manual') {
        startManual(opts.payload)
      } else {
        startReal(opts.files, opts.dependants)
      }
    },
    [startMock, startReal, startManual]
  )

  useEffect(() => cleanup, [cleanup])

  // Emit notifications on phase transitions to 'done' or 'error'.
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = state.phase

    if (state.phase === 'done' && prev !== 'done') {
      const qualifyingCount = state.matches.filter((m) => m.qualifies).length
      if (qualifyingCount > 0) {
        notificationStore.notify({
          title: t('common.notifications.events.evalComplete.title'),
          description: t('common.notifications.events.evalComplete.body', { count: qualifyingCount }),
          severity: 'success',
          toast: true,
          groupKey: state.evalId ? `eval-${state.evalId}` : 'eval-current'
        })
      } else {
        notificationStore.notify({
          title: t('common.notifications.events.evalCompleteEmpty.title'),
          description: t('common.notifications.events.evalCompleteEmpty.body'),
          severity: 'info',
          toast: true,
          groupKey: state.evalId ? `eval-${state.evalId}` : 'eval-current'
        })
      }
    }

    if (state.phase === 'error' && prev !== 'error') {
      notificationStore.notify({
        title: t('common.notifications.events.evalFailed.title'),
        description: t('common.notifications.events.evalFailed.body', {
          category: state.errorCategory ?? 'Unknown error'
        }),
        severity: 'error',
        toast: true,
        groupKey: state.evalId ? `eval-${state.evalId}` : 'eval-current'
      })
    }
  }, [state.phase, state.matches, state.evalId, state.errorCategory, t])

  return { state, start, reset, acknowledgeQuotaExceeded }
}

function markFirstActiveStepErrored(states: Record<Step, StepStatus>): Record<Step, StepStatus> {
  const next = { ...states }
  const active = PIPELINE_STEPS.find((step) => next[step] === 'active')
  if (active) next[active] = 'error'
  return next
}
