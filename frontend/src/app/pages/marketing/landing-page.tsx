'use client'

import { useTranslation } from 'react-i18next'

import { LandingCta } from '@/components/landing/landing-cta'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingPricing } from '@/components/landing/landing-pricing'
import { HowItWorksContent } from '@/components/how-it-works/how-it-works-content'

export function MarketingLandingPage() {
  const { t } = useTranslation()
  return (
    <>
      <LandingHero />
      <section id="how-it-works" className="mx-auto w-full max-w-5xl px-4 py-16 md:px-6">
        <h2 className="font-heading mb-8 text-2xl font-semibold tracking-tight text-center capitalize">
          {t('common.button.howItWorks')}
        </h2>
        <HowItWorksContent />
      </section>
      <LandingPricing />
      <LandingCta />
    </>
  )
}
