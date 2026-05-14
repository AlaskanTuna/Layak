'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { authedFetch } from '@/lib/firebase'
import type { WhatIfRequest, WhatIfResponse } from '@/lib/agent-types'

const BACKEND = (): string => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'

const DEBOUNCE_MS = 500

export type WhatIfPhase = 'idle' | 'debouncing' | 'in-flight' | 'ready' | 'rate-limited' | 'error'
export type WhatIfStrategyPhase = 'idle' | 'refreshing' | 'ready' | 'error'

export type UseWhatIfResult = {
  phase: WhatIfPhase
  strategyPhase: WhatIfStrategyPhase
  /** Latest response from the backend, or null when no rerun has landed. */
  data: WhatIfResponse | null
  errorMessage: string | null
  /** Seconds until the rate-limit window clears. Set on phase === 'rate-limited'. */
  retryAfterSeconds: number | null
  /** Queue a what-if rerun. The hook debounces 500ms (spec §4.4) so dragging
   *  the slider doesn't fire one request per pixel. */
  runWhatIf: (overrides: WhatIfRequest['overrides']) => void
  /** Drop the latest result + cancel any in-flight request. Used by the
   *  "Reset all" button and on section collapse to revert the page to
   *  baseline. */
  clear: () => void
}

/** Hook for the What-If Scenario subsection (Phase 11 Feature 3).
 *
 * Stateless w.r.t. Firestore — every call rebuilds against the persisted
 * eval's baseline. The hook owns its own debounce timer and an
 * AbortController so a fast slider drag never races and never leaves a
 * stale response behind. */
export function useWhatIf(evalId: string): UseWhatIfResult {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<WhatIfPhase>('idle')
  const [strategyPhase, setStrategyPhase] = useState<WhatIfStrategyPhase>('idle')
  const [data, setData] = useState<WhatIfResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const requestGenerationRef = useRef(0)

  const performRequest = useCallback(
    async (overrides: WhatIfRequest['overrides'], generation: number) => {
      const controller = new AbortController()
      let strategyRefreshStarted = false
      abortRef.current = controller
      setPhase('in-flight')
      setErrorMessage(null)
      setRetryAfterSeconds(null)
      try {
        const res = await authedFetch(`${BACKEND()}/api/evaluations/${evalId}/what-if`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ overrides } as WhatIfRequest),
          signal: controller.signal
        })
        if (generation !== requestGenerationRef.current || controller.signal.aborted) return
        if (res.status === 429) {
          const retry = Number(res.headers.get('Retry-After')) || 60
          setData(null)
          setRetryAfterSeconds(retry)
          setPhase('rate-limited')
          return
        }
        if (!res.ok) {
          setData(null)
          setErrorMessage(t('evaluation.results.backendReturned', { status: res.status, statusText: res.statusText }))
          setPhase('error')
          return
        }
        const body = (await res.json()) as WhatIfResponse
        if (generation !== requestGenerationRef.current || controller.signal.aborted) return
        setData(body)
        setPhase('ready')
        setStrategyPhase('refreshing')
        strategyRefreshStarted = true
        void authedFetch(`${BACKEND()}/api/evaluations/${evalId}/what-if/strategy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ overrides } as WhatIfRequest),
          signal: controller.signal
        })
          .then(async (strategyRes) => {
            if (generation !== requestGenerationRef.current || controller.signal.aborted) return
            if (!strategyRes.ok) {
              setStrategyPhase('error')
              return
            }
            const strategyBody = (await strategyRes.json()) as { strategy?: WhatIfResponse['strategy'] }
            if (generation !== requestGenerationRef.current || controller.signal.aborted) return
            setData((current) => (current === null ? current : { ...current, strategy: strategyBody.strategy ?? [] }))
            setStrategyPhase('ready')
          })
          .catch((err) => {
            if ((err as Error).name === 'AbortError' || generation !== requestGenerationRef.current) return
            // Strategy enrichment is optional; the deterministic preview remains valid.
            setStrategyPhase('error')
          })
          .finally(() => {
            if (abortRef.current === controller) {
              abortRef.current = null
            }
          })
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        if (generation !== requestGenerationRef.current || controller.signal.aborted) return
        setData(null)
        setErrorMessage(err instanceof Error ? err.message : String(err))
        setPhase('error')
      } finally {
        if (!strategyRefreshStarted && abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    [evalId, t]
  )

  const runWhatIf = useCallback(
    (overrides: WhatIfRequest['overrides']) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
      abortRef.current = null
      const generation = ++requestGenerationRef.current
      setPhase('debouncing')
      setErrorMessage(null)
      setRetryAfterSeconds(null)
      setStrategyPhase('idle')
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        void performRequest(overrides, generation)
      }, DEBOUNCE_MS)
    },
    [performRequest]
  )

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    requestGenerationRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    setData(null)
    setPhase('idle')
    setStrategyPhase('idle')
    setErrorMessage(null)
    setRetryAfterSeconds(null)
  }, [])

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      requestGenerationRef.current += 1
      abortRef.current?.abort()
    },
    []
  )

  return { phase, strategyPhase, data, errorMessage, retryAfterSeconds, runWhatIf, clear }
}
