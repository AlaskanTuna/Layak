'use client'

import { useCallback, useEffect, useState } from 'react'

import { DashboardContinueRail, type ContinueRailPhase } from '@/components/dashboard/dashboard-continue-rail'
import { DashboardLauncherGrid } from '@/components/dashboard/dashboard-launcher-grid'
import type { EvaluationListItem, EvaluationListResponse } from '@/lib/agent-types'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/firebase'

const FETCH_LIMIT = 10

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

/**
 * Launcher pattern (mirrors SolarSim): big nav tiles on the left, single
 * resume rail on the right. The grid renders immediately; only the rail
 * waits on `GET /api/evaluations` to surface the latest item.
 */
export function DashboardDataSection() {
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<EvaluationListItem[]>([])
  const [phase, setPhase] = useState<ContinueRailPhase>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authedFetch(`${getBackendUrl()}/api/evaluations?limit=${FETCH_LIMIT}`, { method: 'GET' })
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

  useEffect(() => {
    if (authLoading || !user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchHistory()
  }, [authLoading, user, fetchHistory])

  const handleRetry = useCallback(() => {
    setPhase('loading')
    void fetchHistory()
  }, [fetchHistory])

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_22rem] lg:gap-6">
      <DashboardLauncherGrid />
      <DashboardContinueRail
        items={items}
        phase={authLoading ? 'loading' : phase}
        errorMessage={errorMessage}
        onRetry={handleRetry}
      />
    </div>
  )
}
