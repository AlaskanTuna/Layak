'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { fetchSchemeHealth, type SchemeHealthRow } from '@/lib/admin-discovery'

type Recency = 'healthy' | 'aging' | 'stale' | 'never'

function formatRelative(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0 || Number.isNaN(ms)) return ''
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  const months = Math.floor(days / 30)
  return `${months} mo ago`
}

function recencyFor(iso: string | null): Recency {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return 'aging'
  const days = ms / 86_400_000
  if (days <= 7) return 'healthy'
  if (days <= 30) return 'aging'
  return 'stale'
}

const DOT_COLOR: Record<Recency, string> = {
  healthy: 'bg-emerald-500',
  aging: 'bg-[color:var(--warning)]',
  stale: 'bg-destructive',
  never: 'bg-foreground/30'
}

export function SchemeHealthCard({ refreshKey }: { refreshKey: number }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<SchemeHealthRow[]>([])
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(async (signal: { cancelled: boolean }) => {
    setPhase('loading')
    try {
      const res = await fetchSchemeHealth()
      if (signal.cancelled) return
      setRows(res.items)
      setPhase('ready')
    } catch {
      if (signal.cancelled) return
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(signal)
    return () => {
      signal.cancelled = true
    }
  }, [refreshKey, load])

  const { healthyCount, staleCount } = useMemo(() => {
    let healthy = 0
    let stale = 0
    for (const row of rows) {
      const r = recencyFor(row.verified_at)
      if (r === 'healthy') healthy += 1
      if (r === 'stale' || r === 'never') stale += 1
    }
    return { healthyCount: healthy, staleCount: stale }
  }, [rows])

  return (
    <section className="paper-card flex flex-col gap-4 rounded-[16px] p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-[color:var(--primary)]" aria-hidden />
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              {t('admin.discovery.health.title')}
            </h2>
            <p className="mono-caption text-foreground/55">{t('admin.discovery.health.subtitle')}</p>
          </div>
        </div>
        {phase === 'ready' && rows.length > 0 && (
          <p className="mono-caption text-foreground/55" aria-live="polite">
            {t('admin.discovery.health.countSummary', { healthy: healthyCount, stale: staleCount })}
          </p>
        )}
      </header>
      {phase === 'ready' && rows.length === 0 && (
        <p className="text-sm text-foreground/60">{t('admin.discovery.health.empty')}</p>
      )}
      {phase === 'ready' && rows.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((row) => {
            const recency = recencyFor(row.verified_at)
            return (
              <li
                key={row.scheme_id}
                className="flex items-center justify-between gap-2 rounded-[10px] border border-foreground/10 bg-card/40 px-3 py-2.5"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13.5px] font-medium text-foreground/85">
                    {row.scheme_id}
                  </span>
                  <span className="mono-caption text-foreground/55">
                    {row.verified_at
                      ? `${t('admin.discovery.health.verifiedPrefix')}${formatRelative(row.verified_at)}`
                      : t('admin.discovery.health.neverVerified')}
                  </span>
                </div>
                <span
                  className={cn('size-2 shrink-0 rounded-full', DOT_COLOR[recency])}
                  role="img"
                  aria-label={t(`admin.discovery.health.dotAria.${recency}`)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
