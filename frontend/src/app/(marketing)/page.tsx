import { LandingCta } from '@/components/landing/landing-cta'
import { LandingFeatures } from '@/components/landing/landing-features'
import { LandingHero } from '@/components/landing/landing-hero'

export default function LandingPage() {
  return (
    <>
      <LandingHero />
      <LandingFeatures />
      <LandingCta />
    </>
  )
}
