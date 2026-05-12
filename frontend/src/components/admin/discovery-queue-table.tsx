'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CandidateStatusPill } from '@/components/admin/status-pill-status'
import type { CandidateRow } from '@/lib/admin-discovery'

function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`
}

export function DiscoveryQueueTable({ rows }: { rows: CandidateRow[] }) {
  const { t } = useTranslation()
  if (rows.length === 0) {
    return (
      <p className="rounded-[12px] border border-foreground/10 bg-card/40 p-6 text-center text-sm text-foreground/60">
        {t('admin.discovery.queue.empty')}
      </p>
    )
  }
  return (
    <div className="paper-card overflow-hidden rounded-[16px]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-foreground/10 bg-card/40 text-left">
            <tr>
              <th scope="col" className="mono-caption px-4 py-3 text-foreground/55">
                {t('admin.discovery.queue.columns.name')}
              </th>
              <th scope="col" className="mono-caption px-4 py-3 text-foreground/55">
                {t('admin.discovery.queue.columns.agency')}
              </th>
              <th scope="col" className="mono-caption px-4 py-3 text-foreground/55">
                {t('admin.discovery.queue.columns.source')}
              </th>
              <th scope="col" className="mono-caption px-4 py-3 text-right text-foreground/55">
                {t('admin.discovery.queue.columns.confidence')}
              </th>
              <th scope="col" className="mono-caption px-4 py-3 text-foreground/55">
                {t('admin.discovery.queue.columns.status')}
              </th>
              <th scope="col" className="mono-caption px-4 py-3 text-right text-foreground/55">
                {t('admin.discovery.queue.columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.candidate_id}
                className="border-b border-foreground/5 transition-colors last:border-b-0 hover:bg-accent/30"
              >
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-foreground">{row.name}</p>
                  <p className="mono-caption text-foreground/55">{row.source_id}</p>
                </td>
                <td className="px-4 py-3 align-top text-foreground/80">{row.agency}</td>
                <td className="px-4 py-3 align-top text-foreground/80">{row.scheme_id ?? '—'}</td>
                <td className="px-4 py-3 align-top text-right font-mono text-foreground/80 tabular-nums">
                  {formatPercent(row.confidence)}
                </td>
                <td className="px-4 py-3 align-top">
                  <CandidateStatusPill status={row.status} />
                </td>
                <td className="px-4 py-3 align-top text-right">
                  <Link
                    href={`/dashboard/discovery/${row.candidate_id}`}
                    className="inline-flex items-center gap-1 text-[color:var(--primary)] hover:underline"
                  >
                    {t('admin.discovery.queue.review')}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
