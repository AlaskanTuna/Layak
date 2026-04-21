'use client'

import { LandingCta } from '@/components/landing/landing-cta'
import { LandingFeatures } from '@/components/landing/landing-features'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingStickyScroll } from '@/components/landing/landing-sticky-scroll'

export function MarketingLandingPage() {
  return (
    <>
      <LandingHero />
      <LandingFeatures />
      <LandingStickyScroll />
      <LandingCta />
    </>
  )
}
