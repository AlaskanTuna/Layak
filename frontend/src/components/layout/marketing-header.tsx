'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { BrandMark } from '@/components/layout/brand-mark'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'

export function MarketingHeader() {
  const { t } = useTranslation()

  return (
    <header className="topbar-glass sticky top-0 z-20 flex h-(--topbar-height) items-center px-4 md:px-6 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-3" aria-label={t('common.aria.layakHome')}>
        <BrandMark />
        <div className="flex flex-col leading-none">
          <span className="font-heading text-base font-semibold tracking-tight">{t('common.brand')}</span>
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Civic AI concierge
          </span>
        </div>
      </Link>
      <nav className="ml-auto flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
        <Button render={<Link href="/#how-it-works" />} size="sm" variant="ghost" className="hidden sm:inline-flex">
          {t('common.button.howItWorks')}
        </Button>
        <Button
          render={<Link href="/sign-in" />}
          size="sm"
          className="shadow-[0_10px_24px_color-mix(in_oklch,var(--primary)_22%,transparent)]"
        >
          Try the demo
        </Button>
      </nav>
    </header>
  )
}
