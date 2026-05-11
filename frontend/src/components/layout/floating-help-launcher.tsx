'use client'

import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  FileText,
  PlayCircle,
  Sparkles,
  Waypoints,
  X,
  type LucideIcon
} from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type TourStep = {
  /** ID of the DOM element this step should anchor to and highlight. Omit to
   * fall back to anchoring on the launcher button. */
  target?: string
  i18nTitle: string
  i18nBody: string
  icon?: LucideIcon
}

type RouteKey = 'evaluation' | 'upload' | 'results' | 'fallback'

type RouteConfig = {
  tour?: readonly TourStep[]
  /** Fallback single-card content used when a route has no tour. */
  fallback?: { icon: LucideIcon; i18nTitle: string; i18nBody: string }
}

const ROUTES: Record<RouteKey, RouteConfig> = {
  evaluation: {
    tour: [
      {
        target: 'tour-evaluation-stats',
        icon: Sparkles,
        i18nTitle: 'common.help.tours.evaluation.step1.title',
        i18nBody: 'common.help.tours.evaluation.step1.body'
      },
      {
        target: 'tour-evaluation-history',
        icon: FileText,
        i18nTitle: 'common.help.tours.evaluation.step2.title',
        i18nBody: 'common.help.tours.evaluation.step2.body'
      },
      {
        target: 'tour-evaluation-rail',
        icon: Waypoints,
        i18nTitle: 'common.help.tours.evaluation.step3.title',
        i18nBody: 'common.help.tours.evaluation.step3.body'
      }
    ]
  },
  upload: {
    tour: [
      {
        target: 'tour-upload-mode',
        icon: Waypoints,
        i18nTitle: 'common.help.tours.upload.step1.title',
        i18nBody: 'common.help.tours.upload.step1.body'
      },
      {
        target: 'tour-upload-form',
        icon: FileText,
        i18nTitle: 'common.help.tours.upload.step2.title',
        i18nBody: 'common.help.tours.upload.step2.body'
      },
      {
        target: 'tour-upload-submit',
        icon: PlayCircle,
        i18nTitle: 'common.help.tours.upload.step3.title',
        i18nBody: 'common.help.tours.upload.step3.body'
      }
    ]
  },
  results: {
    tour: [
      {
        target: 'overview',
        icon: Sparkles,
        i18nTitle: 'common.help.tours.results.step1.title',
        i18nBody: 'common.help.tours.results.step1.body'
      },
      {
        target: 'schemes',
        icon: FileText,
        i18nTitle: 'common.help.tours.results.step2.title',
        i18nBody: 'common.help.tours.results.step2.body'
      },
      {
        target: 'preview',
        icon: PlayCircle,
        i18nTitle: 'common.help.tours.results.step3.title',
        i18nBody: 'common.help.tours.results.step3.body'
      },
      {
        target: 'download',
        icon: ArrowRight,
        i18nTitle: 'common.help.tours.results.step4.title',
        i18nBody: 'common.help.tours.results.step4.body'
      }
    ]
  },
  fallback: {
    fallback: {
      icon: Waypoints,
      i18nTitle: 'common.help.overview.title',
      i18nBody: 'common.help.overview.body'
    }
  }
}

function getRouteKey(pathname: string | null): RouteKey {
  if (!pathname) return 'fallback'
  if (pathname.includes('/evaluation/upload')) return 'upload'
  if (pathname.includes('/evaluation/results')) return 'results'
  if (pathname.endsWith('/dashboard/evaluation') || pathname.includes('/dashboard/evaluation?')) return 'evaluation'
  return 'fallback'
}

export function FloatingHelpLauncher() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const config = ROUTES[getRouteKey(pathname)]
  const isTour = Array.isArray(config.tour) && config.tour.length > 0
  const tour = config.tour ?? []
  const currentStep = isTour ? tour[stepIndex] : null
  const totalSteps = tour.length

  // Resolve the anchor + apply highlight on step changes. The popover
  // anchors next to the highlighted target when one exists, otherwise it
  // falls back to anchoring on the trigger button.
  useEffect(() => {
    if (!open || !currentStep?.target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnchorEl(null)
      return
    }
    const el = document.getElementById(currentStep.target)
    if (!el) {
       
      setAnchorEl(null)
      return
    }
     
    setAnchorEl(el)
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  }, [open, currentStep])

  function handleOpenChange(next: boolean) {
    if (next) setStepIndex(0)
    setOpen(next)
  }

  function handleNext() {
    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      handleOpenChange(false)
    }
  }

  function handlePrev() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  // Pick which content to render: tour step or static fallback card.
  const Icon = currentStep?.icon ?? config.fallback?.icon ?? CircleHelp
  const title = currentStep
    ? t(currentStep.i18nTitle)
    : config.fallback
      ? t(config.fallback.i18nTitle)
      : ''
  const body = currentStep
    ? t(currentStep.i18nBody)
    : config.fallback
      ? t(config.fallback.i18nBody)
      : ''

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
        side={anchorEl ? 'bottom' : 'top'}
        align={anchorEl ? 'center' : 'end'}
        sideOffset={12}
        anchor={anchorEl ?? undefined}
        className="z-[100] w-[min(22rem,calc(100vw-2rem))] p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-md bg-[color:var(--hibiscus)]/10 text-[color:var(--hibiscus)]">
              <Icon className="size-4" aria-hidden />
            </span>
            <h3 className="font-heading text-base font-semibold tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            aria-label={t('common.help.close')}
            onClick={() => handleOpenChange(false)}
            className="-mr-1 -mt-1 inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-foreground/55 transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
        <p className="mt-3 text-[13px] leading-[1.55] text-foreground/70">{body}</p>

        {isTour && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <span className="mono-caption text-foreground/55 tabular-nums">
              {t('common.help.tours.stepCounter', { current: stepIndex + 1, total: totalSteps })}
            </span>
            <div className="flex items-center gap-1.5">
              {stepIndex > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={handlePrev}>
                  <ArrowLeft className="size-3.5" aria-hidden />
                  {t('common.help.tours.previous')}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="rounded-full bg-[color:var(--hibiscus)] px-3.5 text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
              >
                {stepIndex === totalSteps - 1 ? t('common.help.tours.done') : t('common.help.tours.next')}
                {stepIndex < totalSteps - 1 && <ArrowRight className="ml-1 size-3.5" aria-hidden />}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
