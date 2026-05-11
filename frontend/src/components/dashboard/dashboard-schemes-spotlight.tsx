'use client'

import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Coins, HeartHandshake, Scale, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Accent = 'hibiscus' | 'forest' | 'primary'

type Featured = {
  id: string
  agency: string
  name: string
  blurb: string
  icon: LucideIcon
  accent: Accent
}

// Scheme names, agencies, and form references are proper nouns and must stay
// source-language — they identify government documents and live in /schemes.
const FEATURED: readonly Featured[] = [
  {
    id: 'str',
    agency: 'Treasury',
    name: 'STR 2026',
    blurb: 'Quarterly cash transfer for low- and middle-income households.',
    icon: Coins,
    accent: 'hibiscus'
  },
  {
    id: 'jkm',
    agency: 'JKM',
    name: 'Warga Emas',
    blurb: 'Monthly stipend for senior dependants in the household.',
    icon: HeartHandshake,
    accent: 'forest'
  },
  {
    id: 'lhdn',
    agency: 'LHDN',
    name: 'Form B reliefs',
    blurb: 'Five income tax reliefs claimable by self-employed filers.',
    icon: Scale,
    accent: 'primary'
  }
]

const ACCENT: Record<Accent, string> = {
  hibiscus: 'bg-[color:var(--hibiscus)]/10 text-[color:var(--hibiscus)]',
  forest: 'bg-[color:var(--forest)]/12 text-[color:var(--forest)]',
  primary: 'bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
}

export function DashboardSchemesSpotlight() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('dashboard.spotlight.title')}</h2>
        <Link
          href="/dashboard/schemes"
          className="mono-caption inline-flex items-center gap-1 text-foreground/55 transition-colors hover:text-foreground"
        >
          {t('dashboard.spotlight.viewAll')}
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURED.map((s) => {
          const Icon = s.icon
          return (
            <li key={s.id}>
              <Link
                href="/dashboard/schemes"
                className="paper-card group flex h-full flex-col gap-3 rounded-[14px] p-4 transition-shadow hover:shadow-[0_22px_50px_-22px_color-mix(in_oklch,var(--ink)_28%,transparent)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`flex size-9 items-center justify-center rounded-md ${ACCENT[s.accent]}`}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="mono-caption text-foreground/55">{s.agency}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-heading text-base font-semibold tracking-tight">{s.name}</p>
                  <p className="text-sm leading-relaxed text-foreground/65">{s.blurb}</p>
                </div>
                <span className="mono-caption mt-auto inline-flex items-center gap-1 text-foreground/55 transition-colors group-hover:text-foreground">
                  {t('dashboard.spotlight.explore')}
                  <ArrowUpRight className="size-3" aria-hidden />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
