'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { AlertTriangle, ArrowRight, History, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { EvaluationListItem, EvaluationStatus } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

const RM = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const STATUS_DOT: Record<EvaluationStatus, string> = {
  complete: 'bg-[color:var(--forest)]',
  running: 'bg-amber-500 animate-pulse',
  error: 'bg-[color:var(--hibiscus)]'
}

export type ContinueRailPhase = 'loading' | 'ready' | 'error'

type Props = {
  items: EvaluationListItem[]
  phase: ContinueRailPhase
  errorMessage?: string | null
  onRetry?: () => void
}

function relativeTime(value: string | null, t: (k: string, opts?: Record<string, unknown>) => string): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (diffMin < 1) return t('dashboard.recentActivity.justNow')
  if (diffMin < 60) return t('dashboard.recentActivity.minutesAgo', { count: diffMin })
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return t('dashboard.recentActivity.hoursAgo', { count: diffHr })
  return t('dashboard.recentActivity.daysAgo', { count: Math.floor(diffHr / 24) })
}

/**
 * Single-card resume rail mirrored after SolarSim's pattern. Surfaces the
 * latest evaluation (regardless of status) so the user can pick up where they
 * stopped. Empty state nudges first-run users to the upload page.
 */
export function DashboardContinueRail({ items, phase, errorMessage, onRetry }: Props) {
  const { t } = useTranslation()
  const latest = useMemo(() => items[0] ?? null, [items])

  return (
    <aside className="paper-card relative isolate flex h-full flex-col gap-5 overflow-hidden rounded-[18px] p-5 sm:p-6">
      {/* Civic-handbook grid texture, identical to the hero PageHeading */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70 sm:inset-y-6"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dashboard/continue.webp"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-3 -bottom-3 size-36 select-none opacity-95 sm:right-2 sm:bottom-2 sm:size-44"
        loading="lazy"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
      <div className="relative flex items-start gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-md bg-[color:var(--hibiscus)]/10 text-[color:var(--hibiscus)]">
          <History className="size-4" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="mono-caption text-foreground/55">{t('dashboard.continue.eyebrow')}</p>
          <h2 className="font-heading text-lg font-semibold tracking-tight">{t('dashboard.continue.title')}</h2>
        </div>
      </div>

      {phase === 'loading' && (
        <div className="relative flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t('dashboard.continue.loading')}
        </div>
      )}

      {phase === 'error' && (
        <div className="relative flex flex-col gap-3 rounded-md border border-[color:var(--hibiscus)]/30 bg-[color:var(--hibiscus)]/[0.06] p-3 backdrop-blur-md">
          <div className="flex items-start gap-2 text-sm text-foreground/80">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[color:var(--hibiscus)]" aria-hidden />
            <span>{errorMessage ?? t('dashboard.continue.errorGeneric')}</span>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="self-start bg-background/60 backdrop-blur-md hover:bg-background/80"
            >
              {t('common.button.retry')}
            </Button>
          )}
        </div>
      )}

      {phase === 'ready' && latest === null && (
        <div className="relative flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-foreground/65">{t('dashboard.continue.empty')}</p>
          <Button
            size="sm"
            render={<Link href="/dashboard/evaluation/upload" />}
            className="self-start rounded-full bg-[color:var(--hibiscus)]/92 px-4 text-[color:var(--hibiscus-foreground)] backdrop-blur-md hover:bg-[color:var(--hibiscus)]"
          >
            {t('dashboard.continue.emptyCta')}
            <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
          </Button>
        </div>
      )}

      {phase === 'ready' && latest !== null && (
        <Link
          href={`/dashboard/evaluation/results/${latest.id}`}
          className="group relative flex flex-col gap-2 rounded-md border border-foreground/8 bg-background/60 px-3 py-3 backdrop-blur-md transition-colors hover:bg-background/80"
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                'size-2 shrink-0 rounded-full',
                STATUS_DOT[latest.status as EvaluationStatus] ?? 'bg-foreground/20'
              )}
            />
            <p className="truncate text-sm font-medium">
              {t(`dashboard.recentActivity.label.${latest.status}`, {
                defaultValue: t('dashboard.recentActivity.label.complete')
              })}
            </p>
          </div>
          <p className="mono-caption text-foreground/55">
            {relativeTime(latest.createdAt, t)}
            {latest.status === 'complete' && <> · RM {RM.format(latest.totalAnnualRM)}</>}
          </p>
          <span className="mono-caption inline-flex items-center gap-1 self-start text-[color:var(--hibiscus)]">
            {latest.status === 'complete'
              ? t('dashboard.continue.openPacket')
              : latest.status === 'running'
                ? t('dashboard.continue.viewProgress')
                : t('dashboard.continue.openRun')}
            <ArrowRight className="size-3" aria-hidden />
          </span>
        </Link>
      )}
    </aside>
  )
}
