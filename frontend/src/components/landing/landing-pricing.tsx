'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function LandingPricing() {
  const { t } = useTranslation()

  const freeFeatures = t('marketing.pricing.freeTier.features', {
    returnObjects: true,
    defaultValue: [
      '5 evaluations per 24 hours',
      '30-day evaluation history',
      'Access to STR, JKM, and LHDN schemes',
      'Watermarked draft packets'
    ]
  }) as string[]

  const proFeatures = t('marketing.pricing.proTier.features', {
    returnObjects: true,
    defaultValue: [
      'Unlimited evaluations',
      'Unlimited evaluation history',
      'Priority processing queue',
      'CSV export of all history',
      'Early access to new schemes'
    ]
  }) as string[]

  return (
    <section id="pricing" className="relative bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-14 grid gap-8 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <div className="mono-caption text-[color:var(--primary)]">
              {t('marketing.pricing.eyebrow', '04 — Pricing')}
            </div>
            <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.04] tracking-[-0.02em] sm:text-5xl lg:text-[52px]">
              {t('marketing.pricing.headlineLead', 'Free for citizens.')}
              <br />
              <span className="text-foreground/55">
                {t('marketing.pricing.headlineTail', 'Pro for everyone else.')}
              </span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pt-6">
            <p className="text-base leading-[1.65] text-foreground/65 sm:text-[17px]">
              {t(
                'marketing.pricing.description',
                'Layak is free for individuals tracking their own eligibility. Pro lifts the rate limit and unlocks history exports — built for advocacy NGOs and welfare officers running 50+ checks a week.'
              )}
            </p>
          </div>
        </div>

        <div className="ink-rule mb-12" />

        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          {/* Free Tier */}
          <PricingTier
            tag={t('marketing.pricing.freeTier.name', 'Free')}
            tagTone="primary"
            title={t('marketing.pricing.freeTier.name', 'Free')}
            description={t('marketing.pricing.freeTier.description', 'For individuals exploring their eligibility.')}
            price={t('marketing.pricing.freeTier.price', 'RM 0')}
            period={t('marketing.pricing.freeTier.period', 'forever')}
            features={freeFeatures}
            cta={
              <Button
                render={<Link href="/sign-up" />}
                size="lg"
                className="group h-12 w-full justify-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/85"
              >
                {t('marketing.pricing.freeTier.cta', 'Get started')}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Button>
            }
          />

          {/* Pro Tier (Waitlist) */}
          <PricingTier
            tag={t('marketing.pricing.waitlist', 'Waitlist')}
            tagTone="hibiscus"
            title={t('marketing.pricing.proTier.name', 'Pro')}
            description={t('marketing.pricing.proTier.description', 'For high-volume users and agencies.')}
            price={t('marketing.pricing.proTier.price', 'RM 15')}
            period={t('marketing.pricing.proTier.period', 'month')}
            features={proFeatures}
            featured
            cta={
              <button
                disabled
                className="h-12 w-full cursor-not-allowed rounded-full border-2 border-[color:var(--hibiscus)]/40 bg-transparent text-[15px] font-medium text-[color:var(--hibiscus)]"
              >
                {t('marketing.pricing.proTier.cta', 'Join the waitlist')}
              </button>
            }
          />
        </div>
      </div>
    </section>
  )
}

function PricingTier({
  tag,
  tagTone,
  title,
  description,
  price,
  period,
  features,
  cta,
  featured
}: {
  tag: string
  tagTone: 'primary' | 'hibiscus'
  title: string
  description: string
  price: string
  period: string
  features: string[]
  cta: React.ReactNode
  featured?: boolean
}) {
  const accent = tagTone === 'hibiscus' ? 'var(--hibiscus)' : 'var(--primary)'
  return (
    <article
      className={`paper-card relative flex flex-col rounded-[20px] p-8 transition-shadow ${
        featured ? 'ring-1 ring-[color:var(--hibiscus)]/15' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className="rounded-full px-2.5 py-1 mono-caption text-[10px]"
          style={{
            background: `color-mix(in oklch, ${accent} 12%, transparent)`,
            color: accent,
            border: `1px solid color-mix(in oklch, ${accent} 24%, transparent)`
          }}
        >
          {tag}
        </span>
        <span className="mono-caption text-[10px] text-foreground/45">— Layak {title}</span>
      </div>

      <h3 className="mt-5 font-heading text-3xl font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 text-[14.5px] leading-[1.55] text-foreground/65">{description}</p>

      <div className="mt-7 flex items-baseline gap-2 border-y border-foreground/10 py-5">
        <span className="display-numeral text-[60px] text-foreground">{price}</span>
        <span className="mono-caption text-foreground/55">/ {period}</span>
      </div>

      <ul className="mt-6 flex-1 space-y-3.5">
        {features.map((feature) => (
          <li key={feature} className="flex gap-3 text-[14px] leading-[1.5] text-foreground/75">
            <span
              aria-hidden
              className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full"
              style={{ background: accent }}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">{cta}</div>
    </article>
  )
}
