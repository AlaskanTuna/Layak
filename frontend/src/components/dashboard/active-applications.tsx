'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, FileCheck, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
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
  const completed = useMemo(() => items.filter((item) => item.status === 'complete').slice(0, TOP_N), [items])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('dashboard.activeApplications.title')}</h2>
        <span className="mono-caption text-foreground/45">Drafts</span>
      </div>

      {completed.length === 0 ? (
        <div className="paper-card flex flex-col items-center gap-3 rounded-[16px] px-6 py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-md bg-foreground/[0.05] text-foreground/55">
            <FileCheck className="size-5" aria-hidden />
          </div>
          <p className="mono-caption text-foreground/55">{t('dashboard.activeApplications.empty')}</p>
          <p className="max-w-xs text-xs leading-relaxed text-foreground/65">
            {t('dashboard.activeApplications.emptyDescription')}
          </p>
          <Button
            size="sm"
            render={<Link href="/dashboard/evaluation/upload" />}
            className="mt-1 rounded-full bg-[color:var(--hibiscus)] px-4 text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
          >
            {t('dashboard.activeApplications.startCta')}
            <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {completed.map((item) => (
            <article
              key={item.id}
              className="paper-card group relative rounded-[14px] px-4 py-4 transition-shadow hover:shadow-[0_22px_50px_-22px_color-mix(in_oklch,var(--ink)_30%,transparent)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                    <FileText className="size-4" aria-hidden />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <p className="truncate text-[14px] font-medium text-foreground">
                      {t('dashboard.activeApplications.draftsReady', { count: item.draftCount })}
                    </p>
                    <p className="mono-caption mt-1 truncate text-foreground/55">
                      {t('dashboard.activeApplications.totalRm', { amount: RM.format(item.totalAnnualRM) })} ·{' '}
                      {formatTimestamp(item.createdAt, i18n.language)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <span className="draft-stamp hidden text-[8.5px] sm:inline-flex">DRAFT</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    render={<Link href={`/dashboard/evaluation/results/${item.id}`} />}
                  >
                    {t('dashboard.activeApplications.openCta')}
                    <ArrowRight className="ml-1 size-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
