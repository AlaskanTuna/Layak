'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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

  // Sections appear/disappear as the pipeline progresses (e.g. `preview` and
  // `download` only mount once `isComplete`; `required` only when at least one
  // required-contribution match exists). Stored `activeId` may briefly point
  // at a now-missing section — clamp it for rendering rather than via an
  // effect so we don't trigger cascading re-renders. Observer/scroll handlers
  // will overwrite it with a valid id on the next tick.
  const displayedActiveId: TocSectionId = visibleSections.includes(activeId)
    ? activeId
    : (visibleSections[0] ?? activeId)

  // Click-lock: when the user clicks a TOC entry, we set activeId to that id
  // immediately and suppress observer/scroll updates for a short window so
  // the smooth-scroll animation doesn't fight the user's intent. This matters
  // most at end-of-page where a short trailing section (Download Packet) can
  // never crest into the rootMargin-defined active zone — geometry alone
  // would always prefer the preceding section.
  const clickLockUntilRef = useRef<number>(0)

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

    // Pick the section that best matches the current scroll position:
    //   - At end-of-page, prefer the *bottom-most* section in viewport so a
    //     trailing short section (Download Packet) wins over a tall preceding
    //     one (Inline Preview) when both happen to be visible.
    //   - Otherwise prefer the topMost section in the 20–45 % active strip,
    //     mirroring the IntersectionObserver's rootMargin geometry.
    function activeFromGeometry(): TocSectionId | null {
      const atBottom = isAtPageBottom()
      if (atBottom) {
        let last: { id: TocSectionId; top: number } | null = null
        for (const { id, el } of targets) {
          const r = el.getBoundingClientRect()
          if (r.bottom > 0 && r.top < window.innerHeight) {
            if (last === null || r.top > last.top) last = { id, top: r.top }
          }
        }
        return last?.id ?? null
      }
      const top = window.innerHeight * 0.2
      const bottom = window.innerHeight * 0.45
      let best: { id: TocSectionId; top: number } | null = null
      for (const { id, el } of targets) {
        const r = el.getBoundingClientRect()
        if (r.bottom > top && r.top < bottom) {
          if (best === null || r.top < best.top) best = { id, top: r.top }
        }
      }
      return best?.id ?? null
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < clickLockUntilRef.current) return
        const intersecting = entries.filter((e) => e.isIntersecting)
        if (intersecting.length > 0) {
          // At-bottom inverts the pick: take the bottom-most so a trailing
          // short section can win even when a tall preceding section is also
          // still partially in view.
          const atBottom = isAtPageBottom()
          const pick = intersecting.reduce((best, entry) => {
            const a = entry.boundingClientRect.top
            const b = best.boundingClientRect.top
            return atBottom ? (a > b ? entry : best) : a < b ? entry : best
          })
          const id = (pick.target as HTMLElement).id as TocSectionId
          if (TOC_SECTIONS.includes(id)) {
            setActiveId(id)
            return
          }
        }
        // No section in the rootMargin'd active zone — pin to lastId so the
        // short trailing section is still reachable at end-of-page.
        if (isAtPageBottom()) setActiveId(lastId)
      },
      { rootMargin: '-20% 0% -55% 0%', threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    targets.forEach(({ el }) => observer.observe(el))

    function onScroll() {
      if (Date.now() < clickLockUntilRef.current) return
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

  // Handle TOC link clicks directly so the active state reflects user intent
  // regardless of whether the clicked section can be brought into the
  // observer's active zone (e.g. a short trailing section at end-of-page).
  const handleTocClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: TocSectionId) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    setActiveId(id)
    // 800 ms covers the smooth-scroll animation; observer/scroll callbacks
    // skip during this window, then resume normal geometry tracking.
    clickLockUntilRef.current = Date.now() + 800
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (typeof history !== 'undefined' && history.pushState) {
      history.pushState(null, '', `#${id}`)
    }
  }, [])

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
          const active = displayedActiveId === id
          return (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => handleTocClick(e, id)}
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
              const active = displayedActiveId === id
              return (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => handleTocClick(e, id)}
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
