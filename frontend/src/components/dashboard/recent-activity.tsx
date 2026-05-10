'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EvaluationListItem, EvaluationStatus } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

const TIMELINE_LIMIT = 5

const RM = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

const STATUS_DOT: Record<EvaluationStatus, string> = {
  complete: 'bg-[color:var(--forest)]',
  running: 'bg-amber-500 animate-pulse',
  error: 'bg-[color:var(--hibiscus)]'
}

type Props = {
  items: EvaluationListItem[]
}

function relativeTime(value: string | null, t: (k: string, opts?: Record<string, unknown>) => string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return t('dashboard.recentActivity.justNow')
  if (diffMin < 60) return t('dashboard.recentActivity.minutesAgo', { count: diffMin })
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return t('dashboard.recentActivity.hoursAgo', { count: diffHr })
  const diffDay = Math.floor(diffHr / 24)
  return t('dashboard.recentActivity.daysAgo', { count: diffDay })
}

/**
 * Compact timeline of the last N evaluations across every status. Status
 * dot + label + relative time + RM (when complete) + chevron link to the
 * persisted results page. Empty state when no evaluations exist; "View all"
 * footer link only renders when there's something to navigate to.
 */
export function RecentActivity({ items }: Props) {
  const { t } = useTranslation()
  const slice = useMemo(() => items.slice(0, TIMELINE_LIMIT), [items])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('dashboard.recentActivity.title')}</h2>
        <span className="mono-caption text-foreground/45">Ledger</span>
      </div>

      {slice.length === 0 ? (
        <div className="paper-card flex flex-col items-center gap-3 rounded-[16px] px-6 py-10 text-center">
          <div className="flex size-9 items-center justify-center rounded-md bg-foreground/[0.05] text-foreground/55">
            <Clock className="size-4" aria-hidden />
          </div>
          <p className="mono-caption text-foreground/55">{t('dashboard.recentActivity.empty')}</p>
          <p className="max-w-xs text-xs leading-relaxed text-foreground/65">
            {t('dashboard.recentActivity.emptyDescription')}
          </p>
        </div>
      ) : (
        <>
          <div className="paper-card overflow-hidden rounded-[14px]">
            <ul>
              {slice.map((item, index) => {
                const status = item.status as EvaluationStatus
                const isLast = index === slice.length - 1
                return (
                  <li key={item.id} className={cn(!isLast && 'border-b border-foreground/8')}>
                    <Link
                      href={`/dashboard/evaluation/results/${item.id}`}
                      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-foreground/[0.03]"
                    >
                      <span aria-hidden className="mono-caption w-6 shrink-0 text-foreground/40 tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        aria-hidden
                        className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[status] ?? 'bg-foreground/20')}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-[13.5px] font-medium text-foreground">
                          {t(`dashboard.recentActivity.label.${status}`, {
                            defaultValue: t('dashboard.recentActivity.label.complete')
                          })}
                        </p>
                        <p className="mono-caption mt-1 truncate text-foreground/55">
                          {relativeTime(item.createdAt, t)}
                          {item.status === 'complete' && <> · RM {RM.format(item.totalAnnualRM)}</>}
                        </p>
                      </div>
                      <ArrowRight className="size-3.5 shrink-0 text-foreground/40" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
          <Link
            href="/dashboard/evaluation"
            className="mono-caption self-end text-foreground/55 transition-colors hover:text-foreground"
          >
            {t('dashboard.recentActivity.viewAll')}
            <ArrowRight className="ml-1 inline size-3" aria-hidden />
          </Link>
        </>
      )}
    </section>
  )
}
