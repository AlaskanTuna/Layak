import { LandingCta } from '@/components/landing/landing-cta'
import { LandingFeatures } from '@/components/landing/landing-features'
import { LandingHero } from '@/components/landing/landing-hero'
import { HowItWorksContent } from '@/components/how-it-works/how-it-works-content'

export function MarketingLandingPage() {
  return (
    <>
      <LandingHero />
      <LandingFeatures />
      <section id="how-it-works" className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6">
        <h2 className="font-heading mb-8 text-2xl font-semibold tracking-tight">How it works</h2>
        <HowItWorksContent />
      </section>
      <LandingCta />
    </>
  )
}
