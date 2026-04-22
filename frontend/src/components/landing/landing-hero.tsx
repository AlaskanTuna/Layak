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
        {/* Tuned overlays keep the hero readable without washing out the banner art. */}
        <div className="absolute inset-0 bg-black/18 dark:bg-black/28" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/62 via-background/10 to-transparent dark:from-background/72 dark:via-background/14" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl px-4 py-24 md:px-6">
        <div className="flex w-full flex-col items-center gap-6 text-center lg:max-w-3xl lg:items-start lg:text-left">
          <h1 className="max-w-4xl font-display text-5xl leading-[0.92] tracking-[-0.03em] text-balance text-white drop-shadow-[0_12px_36px_rgba(0,0,0,0.38)] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          {t('marketing.hero.headlinePart1')} <br className="hidden sm:inline" />
          {t('marketing.hero.headlinePart2')}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-100/92 sm:text-lg drop-shadow-sm">
            {t('marketing.hero.description')}
          </p>
          <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              render={<Link href="/sign-in" />}
              size="lg"
              className="w-full sm:w-auto px-8 bg-white text-black hover:bg-zinc-200"
            >
            {t('marketing.hero.getStarted')}
            <ArrowRight className="ml-2 size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
