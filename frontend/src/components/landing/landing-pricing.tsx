'use client'

import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function LandingPricing() {
  const { t } = useTranslation()

  return (
    <section id="pricing" className="mx-auto w-full max-w-5xl px-4 py-16 md:px-6">
      <div className="mb-10 flex flex-col items-center text-center">
        <h2 className="font-heading mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('marketing.pricing.title', 'Simple, transparent pricing')}
        </h2>
        <p className="max-w-2xl text-muted-foreground sm:text-lg">
          {t('marketing.pricing.description', 'Start tracking your welfare eligibility for free. Upgrade to Pro when you need more power.')}
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        {/* Free Tier */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{t('marketing.pricing.freeTier.name', 'Free')}</CardTitle>
            <CardDescription>{t('marketing.pricing.freeTier.description', 'For individuals exploring their eligibility.')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between">
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{t('marketing.pricing.freeTier.price', 'RM 0')}</span>
              <span className="text-sm font-medium text-muted-foreground">/{t('marketing.pricing.freeTier.period', 'forever')}</span>
            </div>
            <ul className="mb-6 space-y-3 flex-1 text-sm text-muted-foreground">
              {[
                '5 evaluations per 24 hours',
                '30-day evaluation history',
                'Access to STR, JKM, and LHDN schemes',
                'Watermarked draft packets'
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <Check className="size-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button render={<Link href="/sign-up" />} className="w-full" size="lg">
              {t('marketing.pricing.freeTier.cta', 'Get Started')}
            </Button>
          </CardContent>
        </Card>

        {/* Pro Tier (Waitlist) */}
        <Card className="flex flex-col border-primary/20 bg-muted/30 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">{t('marketing.pricing.proTier.name', 'Pro')}</CardTitle>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-heading text-xs font-semibold text-primary">Waitlist</span>
            </div>
            <CardDescription>{t('marketing.pricing.proTier.description', 'For high-volume users and agencies.')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between">
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{t('marketing.pricing.proTier.price', 'RM 15')}</span>
              <span className="text-sm font-medium text-muted-foreground">/{t('marketing.pricing.proTier.period', 'month')}</span>
            </div>
            <ul className="mb-6 space-y-3 flex-1 text-sm text-muted-foreground">
              {[
                'Unlimited evaluations',
                'Unlimited evaluation history',
                'Priority processing queue',
                'CSV export of all history',
                'Early access to new schemes'
              ].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <Check className="size-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full" size="lg" disabled>
              {t('marketing.pricing.proTier.cta', 'Join the Waitlist')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
