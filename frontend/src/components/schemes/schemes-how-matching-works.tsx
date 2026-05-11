'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

/**
 * Trailing callout band on `/dashboard/schemes`. Bridges the scheme library
 * (browsable reference) to the actual evaluation flow with a single CTA.
 */
export function SchemesHowMatchingWorks() {
  const { t } = useTranslation()
  return (
    <section className="paper-card relative isolate flex flex-col items-start gap-5 overflow-hidden rounded-[18px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-6 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70 sm:inset-y-8"
      />
      <div className="relative flex max-w-prose flex-col gap-2">
        <p className="mono-caption text-[color:var(--hibiscus)]">{t('schemes.howMatching.eyebrow')}</p>
        <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          {t('schemes.howMatching.title')}
        </h2>
        <p className="text-[14.5px] leading-[1.6] text-foreground/68">{t('schemes.howMatching.body')}</p>
      </div>
      <Button
        render={<Link href="/dashboard/evaluation/upload" />}
        size="lg"
        className="relative rounded-full bg-[color:var(--hibiscus)] px-6 text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
      >
        <Sparkles className="mr-1.5 size-4" aria-hidden />
        {t('schemes.howMatching.cta')}
        <ArrowRight className="ml-1.5 size-4" aria-hidden />
      </Button>
    </section>
  )
}
