'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ActiveApplications } from '@/components/dashboard/active-applications'
import { DashboardKpiStrip } from '@/components/dashboard/dashboard-kpi-strip'
import { DashboardSchemesSpotlight } from '@/components/dashboard/dashboard-schemes-spotlight'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { EvaluationListItem, EvaluationListResponse } from '@/lib/agent-types'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/firebase'

const FETCH_LIMIT = 10

type Phase = 'loading' | 'ready' | 'error'

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

/**
 * Single fetch of `GET /api/evaluations?limit=10` shared by both dashboard
 * cards. Active = top 3 most recent *completed* evaluations rendered as
 * draft-packet cards. Recent = last 5 evaluations of any status as a
 * compact timeline. Both children are pure props-driven so the dashboard
 * pays for one network round trip per page mount.
 */
export function DashboardDataSection() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<EvaluationListItem[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
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

  // setState lands inside `fetchHistory` AFTER the await — same pattern
  // QuotaMeter / EvaluationHistorySection use; the strict
  // react-hooks/set-state-in-effect rule trips on the call graph regardless.
  useEffect(() => {
    if (authLoading || !user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchHistory()
  }, [authLoading, user, fetchHistory])

  if (authLoading || phase === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t('dashboard.loading')}
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t('dashboard.errorTitle')}</AlertTitle>
        <AlertDescription>
          {errorMessage ?? t('dashboard.errorUnexpected')}
          <div className="mt-3 flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPhase('loading')
                void fetchHistory()
              }}
            >
              {t('common.button.retry')}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardKpiStrip items={items} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <ActiveApplications items={items} />
        <RecentActivity items={items} />
      </div>
      <DashboardSchemesSpotlight />
    </div>
  )
}
