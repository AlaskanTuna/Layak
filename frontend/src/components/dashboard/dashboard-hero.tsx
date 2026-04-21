'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { QuotaMeter } from '@/components/dashboard/quota-meter'
import { PageHeading } from '@/components/layout/page-heading'
import { Button } from '@/components/ui/button'

type Props = {
  name?: string
}

export function DashboardHero({ name }: Props) {
  const { t } = useTranslation()
  const greeting = name ? t('dashboard.hero.greetingWithName', { name }) : t('dashboard.hero.greeting')

  return (
    <PageHeading
      eyebrow={
        <>
          <ShieldCheck className="size-3.5" aria-hidden />
          {t('dashboard.hero.eyebrow')}
        </>
      }
      title={greeting}
      description={t('dashboard.hero.description', {
        defaultValue:
          'Run a fresh eligibility check, review your cited matches, and move from uploaded documents to clean draft packets without losing trust.'
      })}
      action={
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <QuotaMeter />
          <Button render={<Link href="/dashboard/evaluation/upload" />} size="lg" className="rounded-full px-5">
            Start evaluation
            <ArrowRight className="ml-1.5 size-4" aria-hidden />
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 pt-1 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-background/72 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Coverage</p>
          <p className="mt-2 font-heading text-lg font-semibold text-foreground">3 live schemes</p>
          <p className="mt-1 text-sm text-muted-foreground">STR, JKM Warga Emas, and LHDN reliefs.</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-background/72 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Transparency</p>
          <p className="mt-2 inline-flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Source-cited outputs
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Every number traces back to a rule passage.</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-background/72 px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Submission model</p>
          <p className="mt-2 font-heading text-lg font-semibold text-foreground">Drafts only</p>
          <p className="mt-1 text-sm text-muted-foreground">Layak guides you, then you submit manually.</p>
        </div>
      </div>
    </PageHeading>
  )
}
