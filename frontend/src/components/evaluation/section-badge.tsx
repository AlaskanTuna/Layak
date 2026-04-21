'use client'

import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type Props = {
  required: boolean
  className?: string
}

/**
 * Uniform Required (amber) / Optional (green) pill used next to section titles
 * on both the UploadWidget and ManualEntryForm so the two intake paths look
 * visually identical.
 */
export function SectionBadge({ required, className }: Props) {
  const { t } = useTranslation()
  return required ? (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400',
        className
      )}
    >
      {t('common.sectionBadge.required')}
    </span>
  ) : (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400',
        className
      )}
    >
      {t('common.sectionBadge.optional')}
    </span>
  )
}
