'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type DiffField = {
  label: string
  current: string | null
  proposed: string
}

/**
 * Line-level unified diff renderer.
 *
 * Inputs are pairs of (label, current, proposed). Unchanged labels are
 * rendered as a single neutral row. Changed labels render the current text
 * as a deletion (`-`) and the proposed text as an addition (`+`), each on
 * its own line, matching the v1 scope cut in plan.md (no side-by-side).
 *
 * `current === null` is the "no existing rule found" case — common for
 * brand-new schemes; renders as an addition only.
 */
export function UnifiedDiff({ fields }: { fields: DiffField[] }) {
  const { t } = useTranslation()
  const rows = useMemo(() => fields.filter((f) => f.proposed.trim() || (f.current ?? '').trim()), [fields])

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="paper-card overflow-hidden rounded-[16px]">
      <header className="border-b border-foreground/10 bg-card/40 px-4 py-3">
        <p className="mono-caption text-foreground/55">{t('admin.discovery.detail.diffTitle')}</p>
      </header>
      <ul className="font-mono text-[13px] leading-[1.55]">
        {rows.map((f, idx) => {
          const current = (f.current ?? '').trim()
          const proposed = f.proposed.trim()
          const unchanged = current === proposed
          return (
            <li key={`${f.label}-${idx}`} className="border-b border-foreground/5 px-4 py-3 last:border-b-0">
              <p className="mono-caption mb-1 text-foreground/55">{f.label}</p>
              {unchanged ? (
                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-foreground/80">
                  {proposed || '—'}
                </pre>
              ) : (
                <div className="flex flex-col gap-1">
                  {current && <DiffLine kind="del">{current}</DiffLine>}
                  {proposed && <DiffLine kind="add">{proposed}</DiffLine>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DiffLine({ kind, children }: { kind: 'add' | 'del'; children: string }) {
  return (
    <pre
      className={cn(
        'overflow-x-auto whitespace-pre-wrap break-words rounded-md border px-2 py-1.5',
        kind === 'add'
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300'
          : 'border-destructive/30 bg-destructive/10 text-destructive'
      )}
    >
      <span aria-hidden className="mr-2 select-none opacity-70">
        {kind === 'add' ? '+' : '-'}
      </span>
      {children}
    </pre>
  )
}
