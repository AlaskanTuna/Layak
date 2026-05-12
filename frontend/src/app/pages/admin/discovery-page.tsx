'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AuthGuard } from '@/components/auth/auth-guard'
import { DiscoveryFilterChips } from '@/components/admin/discovery-filter-chips'
import { DiscoveryQueueTable } from '@/components/admin/discovery-queue-table'
import { DiscoveryRunPanel } from '@/components/admin/discovery-run-panel'
import { PageHeading } from '@/components/layout/page-heading'
import { Input } from '@/components/ui/input'
import { fetchQueue, type CandidateRow, type QueueFilter } from '@/lib/admin-discovery'

function DiscoveryPageInner() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<CandidateRow[]>([])
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [hasAutoFiltered, setHasAutoFiltered] = useState(false)

  const reload = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // Fetch all candidates up-front; filtering happens client-side so we can
  // surface per-filter counts in the chip row without an extra round-trip.
  const fetchRows = useCallback(async (signal: { cancelled: boolean }) => {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetchQueue('all')
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
    void fetchRows(signal)
    return () => {
      signal.cancelled = true
    }
  }, [refreshKey, fetchRows])

  const counts = useMemo(() => {
    const acc: Partial<Record<QueueFilter, number>> = { all: rows.length }
    for (const row of rows) acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, [rows])

  // First time we successfully load a queue with pending items, jump the
  // default filter to "pending" so the moderator's eyes land on actionable
  // rows. Don't fight the user if they explicitly switch later.
  useEffect(() => {
    if (hasAutoFiltered || phase !== 'ready') return
    if ((counts.pending ?? 0) > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilter('pending')
    }
    setHasAutoFiltered(true)
  }, [phase, counts, hasAutoFiltered])

  const visibleRows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false
      if (!needle) return true
      return (
        row.name.toLowerCase().includes(needle) ||
        row.agency.toLowerCase().includes(needle) ||
        row.source_id.toLowerCase().includes(needle) ||
        (row.scheme_id?.toLowerCase().includes(needle) ?? false)
      )
    })
  }, [rows, filter, search])

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t('admin.discovery.pageEyebrow')}
        title={t('admin.discovery.pageTitle')}
        description={t('admin.discovery.pageDescription')}
        illustration="/dashboard/discovery.webp"
        illustrationClassName="sm:-bottom-2 lg:-bottom-4"
      />

      <DiscoveryRunPanel onCompleted={reload} />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            {t('admin.discovery.queue.title')}
          </h2>
          <div className="relative w-full max-w-sm sm:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-foreground/45" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.discovery.searchPlaceholder')}
              aria-label={t('admin.discovery.searchPlaceholder')}
              className="rounded-full pl-9"
            />
          </div>
        </div>

        <DiscoveryFilterChips active={filter} onChange={setFilter} counts={counts} />

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
        {phase === 'ready' && (
          <DiscoveryQueueTable rows={visibleRows} totalCount={rows.length} onRefresh={reload} />
        )}
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
