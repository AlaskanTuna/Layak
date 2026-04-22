'use client'

import { LandingCta } from '@/components/landing/landing-cta'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingPricing } from '@/components/landing/landing-pricing'
import { HowItWorksContent } from '@/components/how-it-works/how-it-works-content'

export function MarketingLandingPage() {
  return (
    <>
      <LandingHero />
      <section id="how-it-works" className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <HowItWorksContent />
      </section>
      <LandingPricing />
      <LandingCta />
    </>
  )
}
