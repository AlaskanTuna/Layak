'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, FileSearch, ShieldCheck, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function LandingHero() {
  const { t } = useTranslation()

  const proofPoints = [
    { icon: ShieldCheck, label: 'Source-cited matching' },
    { icon: FileSearch, label: 'Three documents in' },
    { icon: BadgeCheck, label: 'Draft packets out' }
  ]

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10 md:px-6">
      <div className="hero-sheen rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative z-10 flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-background/72 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Malaysia-first civic AI concierge
            </div>

            <div className="flex flex-col gap-4">
              <h1 className="font-heading max-w-3xl text-4xl font-semibold leading-[1.02] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                Know what support your household can actually claim.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {t('marketing.hero.description')}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                render={<Link href="/sign-in" />}
                size="lg"
                className="h-11 rounded-full px-5 shadow-[0_14px_28px_color-mix(in_oklch,var(--primary)_24%,transparent)]"
              >
                Try the demo
                <ArrowRight className="ml-1.5 size-4" aria-hidden />
              </Button>
              <Button
                render={<Link href="/#how-it-works" />}
                size="lg"
                variant="outline"
                className="h-11 rounded-full bg-background/70 px-5 backdrop-blur"
              >
                {t('common.button.howItWorks')}
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {proofPoints.map(point => {
                const Icon = point.icon
                return (
                  <div
                    key={point.label}
                    className="rounded-2xl border border-border/80 bg-background/72 px-4 py-3 shadow-sm backdrop-blur"
                  >
                    <div className="mb-2 flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-foreground">{point.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="relative min-h-[22rem] overflow-hidden rounded-[1.75rem] border border-white/40 shadow-[0_20px_70px_color-mix(in_oklch,var(--primary)_18%,transparent)]">
            <Image
              src="/marketing/hero-civic-glow.webp"
              alt="Layak eligibility pipeline hero illustration"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/45 via-transparent to-background/10" />
            <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/35 bg-background/78 p-4 backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Live pipeline</p>
                <p className="mt-2 font-heading text-lg font-semibold text-foreground">5 transparent steps</p>
                <p className="mt-1 text-sm text-muted-foreground">Extract, classify, match, compute, generate.</p>
              </div>
              <div className="rounded-2xl border border-white/35 bg-primary/90 p-4 text-primary-foreground shadow-lg backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.16em] text-primary-foreground/80">Trust layer</p>
                <p className="mt-2 font-heading text-lg font-semibold">Draft only, never auto-submit</p>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  High-confidence demo story for judges and users.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
