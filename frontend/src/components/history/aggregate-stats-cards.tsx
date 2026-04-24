'use client'

import { useMemo } from 'react'
import { CheckCircle2, FileText, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
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
  const { totalRuns, peakRm, completedRuns } = useMemo(() => {
    let peak = 0
    let complete = 0
    for (const item of items) {
      if (item.status === 'complete') {
        complete += 1
        if (item.totalAnnualRM > peak) peak = item.totalAnnualRM
      }
    }
    return { totalRuns: items.length, peakRm: peak, completedRuns: complete }
  }, [items])

  return (
    <section
      aria-label={t('evaluation.history.stats.ariaLabel')}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <StatCard
        icon={<FileText className="size-4 text-muted-foreground" aria-hidden />}
        label={t('evaluation.history.stats.totalEvaluations')}
        value={totalRuns.toString()}
      />
      <StatCard
        icon={<TrendingUp className="size-4 text-muted-foreground" aria-hidden />}
        label={t('evaluation.history.stats.highestResult')}
        value={completedRuns > 0 ? `RM ${RM.format(peakRm)}` : '—'}
      />
      <StatCard
        icon={<CheckCircle2 className="size-4 text-muted-foreground" aria-hidden />}
        label={t('evaluation.history.stats.successfulRuns')}
        value={completedRuns.toString()}
      />
    </section>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="gap-2 px-4 py-4">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      </div>
      <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </Card>
  )
}
