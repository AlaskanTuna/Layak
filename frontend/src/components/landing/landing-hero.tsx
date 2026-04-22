'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'

import { Button } from '@/components/ui/button'

export function LandingHero() {
  const { t } = useTranslation()
  return (
    <section className="relative flex min-h-[90vh] md:min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/marketing/hero-civic-glow.webp"
          alt="Civic Glow Hero"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Gradient overlays to ensure text readability and blend into the next section */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-6 px-4 py-24 text-center md:px-6">
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl text-balance text-white drop-shadow-sm">
          {t('marketing.hero.headlinePart1')} <br className="hidden sm:inline" />
          {t('marketing.hero.headlinePart2')}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-200 sm:text-lg drop-shadow-sm">
          {t('marketing.hero.description')}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row w-full sm:w-auto">
          <Button render={<Link href="/sign-in" />} size="lg" className="w-full sm:w-auto px-8 bg-white text-black hover:bg-zinc-200">
            {t('marketing.hero.getStarted')}
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  )
}
