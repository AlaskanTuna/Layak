'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, FileCheck, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { EvaluationListItem } from '@/lib/agent-types'

const TOP_N = 3

const RM = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

type Props = {
  items: EvaluationListItem[]
}

function formatTimestamp(value: string | null, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * "Active draft packets" — top N most recent completed evaluations whose
 * generated draft application PDFs are ready to lodge with the agencies. Each
 * card deep-links to the persisted results page where the user can re-
 * download the packet. Empty state when no completed evaluations exist.
 */
export function ActiveApplications({ items }: Props) {
  const { t, i18n } = useTranslation()
  const completed = useMemo(
    () => items.filter(item => item.status === 'complete').slice(0, TOP_N),
    [items]
  )

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        {t('dashboard.activeApplications.title')}
      </h2>

      {completed.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <FileCheck className="size-5" aria-hidden />
          </div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t('dashboard.activeApplications.empty')}
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            {t('dashboard.activeApplications.emptyDescription')}
          </p>
          <Button size="sm" render={<Link href="/dashboard/evaluation/upload" />}>
            {t('dashboard.activeApplications.startCta')}
            <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {completed.map(item => (
            <Card key={item.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="size-4" aria-hidden />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <p className="truncate text-sm font-medium">
                      {t('dashboard.activeApplications.draftsReady', { count: item.draftCount })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t('dashboard.activeApplications.totalRm', {
                        amount: RM.format(item.totalAnnualRM)
                      })}{' '}
                      · {formatTimestamp(item.createdAt, i18n.language)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  render={<Link href={`/dashboard/evaluation/results/${item.id}`} />}
                >
                  {t('dashboard.activeApplications.openCta')}
                  <ArrowRight className="ml-1 size-3.5" aria-hidden />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
