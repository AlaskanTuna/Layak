'use client'

import Link from 'next/link'
import { ArrowUpRight, Library, ListChecks, Settings2, Sparkles, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Accent = 'hibiscus' | 'forest' | 'primary'

type Tile = {
  id: string
  href: string
  icon: LucideIcon
  accent: Accent
  i18nKey: 'startEvaluation' | 'myEvaluations' | 'schemesLibrary' | 'settings'
}

const TILES: readonly Tile[] = [
  { id: 'start', href: '/dashboard/evaluation/upload', icon: Sparkles, accent: 'hibiscus', i18nKey: 'startEvaluation' },
  { id: 'evaluations', href: '/dashboard/evaluation', icon: ListChecks, accent: 'forest', i18nKey: 'myEvaluations' },
  { id: 'schemes', href: '/dashboard/schemes', icon: Library, accent: 'primary', i18nKey: 'schemesLibrary' },
  { id: 'settings', href: '/settings', icon: Settings2, accent: 'primary', i18nKey: 'settings' }
]

const ACCENT: Record<Accent, string> = {
  hibiscus: 'bg-[color:var(--hibiscus)]/10 text-[color:var(--hibiscus)]',
  forest: 'bg-[color:var(--forest)]/12 text-[color:var(--forest)]',
  primary: 'bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
}

export function DashboardLauncherGrid() {
  const { t } = useTranslation()
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {TILES.map((tile) => {
        const Icon = tile.icon
        return (
          <li key={tile.id}>
            <Link
              href={tile.href}
              className="paper-card group relative flex h-full min-h-[180px] flex-col gap-5 overflow-hidden rounded-[18px] p-5 transition-shadow hover:shadow-[0_30px_70px_-22px_color-mix(in_oklch,var(--ink)_30%,transparent)] sm:min-h-[210px] sm:p-6"
            >
              <div className="relative flex items-start justify-between gap-3">
                <span className={`flex size-11 items-center justify-center rounded-md ${ACCENT[tile.accent]}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <ArrowUpRight
                  className="size-4 text-foreground/40 transition-colors group-hover:text-foreground"
                  aria-hidden
                />
              </div>
              <div className="relative mt-auto flex flex-col gap-1.5">
                <h2 className="font-heading text-lg font-semibold tracking-tight sm:text-xl">
                  {t(`dashboard.launcher.${tile.i18nKey}.title`)}
                </h2>
                <p className="text-sm leading-relaxed text-foreground/65">
                  {t(`dashboard.launcher.${tile.i18nKey}.description`)}
                </p>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
