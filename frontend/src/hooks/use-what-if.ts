'use client'

import { useCallback, useRef, useState } from 'react'

import { authedFetch } from '@/lib/firebase'
import type { WhatIfRequest, WhatIfResponse } from '@/lib/agent-types'

const BACKEND = (): string => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'

const DEBOUNCE_MS = 500

export type WhatIfPhase = 'idle' | 'debouncing' | 'in-flight' | 'ready' | 'rate-limited' | 'error'

export type UseWhatIfResult = {
  phase: WhatIfPhase
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
  const [phase, setPhase] = useState<WhatIfPhase>('idle')
  const [data, setData] = useState<WhatIfResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const performRequest = useCallback(
    async (overrides: WhatIfRequest['overrides']) => {
      abortRef.current?.abort()
      const controller = new AbortController()
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
        if (res.status === 429) {
          const retry = Number(res.headers.get('Retry-After')) || 60
          setRetryAfterSeconds(retry)
          setPhase('rate-limited')
          return
        }
        if (!res.ok) {
          setErrorMessage(`Backend returned ${res.status}`)
          setPhase('error')
          return
        }
        const body = (await res.json()) as WhatIfResponse
        setData(body)
        setPhase('ready')
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setErrorMessage(err instanceof Error ? err.message : String(err))
        setPhase('error')
      }
    },
    [evalId]
  )

  const runWhatIf = useCallback(
    (overrides: WhatIfRequest['overrides']) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setPhase('debouncing')
      debounceRef.current = setTimeout(() => {
        void performRequest(overrides)
      }, DEBOUNCE_MS)
    },
    [performRequest]
  )

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    abortRef.current?.abort()
    abortRef.current = null
    setData(null)
    setPhase('idle')
    setErrorMessage(null)
    setRetryAfterSeconds(null)
  }, [])

  return { phase, data, errorMessage, retryAfterSeconds, runWhatIf, clear }
}
