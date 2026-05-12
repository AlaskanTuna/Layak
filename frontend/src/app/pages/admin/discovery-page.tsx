'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AuthGuard } from '@/components/auth/auth-guard'
import { DiscoveryFilterChips } from '@/components/admin/discovery-filter-chips'
import { DiscoveryQueueTable } from '@/components/admin/discovery-queue-table'
import { DiscoveryTrigger } from '@/components/admin/discovery-trigger'
import { SchemeHealthCard } from '@/components/admin/scheme-health-card'
import { PageHeading } from '@/components/layout/page-heading'
import { fetchQueue, type CandidateRow, type QueueFilter } from '@/lib/admin-discovery'

function DiscoveryPageInner() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<QueueFilter>('pending')
  const [rows, setRows] = useState<CandidateRow[]>([])
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const fetchRows = useCallback(async (next: QueueFilter, signal: { cancelled: boolean }) => {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetchQueue(next)
      if (signal.cancelled) return
      setRows(res.items)
      setPhase('ready')
    } catch (err: unknown) {
      if (signal.cancelled) return
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchRows(filter, signal)
    return () => {
      signal.cancelled = true
    }
  }, [filter, refreshKey, fetchRows])

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t('admin.discovery.pageEyebrow')}
        title={t('admin.discovery.pageTitle')}
        description={t('admin.discovery.pageDescription')}
        action={<DiscoveryTrigger onCompleted={reload} />}
      />

      <SchemeHealthCard refreshKey={refreshKey} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            {t('admin.discovery.queue.title')}
          </h2>
          <DiscoveryFilterChips active={filter} onChange={setFilter} />
        </div>

        {phase === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('admin.discovery.queue.loading')}
          </div>
        )}
        {phase === 'error' && error && (
          <p className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {phase === 'ready' && <DiscoveryQueueTable rows={rows} />}
      </section>
    </div>
  )
}

export function DiscoveryPage() {
  return (
    <AuthGuard requireRole="admin">
      <DiscoveryPageInner />
    </AuthGuard>
  )
}
