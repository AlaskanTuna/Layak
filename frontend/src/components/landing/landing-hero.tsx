'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function LandingHero() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-16 sm:py-24 md:px-6">
      <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
        {t('marketing.hero.headlinePart1')} <br className="hidden sm:inline" />
        {t('marketing.hero.headlinePart2')}
      </h1>
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        {t('marketing.hero.description')}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button render={<Link href="/sign-in" />} size="lg">
          {t('marketing.hero.getStarted')}
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
        <Button render={<Link href="/dashboard/how-it-works" />} size="lg" variant="outline">
          {t('common.button.howItWorks')}
        </Button>
      </div>
    </section>
  )
}
