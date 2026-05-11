'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export const TOC_SECTIONS = ['overview', 'schemes', 'required', 'preview', 'download'] as const
export type TocSectionId = (typeof TOC_SECTIONS)[number]

type Props = {
  visibleSections: readonly TocSectionId[]
}

/**
 * Table of contents for the results page. Two responsive layouts:
 * - `lg+`: sticky right-rail vertical nav (220px column in the parent grid).
 * - `< lg`: sticky horizontal chip strip just under the topbar.
 *
 * Both share one IntersectionObserver-driven active state and the at-bottom
 * override so the last (short) section can still be marked active.
 */
export function EvaluationResultsToc({ visibleSections }: Props) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<TocSectionId>(visibleSections[0] ?? 'overview')

  useEffect(() => {
    if (typeof window === 'undefined' || visibleSections.length === 0) return

    const targets = visibleSections
      .map((id) => ({ id, el: document.getElementById(id) }))
      .filter((entry): entry is { id: TocSectionId; el: HTMLElement } => entry.el !== null)

    if (targets.length === 0) return

    const lastId = visibleSections[visibleSections.length - 1]

    function isAtPageBottom(): boolean {
      const scrolled = window.scrollY + window.innerHeight
      const total = document.documentElement.scrollHeight
      return total - scrolled < 48
    }

    // Returns the id of whichever target currently sits inside the observer's
    // active zone (the 25 %-tall strip from 20 % to 45 % from the viewport
    // top), picking the topMost one. `null` if nothing intersects — that
    // signals "fall back to the at-bottom pin if applicable".
    function activeFromGeometry(): TocSectionId | null {
      const top = window.innerHeight * 0.2
      const bottom = window.innerHeight * 0.45
      let best: { id: TocSectionId; top: number } | null = null
      for (const { id, el } of targets) {
        const r = el.getBoundingClientRect()
        // A section is in the active zone if any part of its bbox crosses
        // the strip. Pick the one whose top edge is highest in the strip.
        if (r.bottom > top && r.top < bottom) {
          if (best === null || r.top < best.top) best = { id, top: r.top }
        }
      }
      return best?.id ?? null
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting)
        if (intersecting.length > 0) {
          const topMost = intersecting.reduce((best, entry) =>
            entry.boundingClientRect.top < best.boundingClientRect.top ? entry : best
          )
          const id = (topMost.target as HTMLElement).id as TocSectionId
          if (TOC_SECTIONS.includes(id)) {
            setActiveId(id)
            return
          }
        }
        // No section in the active zone — apply the at-bottom fallback so the
        // short trailing section (Download Packet) is still reachable.
        if (isAtPageBottom()) setActiveId(lastId)
      },
      // The negative top margin pushes the "active zone" past the sticky
      // topbar so a section is only marked active once it has crested into
      // the readable area, not just touched the viewport edge.
      { rootMargin: '-20% 0% -55% 0%', threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    targets.forEach(({ el }) => observer.observe(el))

    // Separate scroll listener for the at-bottom edge case — the observer
    // only fires when an entry's intersection ratio crosses a threshold, so
    // a user who scrolls within the same section won't re-trigger it. We
    // only force-pin to `lastId` when geometry confirms no section is in
    // the active zone; otherwise the previously-observed active section
    // (e.g. Inline Preview after a TOC click) stays selected.
    function onScroll() {
      const geomActive = activeFromGeometry()
      if (geomActive !== null) {
        setActiveId(geomActive)
        return
      }
      if (isAtPageBottom()) setActiveId(lastId)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [visibleSections])

  if (visibleSections.length === 0) return null

  return (
    <>
      {/* Mobile: horizontal sticky chip strip pinned just under the topbar.
          `order-first` floats it above the content column on the single-column
          mobile grid; `lg:hidden` retires it on desktop where the right-rail
          aside takes over. */}
      <nav
        aria-label={t('evaluation.results.tocAriaLabel')}
        className="sticky top-[var(--topbar-height,4rem)] z-30 -mx-4 order-first flex gap-2 overflow-x-auto border-b border-foreground/10 bg-background/85 px-4 py-2.5 backdrop-blur-md md:-mx-6 md:px-6 lg:hidden"
      >
        {visibleSections.map((id) => {
          const active = activeId === id
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors',
                active
                  ? 'border-[color:var(--hibiscus)] bg-[color:var(--hibiscus)]/10 font-medium text-[color:var(--hibiscus)]'
                  : 'border-foreground/15 text-foreground/65 hover:text-foreground'
              )}
            >
              {t(`evaluation.results.toc.${id}`)}
            </a>
          )
        })}
      </nav>

      {/* Desktop: vertical sticky aside in the second grid column. */}
      <aside
        className="sticky top-[calc(var(--topbar-height,4rem)+1.5rem)] hidden h-fit self-start lg:block"
        aria-label={t('evaluation.results.tocAriaLabel')}
      >
        <p className="mono-caption mb-3 text-foreground/55">{t('evaluation.results.tocLabel')}</p>
        <nav>
          <ul className="flex flex-col gap-0.5">
            {visibleSections.map((id) => {
              const active = activeId === id
              return (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'relative block py-1.5 pl-3 text-sm leading-snug transition-colors',
                      active
                        ? 'font-medium text-foreground'
                        : 'text-foreground/55 hover:text-foreground/85'
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-y-1 left-0 w-[2px] rounded-r-full bg-[color:var(--hibiscus)]"
                      />
                    )}
                    {t(`evaluation.results.toc.${id}`)}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
