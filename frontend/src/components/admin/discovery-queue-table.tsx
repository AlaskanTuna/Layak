'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpDown, ChevronRight, Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CandidateStatusPill } from '@/components/admin/status-pill-status'
import { ConfidenceMeter } from '@/components/admin/confidence-meter'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { deleteCandidate, type CandidateRow } from '@/lib/admin-discovery'
import { notificationStore } from '@/lib/notification-store'

type SortKey = 'name' | 'confidence' | 'agency'
type SortDir = 'asc' | 'desc'

type Props = {
  rows: CandidateRow[]
  /** Called after a successful delete batch so the parent can refetch the queue. */
  onRefresh: () => void
  /** When the parent filters in JS, pass the unfiltered count so the table
   * footer can show "Showing X of Y". */
  totalCount?: number
}

export function DiscoveryQueueTable({ rows, onRefresh, totalCount }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'name', dir: 'asc' })

  const sortedRows = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      let cmp = 0
      if (sort.key === 'confidence') cmp = a.confidence - b.confidence
      else if (sort.key === 'agency') cmp = a.agency.localeCompare(b.agency)
      else cmp = a.name.localeCompare(b.name)
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sort])

  const allSelected = sortedRows.length > 0 && sortedRows.every((row) => selected.has(row.candidate_id))
  const someSelected = sortedRows.some((row) => selected.has(row.candidate_id))

  const selectedRows = useMemo(() => sortedRows.filter((row) => selected.has(row.candidate_id)), [sortedRows, selected])

  function toggleOne(candidateId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(candidateId)
      else next.delete(candidateId)
      return next
    })
  }

  function togglePage(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const row of sortedRows) {
        if (checked) next.add(row.candidate_id)
        else next.delete(row.candidate_id)
      }
      return next
    })
  }

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  async function handleDelete() {
    if (selected.size === 0 || deleting) return
    const ids = Array.from(selected)
    if (!window.confirm(t('admin.discovery.queue.deleteConfirm', { count: ids.length }))) return

    setDeleting(true)
    setDeleteError(null)
    const results = await Promise.allSettled(ids.map((id) => deleteCandidate(id)))
    const failed = results.filter((r) => r.status === 'rejected')
    const deletedCount = ids.length - failed.length
    setDeleting(false)
    setSelected(new Set())
    onRefresh()
    if (failed.length > 0) {
      const message = t('admin.discovery.queue.deletePartialFailure', {
        deleted: deletedCount,
        total: ids.length,
        failed: failed.length
      })
      setDeleteError(message)
      notificationStore.notify({
        title: t('admin.discovery.notify.deleteFailure.title'),
        description: message,
        severity: 'error',
        toast: true
      })
    } else {
      notificationStore.notify({
        title: t('admin.discovery.notify.deleteSuccess.title'),
        description: t('admin.discovery.notify.deleteSuccess.body', { count: deletedCount }),
        severity: 'success',
        toast: true
      })
    }
  }

  if (sortedRows.length === 0) {
    return (
      <p className="rounded-[12px] border border-foreground/10 bg-card/40 p-6 text-center text-sm text-foreground/60">
        {t('admin.discovery.queue.empty')}
      </p>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            {t('admin.discovery.queue.selected', { count: selected.size })}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={() => setSelected(new Set())} disabled={deleting}>
            {t('common.button.cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-1.5"
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-3.5" aria-hidden />
            )}
            {t('admin.discovery.queue.deleteAction', { count: selected.size })}
          </Button>
        </div>
      )}

      {deleteError && (
        <p role="alert" className="text-xs text-destructive">
          {deleteError}
        </p>
      )}

      <div className="paper-card overflow-hidden rounded-[16px]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-foreground/10 bg-card/40 text-left">
              <tr>
                <th scope="col" className="w-10 px-4 py-3">
                  <Checkbox
                    aria-label={t(
                      allSelected ? 'admin.discovery.queue.deselectPageAria' : 'admin.discovery.queue.selectPageAria'
                    )}
                    checked={!allSelected && someSelected ? 'indeterminate' : allSelected}
                    onCheckedChange={togglePage}
                    className="cursor-pointer"
                  />
                </th>
                <SortableTh
                  label={t('admin.discovery.queue.columns.name')}
                  sortKey="name"
                  current={sort}
                  onClick={toggleSort}
                />
                <SortableTh
                  label={t('admin.discovery.queue.columns.agency')}
                  sortKey="agency"
                  current={sort}
                  onClick={toggleSort}
                />
                <th scope="col" className="mono-caption px-4 py-3 text-foreground/55">
                  {t('admin.discovery.queue.columns.source')}
                </th>
                <SortableTh
                  label={t('admin.discovery.queue.columns.confidence')}
                  sortKey="confidence"
                  current={sort}
                  onClick={toggleSort}
                />
                <th scope="col" className="mono-caption px-4 py-3 text-foreground/55">
                  {t('admin.discovery.queue.columns.status')}
                </th>
                <th scope="col" className="mono-caption px-4 py-3 text-right text-foreground/55">
                  {t('admin.discovery.queue.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const isSelected = selected.has(row.candidate_id)
                return (
                  <tr
                    key={row.candidate_id}
                    data-selected={isSelected || undefined}
                    className="border-b border-foreground/5 transition-colors last:border-b-0 hover:bg-accent/30 data-[selected]:bg-primary/5"
                  >
                    <td className="px-4 py-3 align-middle">
                      <Checkbox
                        aria-label={t('admin.discovery.queue.selectRowAria', { name: row.name })}
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleOne(row.candidate_id, checked)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="mono-caption text-foreground/55">{row.source_id}</p>
                    </td>
                    <td className="px-4 py-3 align-middle text-foreground/80">{row.agency}</td>
                    <td className="px-4 py-3 align-middle text-foreground/80">{row.scheme_id ?? '—'}</td>
                    <td className="px-4 py-3 align-middle">
                      <ConfidenceMeter confidence={row.confidence} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <CandidateStatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/dashboard/discovery/${row.candidate_id}`} />}
                        className="gap-1 text-[color:var(--primary)] hover:text-[color:var(--primary)]"
                      >
                        {t('admin.discovery.queue.review')}
                        <ChevronRight className="size-3.5" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="mono-caption text-foreground/55" aria-live="polite">
          {t('admin.discovery.queue.paginationSummary', {
            shown: sortedRows.length,
            total: totalCount ?? sortedRows.length
          })}
        </p>
        {selectedRows.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {t('admin.discovery.queue.selectedSummary', { count: selectedRows.length })}
          </p>
        )}
      </div>
    </section>
  )
}

function SortableTh({
  label,
  sortKey,
  current,
  onClick
}: {
  label: string
  sortKey: SortKey
  current: { key: SortKey; dir: SortDir }
  onClick: (key: SortKey) => void
}) {
  const isActive = current.key === sortKey
  const sortValue: 'ascending' | 'descending' | 'none' = isActive
    ? current.dir === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none'
  return (
    <th scope="col" aria-sort={sortValue} className="mono-caption px-4 py-3 text-foreground/55">
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1 transition-colors',
          isActive ? 'text-foreground/80' : 'hover:text-foreground/75'
        )}
      >
        {label}
        <ArrowUpDown className={cn('size-3', isActive ? 'opacity-80' : 'opacity-40')} aria-hidden />
      </button>
    </th>
  )
}
