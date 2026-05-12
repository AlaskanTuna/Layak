'use client'

import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import type { QueueFilter } from '@/lib/admin-discovery'

const FILTERS: QueueFilter[] = ['all', 'pending', 'approved', 'changes_requested', 'rejected']

export function DiscoveryFilterChips({
  active,
  onChange
}: {
  active: QueueFilter
  onChange: (next: QueueFilter) => void
}) {
  const { t } = useTranslation()
  return (
    <div role="tablist" aria-label="filter" className="flex flex-wrap gap-2">
      {FILTERS.map((f) => {
        const isActive = f === active
        return (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(f)}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
                : 'border-border bg-card/60 text-foreground/70 hover:bg-accent/40'
            )}
          >
            {t(`admin.discovery.filters.${f}`)}
          </button>
        )
      })}
    </div>
  )
}
