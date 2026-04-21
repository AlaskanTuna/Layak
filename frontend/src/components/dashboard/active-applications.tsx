'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, FileCheck, FileText, ShieldCheck } from 'lucide-react'
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
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ActiveApplications({ items }: Props) {
  const { t, i18n } = useTranslation()
  const completed = useMemo(() => items.filter(item => item.status === 'complete').slice(0, TOP_N), [items])

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-tight">{t('dashboard.activeApplications.title')}</h2>

      {completed.length === 0 ? (
        <div className="hero-sheen flex flex-col items-center gap-4 rounded-[1.5rem] px-6 py-8 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileCheck className="size-5" aria-hidden />
          </div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Ready when you are</p>
          <p className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            No draft packets yet.
          </p>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            {t('dashboard.activeApplications.emptyDescription')}
          </p>
          <div className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
            {['Upload 3 docs', 'Get ranked matches', 'Download draft packets'].map(label => (
              <div key={label} className="rounded-2xl border border-border/80 bg-background/72 px-4 py-3 text-left shadow-sm">
                <ShieldCheck className="mb-2 size-4 text-primary" aria-hidden />
                <p className="text-sm font-medium text-foreground">{label}</p>
              </div>
            ))}
          </div>
          <Button size="lg" render={<Link href="/dashboard/evaluation/upload" />} className="rounded-full px-5">
            {t('dashboard.activeApplications.startCta', { defaultValue: 'Start your first evaluation' })}
            <ArrowRight className="ml-1.5 size-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {completed.map(item => (
            <Card key={item.id} className="border border-border/70 bg-background/78 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileText className="size-4" aria-hidden />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">
                      {t('dashboard.activeApplications.draftsReady', { count: 3, defaultValue: '3 draft packets ready' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.activeApplications.totalRm', {
                        amount: RM.format(item.totalAnnualRM),
                        defaultValue: `RM ${RM.format(item.totalAnnualRM)} potential relief`
                      })}{' '}
                      • {formatTimestamp(item.createdAt, i18n.language)}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" render={<Link href={`/dashboard/evaluation/results/${item.id}`} />}>
                  {t('dashboard.activeApplications.openCta', { defaultValue: 'Open' })}
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
