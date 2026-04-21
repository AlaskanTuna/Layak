'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import type { EvaluationListItem, EvaluationStatus } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

const TIMELINE_LIMIT = 5

const RM = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

const STATUS_DOT: Record<EvaluationStatus, string> = {
  complete: 'bg-primary',
  running: 'bg-amber-500 animate-pulse',
  error: 'bg-destructive'
}

type Props = {
  items: EvaluationListItem[]
}

function relativeTime(value: string | null, t: (k: string, opts?: Record<string, unknown>) => string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return t('dashboard.recentActivity.justNow', { defaultValue: 'Just now' })
  if (diffMin < 60) return t('dashboard.recentActivity.minutesAgo', { count: diffMin, defaultValue: `${diffMin} min ago` })
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return t('dashboard.recentActivity.hoursAgo', { count: diffHr, defaultValue: `${diffHr} h ago` })
  const diffDay = Math.floor(diffHr / 24)
  return t('dashboard.recentActivity.daysAgo', { count: diffDay, defaultValue: `${diffDay} d ago` })
}

export function RecentActivity({ items }: Props) {
  const { t } = useTranslation()
  const slice = useMemo(() => items.slice(0, TIMELINE_LIMIT), [items])

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-tight">{t('dashboard.recentActivity.title')}</h2>

      {slice.length === 0 ? (
        <div className="section-shell flex flex-col items-center gap-4 rounded-[1.5rem] px-6 py-8 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clock className="size-5" aria-hidden />
          </div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Timeline</p>
          <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Activity will appear here after your first run.
          </p>
          <p className="max-w-sm text-sm leading-7 text-muted-foreground">
            {t('dashboard.recentActivity.emptyDescription')}
          </p>
          <Link
            href="/dashboard/evaluation/upload"
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Start with a sample-friendly upload
            <ArrowRight className="ml-1 inline size-3.5" aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          <Card className="gap-0 border border-border/70 bg-background/78 py-0 shadow-sm">
            <ul>
              {slice.map((item, index) => {
                const status = item.status as EvaluationStatus
                const isLast = index === slice.length - 1

                return (
                  <li key={item.id} className={cn('border-border', !isLast && 'border-b')}>
                    <Link
                      href={`/dashboard/evaluation/results/${item.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      <span
                        aria-hidden
                        className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[status] ?? 'bg-muted')}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-sm font-medium">
                          {t(`dashboard.recentActivity.label.${status}`, {
                            defaultValue:
                              status === 'running' ? 'Evaluation in progress' : status === 'error' ? 'Evaluation failed' : 'Evaluation complete'
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {relativeTime(item.createdAt, t)}
                          {item.status === 'complete' && <> • RM {RM.format(item.totalAnnualRM)}</>}
                        </p>
                      </div>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>
          <Link
            href="/dashboard/evaluation"
            className="self-end text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('dashboard.recentActivity.viewAll', { defaultValue: 'View all' })}
            <ArrowRight className="ml-1 inline size-3" aria-hidden />
          </Link>
        </>
      )}
    </section>
  )
}
