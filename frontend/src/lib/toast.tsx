'use client'

import { AlertCircle, CheckCircle2, Info, XCircle, type LucideIcon } from 'lucide-react'
import { toast, type Toast } from 'react-hot-toast'

import type { NotificationSeverity } from '@/lib/notification-store'
import { cn } from '@/lib/utils'

type SeverityConfig = {
  Icon: LucideIcon
  color: string
}

const SEVERITY: Record<NotificationSeverity, SeverityConfig> = {
  success: { Icon: CheckCircle2, color: 'text-[color:var(--forest)]' },
  error: { Icon: XCircle, color: 'text-[color:var(--hibiscus)]' },
  warning: { Icon: AlertCircle, color: 'text-[color:var(--warning)]' },
  info: { Icon: Info, color: 'text-[color:var(--primary)]' }
}

type FireToastOptions = {
  title: string
  description: string
  severity?: NotificationSeverity
  durationMs?: number
  /** Passed through to react-hot-toast as the toast id — same id collapses
   *  duplicate emits (used for groupKey dedup in the store). */
  id?: string
}

/**
 * Render a Layak-styled toast through react-hot-toast's `custom` renderer.
 *
 * Single-line dark command-center pill: ringed severity icon + description.
 * The title is dropped on the toast surface (it lives in the bell-popover
 * log) but folded into the aria-label so screen-readers still hear the
 * full event ("Packet Ready: ZIP saved to your downloads."). Enter/leave
 * animation rides on `t.visible` — react-hot-toast flips this 250ms before
 * unmount, so the `transition-*` classes interpolate to the leaving state
 * during dismissal.
 */
export function fireToast({ title, description, severity = 'info', durationMs = 4000, id }: FireToastOptions): void {
  const { Icon, color } = SEVERITY[severity]
  toast.custom(
    (t: Toast) => (
      <div
        className={cn(
          'pointer-events-auto flex items-center justify-center gap-2.5 rounded-2xl px-5 py-3',
          'border border-white/[0.08] bg-[oklch(0.18_0.014_78)] text-[oklch(0.93_0.012_82)]',
          'shadow-[inset_0_1px_0_color-mix(in_oklch,white_6%,transparent),0_22px_56px_-22px_rgba(0,0,0,0.45),0_8px_20px_-12px_rgba(0,0,0,0.3)]',
          'min-w-[260px] max-w-[440px]',
          'transition-all duration-200 ease-out',
          t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        )}
        role="status"
        aria-live="polite"
        aria-label={`${title}: ${description}`}
      >
        <Icon className={cn('size-4 shrink-0', color)} aria-hidden />
        <p className="min-w-0 text-center text-[13.5px] leading-snug">{description}</p>
      </div>
    ),
    {
      duration: durationMs,
      position: 'bottom-center',
      ...(id ? { id } : {})
    }
  )
}
