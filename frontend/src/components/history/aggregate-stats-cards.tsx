'use client'

import { useMemo } from 'react'
import { CheckCircle2, FileCheck, FileText, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EvaluationListItem } from '@/lib/agent-types'

const RM = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

type Props = {
  items: EvaluationListItem[]
}

/**
 * Derives the three top-of-dashboard metrics from the same
 * `GET /api/evaluations` response the history table consumes. Summing the per-
 * run RM totals would double-count (each evaluation re-scores the same person),
 * so we surface the *highest* discovered relief as the meaningful upside number
 * instead. "Unique schemes qualified" is substituted with "Successful runs"
 * because the slim list endpoint omits per-eval scheme arrays.
 */
export function AggregateStatsCards({ items }: Props) {
  const { t } = useTranslation()
  const { totalRuns, peakRm, completedRuns, totalDrafts } = useMemo(() => {
    let peak = 0
    let complete = 0
    let drafts = 0
    for (const item of items) {
      if (item.status === 'complete') {
        complete += 1
        drafts += item.draftCount
        if (item.totalAnnualRM > peak) peak = item.totalAnnualRM
      }
    }
    return { totalRuns: items.length, peakRm: peak, completedRuns: complete, totalDrafts: drafts }
  }, [items])

  return (
    <section
      aria-label={t('evaluation.history.stats.ariaLabel')}
      className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <StatCard
        icon={<FileText className="size-4" aria-hidden />}
        label={t('evaluation.history.stats.totalEvaluations')}
        value={totalRuns.toString()}
      />
      <StatCard
        icon={<TrendingUp className="size-4" aria-hidden />}
        label={t('evaluation.history.stats.highestResult')}
        value={completedRuns > 0 ? `RM ${RM.format(peakRm)}` : '—'}
      />
      <StatCard
        icon={<CheckCircle2 className="size-4" aria-hidden />}
        label={t('evaluation.history.stats.successfulRuns')}
        value={completedRuns.toString()}
      />
      <StatCard
        icon={<FileCheck className="size-4" aria-hidden />}
        label={t('evaluation.history.stats.totalDrafts')}
        value={totalDrafts.toString()}
      />
    </section>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="paper-card flex flex-col gap-2 rounded-[14px] px-4 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-md bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
          {icon}
        </span>
        <p className="mono-caption text-foreground/55">{label}</p>
      </div>
      <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  )
}
