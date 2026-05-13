'use client'

import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LandingCta } from '@/components/landing/landing-cta'
import { LandingHero } from '@/components/landing/landing-hero'
import { LandingPacketsPreview } from '@/components/landing/landing-packets-preview'
import { LandingPipeline } from '@/components/landing/landing-pipeline'
import { LandingPricing } from '@/components/landing/landing-pricing'

export function MarketingLandingPage() {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)

  // SolarSim-style proximity snap, scoped to the landing page only.
  useEffect(() => {
    document.documentElement.classList.add('landing-snap')
    return () => document.documentElement.classList.remove('landing-snap')
  }, [])

  // Toggle the floating "back to top" button after the user clears the hero.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <div className="snap-start">
        <LandingHero />
      </div>
      <div className="snap-start">
        <LandingPipeline />
      </div>
      <div className="snap-start">
        <LandingPacketsPreview />
      </div>
      <div className="snap-start">
        <LandingPricing />
      </div>
      <div className="snap-start">
        <LandingCta />
      </div>

      {/* Floating back-to-top — center bottom, fades in past the hero */}
      <button
        type="button"
        aria-label={t('common.scrollToTop', 'Scroll to top')}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-7 left-1/2 z-40 inline-flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-foreground/10 bg-background/85 text-foreground shadow-[0_18px_44px_-18px_color-mix(in_oklch,var(--ink)_45%,transparent)] backdrop-blur-md transition-all duration-300 hover:bg-background ${
          scrolled ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <ChevronUp className="size-5" aria-hidden />
      </button>
    </>
  )
}
