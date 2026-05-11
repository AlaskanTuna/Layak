'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { StatusPill } from '@/components/ui/status-pill'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { EvaluationListItem, EvaluationStatus } from '@/lib/agent-types'
import { authedFetch } from '@/lib/firebase'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 5

type Props = {
  items: EvaluationListItem[]
  /** Called after a successful delete batch so the parent can refetch. */
  onRefresh: () => void
}

const RM = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

const STATUS_TONE: Record<EvaluationStatus, 'approved' | 'processing' | 'rejected'> = {
  complete: 'approved',
  running: 'processing',
  error: 'rejected'
}

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

function formatTimestamp(value: string | null, t: TFunction): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return t('evaluation.history.timestamp.justNow')
  if (diffMin < 60) return t('evaluation.history.timestamp.minutesAgo', { count: diffMin })
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return t('evaluation.history.timestamp.hoursAgo', { count: diffHr })
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return t('evaluation.history.timestamp.daysAgo', { count: diffDay })
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function EvaluationHistoryTable({ items, onRefresh }: Props) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const slice = useMemo(() => items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE), [items, safePage])

  const allOnPageSelected = slice.length > 0 && slice.every((item) => selected.has(item.id))
  const someOnPageSelected = slice.some((item) => selected.has(item.id))

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function togglePage(checked: boolean) {
    setSelected((prev) => {
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
    if (!window.confirm(t('evaluation.history.deleteConfirm', { count: ids.length }))) return

    setDeleting(true)
    setDeleteError(null)
    const results = await Promise.allSettled(
      ids.map((id) =>
        authedFetch(`${getBackendUrl()}/api/evaluations/${id}`, { method: 'DELETE' }).then((res) => {
          if (!res.ok) throw new Error(`${id}: ${res.status} ${res.statusText}`)
          return id
        })
      )
    )
    const failed = results.filter((r) => r.status === 'rejected')
    setDeleting(false)
    setSelected(new Set())
    onRefresh()
    if (failed.length > 0) {
      setDeleteError(t('evaluation.history.deletePartialFailure', { failed: failed.length, total: ids.length }))
    }
  }

  if (items.length === 0) {
    return (
      <div className="paper-card flex flex-col items-center gap-3 rounded-[16px] px-6 py-12 text-center sm:py-16">
        <p className="mono-caption text-foreground/55">{t('evaluation.history.emptyEyebrow')}</p>
        <h3 className="font-heading text-lg font-semibold tracking-tight">{t('evaluation.history.emptyTitle')}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{t('evaluation.history.emptyBody')}</p>
        <div className="mt-2 flex">
          <Button render={<Link href="/dashboard/evaluation/upload" />}>
            {t('evaluation.history.emptyCta')}
            <ArrowRight className="ml-1.5 size-4" aria-hidden />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('evaluation.history.title')}</h2>
        {selected.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('evaluation.history.selected', { count: selected.size })}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
              disabled={deleting}
            >
              {t('common.button.cancel')}
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
              {t('evaluation.history.deleteAction', { count: selected.size })}
            </Button>
          </div>
        ) : null}
      </div>

      {deleteError && (
        <p role="alert" className="text-xs text-destructive">
          {deleteError}
        </p>
      )}

      <div className="paper-card overflow-hidden rounded-[14px]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <th scope="col" className="w-10 px-4 py-2.5">
                  <Checkbox
                    aria-label={t(
                      allOnPageSelected ? 'evaluation.history.deselectPageAria' : 'evaluation.history.selectPageAria'
                    )}
                    checked={!allOnPageSelected && someOnPageSelected ? 'indeterminate' : allOnPageSelected}
                    onCheckedChange={togglePage}
                    className="cursor-pointer"
                  />
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {t('evaluation.history.columnStatus')}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  {t('evaluation.history.columnStarted')}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  {t('evaluation.history.columnSchemesEligible')}
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  {t('evaluation.history.columnAnnualRelief')}
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  <span className="sr-only">{t('evaluation.history.view')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {slice.map((item) => {
                const status = item.status as EvaluationStatus
                const isSelected = selected.has(item.id)
                const timestampLabel = formatTimestamp(item.createdAt, t)
                return (
                  <tr
                    key={item.id}
                    data-selected={isSelected || undefined}
                    className="border-b border-border last:border-0 hover:bg-muted/30 data-[selected]:bg-primary/5"
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        aria-label={t('evaluation.history.selectRowAria', { timestamp: timestampLabel })}
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleOne(item.id, checked)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={STATUS_TONE[status] ?? 'draft'}>
                        {t(`evaluation.history.status.${status}`, { defaultValue: item.status })}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{timestampLabel}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.status === 'complete' ? item.draftCount : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {item.status === 'complete' ? RM.format(item.totalAnnualRM) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        render={<Link href={`/dashboard/evaluation/results/${item.id}`} />}
                      >
                        {t('evaluation.history.view')}
                        <ArrowRight className="ml-1 size-3.5" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <span>{t('evaluation.history.pagination', { page: safePage + 1, total: pageCount })}</span>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className={cn(safePage === 0 && 'opacity-50')}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              {t('evaluation.history.prev')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className={cn(safePage >= pageCount - 1 && 'opacity-50')}
            >
              {t('evaluation.history.next')}
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
