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
    <header className="topbar-glass sticky top-0 z-20 flex h-[var(--topbar-height)] items-center px-4 md:px-6 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2" aria-label={t('common.aria.layakHome')}>
        <BrandMark />
        <span className="font-heading text-base font-semibold tracking-tight">{t('common.brand')}</span>
      </Link>
      <nav className="ml-auto flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
        <Button render={<Link href="/#how-it-works" />} size="sm" variant="ghost">
          {t('common.button.howItWorks')}
        </Button>
        <Button render={<Link href="/sign-in" />} size="sm">
          {t('common.button.signIn')}
        </Button>
      </nav>
    </header>
  )
}
