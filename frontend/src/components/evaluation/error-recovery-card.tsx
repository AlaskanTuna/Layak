'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  Clock,
  KeyRound,
  ListChecks,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { ErrorCategory } from '@/lib/agent-types'

type Props = {
  message: string
  /** Backend-categorised error slug from the SSE `ErrorEvent.category`.
   * `null` routes to the generic "something broke" branch. */
  category?: ErrorCategory | null
  onUseSamples: () => void
  onReset: () => void
  /** Retry the pipeline with the same inputs — wired by the upload client
   * for transient categories (service_unavailable, deadline_exceeded). */
  onRetry?: () => void
  /** Surface a "Switch to Manual Entry" CTA — wired by the upload client.
   * When omitted and the category calls for it, the card silently drops the CTA
   * rather than rendering a dead button. */
  onSwitchToManual?: () => void
}

// Category → category-tailored recovery presentation.
// Each spec describes the icon + i18n copy key prefix + CTA composition the
// card renders. Unknown / null category falls through to `generic`.
type CtaKind = 'retry' | 'manual' | 'samples' | 'settings' | 'reset'

type CategorySpec = {
  /** i18n key prefix under `evaluation.error.categories.<prefix>.{title,body,primaryCta,secondaryCta?}`. */
  key: string
  icon: LucideIcon
  /** Ordered list of CTAs. The first one renders as the primary button; the
   * rest as `variant="outline"`. Reset is ALWAYS appended as the final CTA so
   * the user always has a start-over escape hatch. */
  ctas: CtaKind[]
}

const CATEGORY_SPEC: Record<ErrorCategory | 'generic', CategorySpec> = {
  quota_exhausted: {
    key: 'quotaExhausted',
    icon: Clock,
    ctas: ['manual']
  },
  service_unavailable: {
    key: 'serviceUnavailable',
    icon: RefreshCcw,
    ctas: ['retry', 'samples']
  },
  deadline_exceeded: {
    key: 'deadlineExceeded',
    icon: Clock,
    ctas: ['retry', 'manual']
  },
  permission_denied: {
    key: 'permissionDenied',
    icon: ShieldAlert,
    ctas: ['settings']
  },
  extract_validation: {
    key: 'extractValidation',
    icon: KeyRound,
    ctas: ['manual', 'samples']
  },
  generic: {
    key: 'generic',
    icon: AlertTriangle,
    ctas: ['samples']
  }
}

const CTA_ICONS: Record<CtaKind, LucideIcon> = {
  retry: RefreshCcw,
  manual: ListChecks,
  samples: Sparkles,
  settings: KeyRound,
  reset: RotateCcw
}

export function ErrorRecoveryCard({ message, category, onUseSamples, onReset, onRetry, onSwitchToManual }: Props) {
  const { t } = useTranslation()
  const spec = CATEGORY_SPEC[category ?? 'generic']
  const Icon = spec.icon
  const keyPrefix = `evaluation.error.categories.${spec.key}`

  // Filter CTAs whose handler wasn't wired by the caller — keeps the card
  // from rendering dead buttons on routes that intentionally omit one.
  const activeCtas = spec.ctas.filter((kind) => {
    if (kind === 'retry') return onRetry !== undefined
    if (kind === 'manual') return onSwitchToManual !== undefined
    return true
  })
  const ctas: CtaKind[] = [...activeCtas, 'reset']

  function handleClick(kind: CtaKind) {
    if (kind === 'retry' && onRetry) return onRetry()
    if (kind === 'manual' && onSwitchToManual) return onSwitchToManual()
    if (kind === 'samples') return onUseSamples()
    if (kind === 'reset') return onReset()
  }

  function ctaLabel(kind: CtaKind): string {
    if (kind === 'reset') return t('common.button.startOver')
    return t(`evaluation.error.ctas.${kind}`)
  }

  return (
    <section className="paper-card relative isolate overflow-hidden rounded-[14px] p-5">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70"
      />
      <header className="mb-4 flex flex-col gap-1.5 border-b border-foreground/10 pb-4">
        <p className="mono-caption text-[color:var(--hibiscus)]">Recovery</p>
        <h3 className="flex items-center gap-2 font-heading text-[15px] font-semibold tracking-tight text-[color:var(--hibiscus)]">
          <Icon className="size-4" aria-hidden />
          {t(`${keyPrefix}.title`)}
        </h3>
        <p className="text-[13.5px] leading-[1.55] text-foreground/70">{message}</p>
      </header>
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-foreground/68">{t(`${keyPrefix}.body`)}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {ctas.map((kind, index) => {
            const CtaIcon = CTA_ICONS[kind]
            const primary = index === 0
            const label = ctaLabel(kind)
            const primaryClasses =
              'flex-1 rounded-full bg-[color:var(--hibiscus)] text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92'
            const outlineClasses = 'flex-1 rounded-full'
            if (kind === 'settings') {
              return (
                <Button
                  key={kind}
                  type="button"
                  variant={primary ? 'default' : 'outline'}
                  className={primary ? primaryClasses : outlineClasses}
                  render={<Link href="/settings" />}
                >
                  <CtaIcon className="mr-2 size-4" aria-hidden />
                  {label}
                </Button>
              )
            }
            return (
              <Button
                key={kind}
                type="button"
                variant={primary ? 'default' : 'outline'}
                onClick={() => handleClick(kind)}
                className={primary ? primaryClasses : outlineClasses}
              >
                <CtaIcon className="mr-2 size-4" aria-hidden />
                {label}
              </Button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
