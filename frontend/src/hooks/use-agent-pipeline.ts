'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { UploadFiles } from '@/components/evaluation/upload-widget'
import { AISYAH_MOCK_EVENTS } from '@/fixtures/aisyah-response'
import type {
  AgentEvent,
  ComputeUpsideResult,
  HouseholdClassification,
  Packet,
  Profile,
  SchemeMatch,
  Step
} from '@/lib/agent-types'
import { PIPELINE_STEPS } from '@/lib/agent-types'

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
  error: string | null
}

export type StartOptions =
  | { mode: 'mock' }
  | { mode: 'real'; files: UploadFiles }

const INITIAL_STEP_STATES: Record<Step, StepStatus> = {
  extract: 'pending',
  classify: 'pending',
  match: 'pending',
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
  error: null
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
      if (event.step === 'compute_upside') next.upside = event.data
      if (event.step === 'generate') next.packet = event.data.packet
      return next
    }
    case 'done':
      return { ...prev, phase: 'done', packet: event.packet }
    case 'error': {
      const stepStates = { ...prev.stepStates }
      if (event.step) stepStates[event.step] = 'error'
      return { ...prev, phase: 'error', error: event.message, stepStates }
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
        const dataLine = chunk.split('\n').find(line => line.startsWith('data:'))
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
} {
  const [state, setState] = useState<PipelineState>(INITIAL_STATE)
  const abortRef = useRef<AbortController | null>(null)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

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

  const startMock = useCallback(() => {
    cleanup()
    setState({ ...INITIAL_STATE, phase: 'streaming' })
    let cumulativeMs = 0
    AISYAH_MOCK_EVENTS.forEach(({ event, delayMs }) => {
      cumulativeMs += delayMs
      const handle = setTimeout(() => {
        setState(prev => applyEvent(prev, event))
      }, cumulativeMs)
      timeoutsRef.current.push(handle)
    })
  }, [cleanup])

  const startReal = useCallback(
    (files: UploadFiles) => {
      cleanup()
      setState({ ...INITIAL_STATE, phase: 'streaming' })

      const controller = new AbortController()
      abortRef.current = controller

      const form = new FormData()
      form.append('ic', files.ic)
      form.append('payslip', files.payslip)
      form.append('utility', files.utility)

      ;(async () => {
        try {
          const res = await fetch(`${getBackendUrl()}/api/agent/intake`, {
            method: 'POST',
            body: form,
            signal: controller.signal
          })
          if (!res.ok || !res.body) {
            throw new Error(`Backend returned ${res.status} ${res.statusText}`)
          }
          for await (const event of parseSseStream(res.body)) {
            setState(prev => applyEvent(prev, event))
          }
        } catch (err) {
          if (controller.signal.aborted) return
          const message = err instanceof Error ? err.message : String(err)
          setState(prev => ({
            ...prev,
            phase: 'error',
            error: message,
            stepStates: markFirstActiveStepErrored(prev.stepStates)
          }))
        }
      })()
    },
    [cleanup]
  )

  const start = useCallback(
    (opts: StartOptions) => {
      if (opts.mode === 'mock' || shouldForceMock()) {
        startMock()
      } else {
        startReal(opts.files)
      }
    },
    [startMock, startReal]
  )

  useEffect(() => cleanup, [cleanup])

  return { state, start, reset }
}

function markFirstActiveStepErrored(states: Record<Step, StepStatus>): Record<Step, StepStatus> {
  const next = { ...states }
  const active = PIPELINE_STEPS.find(step => next[step] === 'active')
  if (active) next[active] = 'error'
  return next
}
