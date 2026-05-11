'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { Coins, FileCheck, Layers, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EvaluationListItem } from '@/lib/agent-types'

const RM = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

const SCHEMES_TRACKED = 6

type Accent = 'hibiscus' | 'forest' | 'primary'

const ACCENT: Record<Accent, string> = {
  hibiscus: 'bg-[color:var(--hibiscus)]/10 text-[color:var(--hibiscus)]',
  forest: 'bg-[color:var(--forest)]/12 text-[color:var(--forest)]',
  primary: 'bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
}

type Props = {
  items: EvaluationListItem[]
}

export function DashboardKpiStrip({ items }: Props) {
  const { t } = useTranslation()
  const { draftsReady, highestRelief, completedRuns } = useMemo(() => {
    let drafts = 0
    let peak = 0
    let complete = 0
    for (const item of items) {
      if (item.status === 'complete') {
        complete += 1
        drafts += item.draftCount
        if (item.totalAnnualRM > peak) peak = item.totalAnnualRM
      }
    }
    return { draftsReady: drafts, highestRelief: peak, completedRuns: complete }
  }, [items])

  const hasCompleted = completedRuns > 0

  return (
    <section aria-label={t('dashboard.kpi.ariaLabel')} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiTile
        icon={<FileCheck className="size-4" aria-hidden />}
        label={t('dashboard.kpi.draftsReady')}
        value={draftsReady.toString()}
        accent="hibiscus"
      />
      <KpiTile
        icon={<TrendingUp className="size-4" aria-hidden />}
        label={t('dashboard.kpi.highestRelief')}
        value={hasCompleted ? `RM ${RM.format(highestRelief)}` : '—'}
        accent="forest"
      />
      <KpiTile
        icon={<Coins className="size-4" aria-hidden />}
        label={t('dashboard.kpi.successfulRuns')}
        value={completedRuns.toString()}
        accent="primary"
      />
      <KpiTile
        icon={<Layers className="size-4" aria-hidden />}
        label={t('dashboard.kpi.schemesTracked')}
        value={SCHEMES_TRACKED.toString()}
        accent="primary"
      />
    </section>
  )
}

type KpiTileProps = {
  icon: ReactNode
  label: string
  value: string
  accent: Accent
}

function KpiTile({ icon, label, value, accent }: KpiTileProps) {
  return (
    <div className="paper-card flex flex-col gap-2.5 rounded-[14px] px-4 py-4">
      <div className="flex items-center gap-2.5">
        <span className={`flex size-8 items-center justify-center rounded-md ${ACCENT[accent]}`}>{icon}</span>
        <p className="mono-caption text-foreground/55">{label}</p>
      </div>
      <p className="font-heading text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </div>
  )
}
