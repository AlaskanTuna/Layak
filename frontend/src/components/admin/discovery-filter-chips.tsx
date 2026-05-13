'use client'

import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import type { QueueFilter } from '@/lib/admin-discovery'

const FILTERS: QueueFilter[] = ['all', 'pending', 'approved', 'changes_requested', 'rejected']

type Props = {
  active: QueueFilter
  onChange: (next: QueueFilter) => void
  /** Optional per-filter counts. When provided, each tab shows the count
   * inline so the moderator can triage the queue at a glance. */
  counts?: Partial<Record<QueueFilter, number>>
}

/**
 * Newspaper-style underline tabs for filtering the moderation queue.
 * Matches the intake-mode-toggle pattern used on the evaluation upload page.
 */
export function DiscoveryFilterChips({ active, onChange, counts }: Props) {
  const { t } = useTranslation()
  return (
    <div role="tablist" aria-label="filter" className="border-b border-foreground/10">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {FILTERS.map((f) => {
          const isActive = f === active
          const count = counts?.[f]
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(f)}
              className={cn(
                'relative inline-flex cursor-pointer items-center gap-2 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-foreground/55 hover:text-foreground/80'
              )}
            >
              <span>{t(`admin.discovery.filters.${f}`)}</span>
              {count !== undefined && (
                <span
                  className={cn(
                    'mono-caption tabular-nums',
                    isActive ? 'text-foreground/60' : 'text-foreground/45'
                  )}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full bg-[color:var(--hibiscus)]"
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
