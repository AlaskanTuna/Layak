'use client'

import { useTranslation } from 'react-i18next'

import { HowItWorksContent } from '@/components/how-it-works/how-it-works-content'
import { LandingCta } from '@/components/landing/landing-cta'
import { LandingFeatures } from '@/components/landing/landing-features'
import { LandingHero } from '@/components/landing/landing-hero'

export function MarketingLandingPage() {
  const { t } = useTranslation()

  return (
    <>
      <LandingHero />
      <LandingFeatures />
      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10 md:px-6">
        <div className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-8 flex flex-col gap-3 text-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Judges can see the reasoning</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('common.button.howItWorks')}
            </h2>
          </div>
          <HowItWorksContent />
        </div>
      </section>
      <LandingCta />
    </>
  )
}
