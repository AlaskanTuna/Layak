'use client'

import type { ReactNode } from 'react'
import { Building2, Calendar, Layers, Tag } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useLatestVerifiedAt } from '@/hooks/use-verified-schemes'

// User-facing scheme count: 16 backend `SchemeId` slugs covering 9
// federal agencies and 7 benefit categories. Phase 14 added 7 more schemes
// (PeKa B40, BAP, Bantuan Elektrik, i-Suri, MySalam, SARA, RMT) on top of
// the original 9 (STR, JKM Warga Emas, JKM BKK, LHDN Form B, LHDN Form BE,
// PERKESO SKSPS, i-Saraan, BUDI95, MyKasih). LHDN Form B + Form BE count
// separately because they target different filer cohorts (gig vs salaried)
// with different deadlines and relief baskets.
const STATIC_STATS = [
  { id: 'schemes', icon: Layers, accent: 'hibiscus', value: '16' },
  { id: 'agencies', icon: Building2, accent: 'forest', value: '9' },
  { id: 'categories', icon: Tag, accent: 'primary', value: '7' }
] as const

type Accent = 'hibiscus' | 'forest' | 'primary'

const ACCENT: Record<Accent, string> = {
  hibiscus: 'bg-[color:var(--hibiscus)]/10 text-[color:var(--hibiscus)]',
  forest: 'bg-[color:var(--forest)]/12 text-[color:var(--forest)]',
  primary: 'bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
}

/** Format an ISO datetime string (e.g. "2026-05-13T17:30:00Z") as a
 * locale-aware short date (e.g. "May 13, 2026"). Returns "—" on
 * undefined/null/parse-fail so the tile renders a placeholder rather
 * than crashing while the fetch resolves or before any admin action
 * has stamped a verifiedAt. */
function formatLatestUpdate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return '—'
  const intlLocale = locale === 'ms' ? 'ms-MY' : locale === 'zh' ? 'zh-CN' : 'en-MY'
  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(parsed)
}

export function SchemesStatsStrip() {
  const { t, i18n } = useTranslation()
  // Phase 12 — "Latest Update" derived from `max(verified_at)` across the
  // `verified_schemes` collection. Auto-refreshes whenever an admin approves
  // a new discovery candidate (Phase 11 Feature 1's `_finalize_approval`
  // writes SERVER_TIMESTAMP). Day-1 seed via
  // `scripts/seed_verified_schemes.py` stamps the locked schemes with the
  // deploy date so the tile shows a real value before any admin action.
  const latestVerifiedAt = useLatestVerifiedAt()
  const latestUpdateValue = formatLatestUpdate(latestVerifiedAt, i18n.language)

  return (
    <section aria-label={t('schemes.stats.ariaLabel')} className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {STATIC_STATS.map((stat) => {
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
      <StatCard
        icon={<Calendar className="size-4" aria-hidden />}
        label={t('schemes.stats.year')}
        value={latestUpdateValue}
        accent="primary"
      />
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
