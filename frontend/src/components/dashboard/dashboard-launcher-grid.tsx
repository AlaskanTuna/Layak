'use client'

import Link from 'next/link'
import { ArrowUpRight, Library, ListChecks, Sparkles, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Accent = 'hibiscus' | 'forest' | 'primary'

type Tile = {
  id: string
  href: string
  icon: LucideIcon
  accent: Accent
  i18nKey: 'startEvaluation' | 'myEvaluations' | 'schemesLibrary'
  image: string
  hero?: boolean
}

const TILES: readonly Tile[] = [
  {
    id: 'start',
    href: '/dashboard/evaluation/upload',
    icon: Sparkles,
    accent: 'hibiscus',
    i18nKey: 'startEvaluation',
    image: '/dashboard/start.webp',
    hero: true
  },
  {
    id: 'evaluations',
    href: '/dashboard/evaluation',
    icon: ListChecks,
    accent: 'forest',
    i18nKey: 'myEvaluations',
    image: '/dashboard/evaluations.webp'
  },
  {
    id: 'schemes',
    href: '/dashboard/schemes',
    icon: Library,
    accent: 'primary',
    i18nKey: 'schemesLibrary',
    image: '/dashboard/schemes.webp'
  }
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
        const isHero = tile.hero === true
        return (
          <li key={tile.id} className={isHero ? 'sm:col-span-2' : undefined}>
            <Link
              href={tile.href}
              className={`paper-card group relative flex h-full flex-col gap-5 overflow-hidden rounded-[18px] p-5 transition-shadow hover:shadow-[0_30px_70px_-22px_color-mix(in_oklch,var(--ink)_30%,transparent)] sm:p-6 ${
                isHero ? 'min-h-[200px] sm:min-h-[280px]' : 'min-h-0 sm:min-h-[280px]'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.image}
                alt=""
                aria-hidden
                className={`pointer-events-none select-none transition-transform duration-500 group-hover:translate-y-[-2px] ${
                  isHero
                    ? 'absolute -right-2 -bottom-2 size-24 opacity-95 sm:right-4 sm:bottom-2 sm:size-56 lg:size-64'
                    : 'hidden sm:absolute sm:block sm:right-2 sm:bottom-2 sm:size-44 sm:opacity-95'
                }`}
                loading="lazy"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />

              {/* Responsive fades. Mobile: heavy veil so the illustration
                  reads as a corner stamp and text wins. sm+: subtle veil so
                  the illustration stays vivid. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 sm:hidden"
                style={{
                  background:
                    'linear-gradient(to left, var(--paper) 0%, color-mix(in oklch, var(--paper) 80%, transparent) 35%, transparent 75%), linear-gradient(to top, var(--paper) 0%, var(--paper) 55%, color-mix(in oklch, var(--paper) 60%, transparent) 80%, transparent 100%)'
                }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 hidden sm:block"
                style={{
                  background:
                    'linear-gradient(to left, color-mix(in oklch, var(--paper) 65%, transparent) 0%, color-mix(in oklch, var(--paper) 25%, transparent) 18%, transparent 40%), linear-gradient(to top, color-mix(in oklch, var(--paper) 65%, transparent) 0%, color-mix(in oklch, var(--paper) 25%, transparent) 20%, transparent 45%)'
                }}
              />

              <div className="relative flex items-start gap-3">
                <span
                  className={`size-11 items-center justify-center rounded-md ${ACCENT[tile.accent]} ${
                    isHero ? 'flex' : 'hidden sm:flex'
                  }`}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <ArrowUpRight
                  className="ml-auto size-4 text-foreground/40 transition-colors group-hover:text-foreground"
                  aria-hidden
                />
              </div>

              <div
                className={`relative mt-auto flex flex-col gap-1.5 ${
                  isHero ? 'max-w-[55%] sm:max-w-[60%]' : 'sm:max-w-[60%]'
                }`}
              >
                <h2
                  className={`font-heading font-semibold tracking-tight ${
                    isHero ? 'text-lg sm:text-xl' : 'text-2xl sm:text-xl'
                  }`}
                >
                  {t(`dashboard.launcher.${tile.i18nKey}.title`)}
                </h2>
                <p
                  className={`leading-relaxed text-foreground/65 ${
                    isHero ? 'text-sm' : 'text-base sm:text-sm'
                  }`}
                >
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
