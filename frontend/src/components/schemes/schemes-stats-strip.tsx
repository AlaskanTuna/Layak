'use client'

import type { ReactNode } from 'react'
import { Building2, Calendar, Layers, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const STATS = [
  { id: 'schemes', icon: Layers, accent: 'hibiscus', value: '6' },
  { id: 'agencies', icon: Building2, accent: 'forest', value: '5' },
  { id: 'categories', icon: Tag, accent: 'primary', value: '5' },
  { id: 'year', icon: Calendar, accent: 'primary', value: '2026' }
] as const

type Accent = 'hibiscus' | 'forest' | 'primary'

const ACCENT: Record<Accent, string> = {
  hibiscus: 'bg-[color:var(--hibiscus)]/10 text-[color:var(--hibiscus)]',
  forest: 'bg-[color:var(--forest)]/12 text-[color:var(--forest)]',
  primary: 'bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
}

export function SchemesStatsStrip() {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('schemes.stats.ariaLabel')}
      className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      {STATS.map((stat) => {
        const Icon = stat.icon
        return (
          <StatCard
            key={stat.id}
            icon={<Icon className="size-4" aria-hidden />}
            label={t(`schemes.stats.${stat.id}`)}
            value={stat.value}
            accent={stat.accent}
          />
        )
      })}
    </section>
  )
}

type StatCardProps = {
  icon: ReactNode
  label: string
  value: string
  accent: Accent
}

function StatCard({ icon, label, value, accent }: StatCardProps) {
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
