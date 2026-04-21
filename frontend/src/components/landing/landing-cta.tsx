'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function LandingCta() {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 pb-12 sm:py-10 md:px-6">
      <div className="section-shell grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="order-2 lg:order-1">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="size-3.5" aria-hidden />
            Human-centered by design
          </div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('marketing.cta.headline')}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {t('marketing.cta.description')}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              render={<Link href="/sign-in" />}
              size="lg"
              className="h-11 rounded-full px-5 shadow-[0_14px_28px_color-mix(in_oklch,var(--primary)_24%,transparent)]"
            >
              Try the demo
              <ArrowRight className="ml-1.5 size-4" aria-hidden />
            </Button>
            <Button
              render={<Link href="/dashboard/evaluation/upload" />}
              size="lg"
              variant="outline"
              className="h-11 rounded-full bg-background/70 px-5"
            >
              Preview the upload flow
            </Button>
          </div>
        </div>

        <div className="order-1 overflow-hidden rounded-[1.75rem] border border-border/70 shadow-[0_18px_60px_color-mix(in_oklch,var(--primary)_12%,transparent)] lg:order-2">
          <Image
            src="/marketing/family-support-scene.webp"
            alt="Layak supporting a Malaysian household"
            width={1536}
            height={1024}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  )
}
