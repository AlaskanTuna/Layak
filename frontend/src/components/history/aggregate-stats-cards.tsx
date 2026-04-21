'use client'

import { useMemo } from 'react'
import { CheckCircle2, FileText, Wallet } from 'lucide-react'

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
 * Phase 4 Task 2 — derives the three top-of-dashboard metrics from the same
 * `GET /api/evaluations` response the history table consumes. The list endpoint
 * deliberately omits per-eval scheme details (slim row), so "unique schemes
 * qualified" is approximated via the completed-run count — the data needed for
 * a real scheme set lives behind `/api/evaluations/{id}` and is too expensive
 * to fan out from a list view.
 */
export function AggregateStatsCards({ items }: Props) {
  const { totalRuns, totalRm, completedRuns } = useMemo(() => {
    let total = 0
    let complete = 0
    for (const item of items) {
      if (item.status === 'complete') {
        total += item.totalAnnualRM
        complete += 1
      }
    }
    return { totalRuns: items.length, totalRm: total, completedRuns: complete }
  }, [items])

  return (
    <section
      aria-label="Lifetime stats"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      <StatCard
        icon={<FileText className="size-4 text-muted-foreground" aria-hidden />}
        label="Total evaluations"
        value={totalRuns.toString()}
      />
      <StatCard
        icon={<Wallet className="size-4 text-muted-foreground" aria-hidden />}
        label="Lifetime RM identified"
        value={`RM ${RM.format(totalRm)}`}
      />
      <StatCard
        icon={<CheckCircle2 className="size-4 text-muted-foreground" aria-hidden />}
        label="Successful runs"
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
