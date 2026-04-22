'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function LandingCta() {
  const { t } = useTranslation()
  return (
    <section className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-16 sm:py-20 md:px-6">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl capitalize">
          {t('marketing.cta.headline')}
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          {t('marketing.cta.description')}
        </p>
        <Button render={<Link href="/sign-in" />} size="lg">
          {t('marketing.hero.getStarted')}
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
      </div>
    </section>
  )
}
