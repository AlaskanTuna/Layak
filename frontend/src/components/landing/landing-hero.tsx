'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'

import { Button } from '@/components/ui/button'

export function LandingHero() {
  const { t } = useTranslation()
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    let frame = 0

    const update = () => {
      frame = 0
      const viewportHeight = Math.max(window.innerHeight, 1)
      const nextProgress = Math.min(window.scrollY / (viewportHeight * 0.9), 1)
      setScrollProgress(nextProgress)
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section className="relative flex min-h-[90vh] md:min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/marketing/hero-civic-glow.webp"
          alt="Civic Glow Hero"
          fill
          className="object-cover object-center transition-transform duration-500 ease-out will-change-transform"
          style={{
            transform: `scale(${1 + scrollProgress * 0.045})`,
            filter: `blur(${scrollProgress * 5}px)`
          }}
          priority
        />
        {/* Tuned overlays keep the hero readable without washing out the banner art. */}
        <div className="absolute inset-0 bg-black/18 dark:bg-black/28" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/62 via-background/10 to-transparent dark:from-background/72 dark:via-background/14" />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 top-[18%] bg-white/12 backdrop-blur-2xl transition-opacity duration-500 ease-out dark:bg-white/6"
          style={{ opacity: scrollProgress * 0.4 }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[38vh] bg-gradient-to-t from-background/92 via-background/40 to-transparent transition-opacity duration-500 ease-out dark:from-background dark:via-background/56"
          style={{ opacity: 0.35 + scrollProgress * 0.5 }}
        />
      </div>

      {/* Hero Content */}
      <div
        className="relative z-10 mx-auto flex w-full max-w-6xl px-4 py-24 transition-[opacity,transform] duration-500 ease-out md:px-6"
        style={{
          opacity: 1 - scrollProgress * 0.14,
          transform: `translateY(${scrollProgress * 28}px)`
        }}
      >
        <div className="hero-glass-panel flex w-full flex-col items-center gap-6 rounded-[2rem] px-5 py-8 text-center lg:max-w-3xl lg:items-start lg:px-8 lg:py-10 lg:text-left">
          <h1 className="max-w-4xl font-display text-5xl leading-[0.92] tracking-[-0.03em] text-balance text-white drop-shadow-[0_12px_36px_rgba(0,0,0,0.38)] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            {t('marketing.hero.headlinePart1')} <br className="hidden sm:inline" />
            {t('marketing.hero.headlinePart2')}
          </h1>
          <p className="hero-description max-w-2xl rounded-2xl px-4 py-3 text-base leading-relaxed sm:text-lg">
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
