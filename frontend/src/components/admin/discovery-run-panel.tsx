'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { triggerDiscovery, type DiscoveryRunSummary } from '@/lib/admin-discovery'
import { notificationStore } from '@/lib/notification-store'

type Phase = 'idle' | 'running' | 'done' | 'error'

function formatRelative(ms: number | null): string {
  if (!ms) return ''
  const diff = Date.now() - ms
  if (Number.isNaN(diff) || diff < 0) return ''
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  return `${days} d ago`
}

/**
 * Self-contained discovery run card. Replaces the topcard-bound trigger.
 * Surfaces idle → running → done/error states inline so the result never
 * spills into PageHeading meta.
 */
export function DiscoveryRunPanel({ onCompleted }: { onCompleted: () => void }) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('idle')
  const [summary, setSummary] = useState<DiscoveryRunSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [completedAt, setCompletedAt] = useState<number | null>(null)
  const [, forceTick] = useState(0)

  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  // Keep the "last run · N min ago" label fresh while idle/done.
  useEffect(() => {
    if (phase === 'running') return
    const id = setInterval(() => forceTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [phase])

  async function handleClick() {
    setPhase('running')
    setElapsed(0)
    setError(null)
    try {
      const res = await triggerDiscovery()
      setSummary(res)
      setCompletedAt(Date.now())
      setPhase('done')
      notificationStore.notify({
        title: t('admin.discovery.triggerSuccessTitle'),
        description: t('admin.discovery.triggerSuccess', {
          checked: res.sources_checked,
          changed: res.sources_changed,
          extracted: res.candidates_extracted
        }),
        severity: 'success',
        toast: true,
        groupKey: 'admin-discovery-trigger'
      })
      onCompleted()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setPhase('error')
      notificationStore.notify({
        title: t('admin.discovery.triggerErrorTitle'),
        description: t('admin.discovery.triggerError', { message }),
        severity: 'error',
        toast: true,
        groupKey: 'admin-discovery-trigger'
      })
    }
  }

  const busy = phase === 'running'
  const buttonLabel =
    phase === 'running'
      ? t('admin.discovery.triggerRunning')
      : phase === 'done'
        ? t('admin.discovery.runPanel.runAgain')
        : phase === 'error'
          ? t('admin.discovery.runPanel.tryAgain')
          : t('admin.discovery.triggerButton')

  return (
    <section className="paper-card relative isolate overflow-hidden rounded-[18px] p-6 sm:p-7">
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
        className="pointer-events-none absolute inset-y-6 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70 sm:inset-y-7"
      />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex max-w-prose flex-col gap-1.5">
            <p className="mono-caption text-[color:var(--hibiscus)]">{t('admin.discovery.runPanel.eyebrow')}</p>
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              {t('admin.discovery.runPanel.title')}
            </h2>
            <p className="text-[14px] leading-[1.6] text-foreground/68">
              {t('admin.discovery.runPanel.description')}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleClick}
            disabled={busy}
            size="lg"
            className="gap-2 rounded-full bg-[color:var(--hibiscus)]/92 px-5 text-[color:var(--hibiscus-foreground)] backdrop-blur-md hover:bg-[color:var(--hibiscus)]"
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {!busy && phase === 'idle' && <Sparkles className="size-4" aria-hidden />}
            {!busy && phase === 'done' && <RefreshCw className="size-4" aria-hidden />}
            {!busy && phase === 'error' && <RefreshCw className="size-4" aria-hidden />}
            {buttonLabel}
          </Button>
        </div>

        {phase === 'idle' && (
          <p className="mono-caption text-foreground/55">{t('admin.discovery.runPanel.idleHint')}</p>
        )}

        {phase === 'running' && (
          <div className="flex flex-col gap-2">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-foreground/10">
              <span className="absolute inset-0 animate-pulse rounded-full bg-[color:var(--hibiscus)]/60" />
            </div>
            <p className="mono-caption text-foreground/55" aria-live="polite">
              {t('admin.discovery.runPanel.elapsed', { seconds: elapsed })}
            </p>
          </div>
        )}

        {phase === 'done' && summary && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Kpi
                label={t('admin.discovery.runPanel.kpi.sourcesChecked')}
                value={summary.sources_checked}
              />
              <Kpi
                label={t('admin.discovery.runPanel.kpi.sourcesChanged')}
                value={summary.sources_changed}
              />
              <Kpi
                label={t('admin.discovery.runPanel.kpi.candidatesExtracted')}
                value={summary.candidates_extracted}
              />
            </div>
            {completedAt && (
              <p className="mono-caption text-foreground/55">
                {t('admin.discovery.runPanel.lastRun', { relative: formatRelative(completedAt) })}
              </p>
            )}
          </div>
        )}

        {phase === 'error' && error && (
          <div className="flex items-start gap-2 rounded-[10px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{t('admin.discovery.triggerError', { message: error })}</span>
          </div>
        )}
      </div>
    </section>
  )
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-[10px] border border-foreground/10 bg-card/40 px-4 py-3">
      <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="mono-caption text-foreground/55">{label}</span>
    </div>
  )
}
