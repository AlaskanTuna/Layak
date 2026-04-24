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
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400',
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

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400',
        props.className
      )}
    >
      {t('common.sectionBadge.optional')}
    </span>
  )
}
