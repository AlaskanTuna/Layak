'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { AggregateStatsCards } from '@/components/history/aggregate-stats-cards'
import { EvaluationHistoryTable } from '@/components/history/evaluation-history-table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { EvaluationListItem, EvaluationListResponse } from '@/lib/agent-types'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/firebase'

/**
 * Phase 4 Tasks 1 + 2 wrapper — fetches `GET /api/evaluations?limit=50` once
 * (the backend's hard cap), then renders the aggregate stats cards above the
 * paginated history table. Both children are pure presentational components
 * driven by the shared `items` slice, so we only pay for one network round
 * trip per page mount.
 *
 * The 50-row ceiling matches the backend's `_MAX_LIST_PAGE`; cursor pagination
 * via `nextPageToken` is reserved for when a single user crosses that bar
 * (free tier caps at 5/24h, so it'd take 10 days of saturated usage to hit).
 */
const PAGE_LIMIT = 50

type Phase = 'loading' | 'ready' | 'error'

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

export function EvaluationHistorySection() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<EvaluationListItem[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authedFetch(
        `${getBackendUrl()}/api/evaluations?limit=${PAGE_LIMIT}`,
        { method: 'GET' }
      )
      if (!res.ok) {
        setErrorMessage(`Backend returned ${res.status} ${res.statusText}`)
        setPhase('error')
        return
      }
      const body = (await res.json()) as EvaluationListResponse
      setItems(body.items)
      setPhase('ready')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }, [])

  // setState lands inside `fetchHistory` AFTER the await; the strict
  // react-hooks/set-state-in-effect rule trips on the call graph but the
  // pattern is the standard async-fetch-on-mount — silenced inline.
  useEffect(() => {
    if (authLoading || !user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchHistory()
  }, [authLoading, user, fetchHistory])

  if (authLoading || phase === 'loading') {
    return (
      <div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading your evaluations…
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Could not load history</AlertTitle>
        <AlertDescription>
          {errorMessage ?? 'An unexpected error occurred.'}
          <div className="mt-3 flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPhase('loading')
                void fetchHistory()
              }}
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <AggregateStatsCards items={items} />
      <EvaluationHistoryTable items={items} />
    </div>
  )
}
