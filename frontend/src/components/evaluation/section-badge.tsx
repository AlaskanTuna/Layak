'use client'

import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type Variant = 'required' | 'optional' | 'selected'

type Props =
  | { required: boolean; variant?: undefined; className?: string }
  | { variant: Variant; required?: undefined; className?: string }

/**
 * Uniform section pill used across the intake / path-card UI so every surface
 * uses the same visual shape for Required / Optional / Selected state.
 *
 * API back-compat: legacy callers pass `required={true|false}` and get the
 * amber/emerald pair. New callers use `variant="selected"` for the darker-
 * accent emerald pill that marks the currently-chosen path card. Phase 9 i18n
 * — each label pulls from `common.sectionBadge.*`.
 */
export function SectionBadge(props: Props) {
  const { t } = useTranslation()
  const variant: Variant = props.variant ?? (props.required ? 'required' : 'optional')

  if (variant === 'required') {
    // Neutral warm-ink pill — decoupled from the forest/teal active-tab
    // indicator and from any severity colour. "Required" is the baseline
    // here; we don't want it to grab attention, just to mark presence.
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-foreground/20 bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/70',
          props.className
        )}
      >
        {t('common.sectionBadge.required')}
      </span>
    )
  }

  if (variant === 'selected') {
    // Darker-accent emerald — keeps the Optional pill's shape but leans in
    // with a deeper saturated fill + border so it reads as "active" next to
    // a card title, not "default-ish optional."
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-emerald-600/50 bg-emerald-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-900 dark:border-emerald-400/60 dark:bg-emerald-400/20 dark:text-emerald-100',
          props.className
        )}
      >
        {t('common.sectionBadge.selected')}
      </span>
    )
  }

  // Optional — even lighter, outlined-only. Communicates "skip if you want."
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-foreground/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/55',
        props.className
      )}
    >
      {t('common.sectionBadge.optional')}
    </span>
  )
}
