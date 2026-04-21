'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react'

import { StatusPill } from '@/components/ui/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { EvaluationListItem, EvaluationStatus } from '@/lib/agent-types'
import { authedFetch } from '@/lib/firebase'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

type Props = {
  items: EvaluationListItem[]
  /** Called after a successful delete batch so the parent can refetch. */
  onRefresh: () => void
}

const RM = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

const STATUS_LABEL: Record<EvaluationStatus, string> = {
  complete: 'Complete',
  running: 'Running',
  error: 'Error'
}

const STATUS_TONE: Record<EvaluationStatus, 'approved' | 'processing' | 'rejected'> = {
  complete: 'approved',
  running: 'processing',
  error: 'rejected'
}

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

function formatTimestamp(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} d ago`
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function EvaluationHistoryTable({ items, onRefresh }: Props) {
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const slice = useMemo(
    () => items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [items, safePage]
  )

  const allOnPageSelected = slice.length > 0 && slice.every(item => selected.has(item.id))
  const someOnPageSelected = slice.some(item => selected.has(item.id))

  function toggleOne(id: string, checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function togglePage(checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      for (const item of slice) {
        if (checked) next.add(item.id)
        else next.delete(item.id)
      }
      return next
    })
  }

  async function handleDelete() {
    if (selected.size === 0 || deleting) return
    const ids = Array.from(selected)
    const noun = ids.length === 1 ? 'evaluation' : 'evaluations'
    if (!window.confirm(`Delete ${ids.length} ${noun}? This cannot be undone.`)) return

    setDeleting(true)
    setDeleteError(null)
    const results = await Promise.allSettled(
      ids.map(id =>
        authedFetch(`${getBackendUrl()}/api/evaluations/${id}`, { method: 'DELETE' }).then(res => {
          if (!res.ok) throw new Error(`${id}: ${res.status} ${res.statusText}`)
          return id
        })
      )
    )
    const failed = results.filter(r => r.status === 'rejected')
    setDeleting(false)
    setSelected(new Set())
    onRefresh()
    if (failed.length > 0) {
      setDeleteError(`${failed.length} of ${ids.length} deletions failed; refreshed list shows the survivors.`)
    }
  }

  if (items.length === 0) {
    return (
      <Card className="items-center gap-3 px-6 py-12 text-center sm:py-16">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">No evaluations yet</p>
        <h3 className="font-heading text-lg font-medium">Run your first evaluation to populate this view.</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Upload three documents (or use Manual Entry) and we&rsquo;ll calculate eligibility across federal and
          state schemes.
        </p>
        <div className="mt-2 flex">
          <Button render={<Link href="/dashboard/evaluation/upload" />}>
            Start your first evaluation
            <ArrowRight className="ml-1.5 size-4" aria-hidden />
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">History</h2>
        {selected.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selected.size} selected
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
              Delete {selected.size}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'evaluation' : 'evaluations'}
          </span>
        )}
      </div>

      {deleteError && (
        <p role="alert" className="text-xs text-destructive">{deleteError}</p>
      )}

      <Card className="gap-0 py-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={allOnPageSelected ? 'Deselect all on page' : 'Select all on page'}
                    checked={allOnPageSelected}
                    ref={el => {
                      if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected
                    }}
                    onChange={event => togglePage(event.target.checked)}
                    className="size-4 cursor-pointer rounded border border-input accent-primary"
                  />
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Started</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Annual relief (RM)</th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {slice.map(item => {
                const status = item.status as EvaluationStatus
                const isSelected = selected.has(item.id)
                return (
                  <tr
                    key={item.id}
                    data-selected={isSelected || undefined}
                    className="border-b border-border last:border-0 hover:bg-muted/30 data-[selected]:bg-primary/5"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select evaluation from ${formatTimestamp(item.createdAt)}`}
                        checked={isSelected}
                        onChange={event => toggleOne(item.id, event.target.checked)}
                        className="size-4 cursor-pointer rounded border border-input accent-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={STATUS_TONE[status] ?? 'draft'}>
                        {STATUS_LABEL[status] ?? item.status}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTimestamp(item.createdAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.status === 'complete' ? RM.format(item.totalAnnualRM) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        render={<Link href={`/dashboard/evaluation/results/${item.id}`} />}
                      >
                        View
                        <ArrowRight className="ml-1 size-3.5" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <span>
            Page {safePage + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className={cn(safePage === 0 && 'opacity-50')}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Prev
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className={cn(safePage >= pageCount - 1 && 'opacity-50')}
            >
              Next
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
