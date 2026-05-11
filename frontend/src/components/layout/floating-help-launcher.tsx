'use client'

import { CircleHelp, FileText, PlayCircle, Waypoints, type LucideIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type HelpSection = 'overview' | 'documents' | 'results'

const SECTION_ICONS: Record<HelpSection, LucideIcon> = {
  overview: Waypoints,
  documents: FileText,
  results: PlayCircle
}

function getContextSection(pathname: string | null): HelpSection {
  if (!pathname) return 'overview'
  if (pathname.includes('/evaluation/upload')) return 'documents'
  if (pathname.includes('/evaluation/results')) return 'results'
  return 'overview'
}

/**
 * Floating help affordance. Opens a single context-aware popover anchored to
 * the launcher button — no tabs, just the card that matches the current
 * route. Mirrors the same paper-card + hibiscus-ribbon + grid-texture
 * pattern as the rest of the app's editorial surfaces.
 */
export function FloatingHelpLauncher() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const section = getContextSection(pathname)
  const Icon = SECTION_ICONS[section]

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={t('common.help.open')}
            className="glass-surface fixed right-4 bottom-4 z-40 inline-flex size-12 cursor-pointer items-center justify-center rounded-full text-foreground shadow-[0_18px_40px_-18px_color-mix(in_oklch,var(--ink)_45%,transparent)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-foreground/30 md:right-6 md:bottom-6"
          >
            <CircleHelp className="size-5" aria-hidden />
          </button>
        }
      />
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="relative isolate w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-5"
      >
        {/* Civic-handbook grid texture, matches other accent-strip cards */}
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
          className="pointer-events-none absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70"
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-[color:var(--hibiscus)]/10 text-[color:var(--hibiscus)]">
            <Icon className="size-4" aria-hidden />
          </span>
          <h3 className="font-heading text-base font-semibold tracking-tight">
            {t(`common.help.${section}.title`)}
          </h3>
        </div>
        <p className="relative mt-3 text-[13px] leading-[1.55] text-foreground/65">
          {t(`common.help.${section}.body`)}
        </p>
        <ul className="relative mt-3 flex flex-col gap-1.5 text-[12.5px] leading-[1.55] text-foreground/65">
          {(['point1', 'point2', 'point3'] as const).map((key) => (
            <li key={key} className="flex gap-2">
              <span
                aria-hidden
                className="mt-[7px] size-1 shrink-0 rounded-full bg-[color:var(--hibiscus)]/55"
              />
              <span>{t(`common.help.${section}.${key}`)}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
