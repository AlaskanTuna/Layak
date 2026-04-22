'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { BrandMark } from '@/components/layout/brand-mark'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'

export function MarketingHeader() {
  const { t } = useTranslation()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 flex h-[var(--topbar-height)] items-center px-4 transition-all duration-500 md:px-6 border-b',
        isScrolled
          ? 'bg-background/80 backdrop-blur-md border-border/40 text-foreground'
          : 'bg-transparent border-transparent text-white dark:text-foreground'
      )}
    >
      <Link href="/" className="flex items-center gap-2" aria-label={t('common.aria.layakHome')}>
        <BrandMark />
        <span className="font-sans text-base font-semibold tracking-tight">{t('common.brand')}</span>
      </Link>
      <nav className="ml-auto flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
        <Button render={<Link href="/#how-it-works" />} size="sm" variant="ghost">
          {t('common.button.howItWorks')}
        </Button>
        <Button render={<Link href="/sign-in" />} size="sm" className="ml-2">
          {t('common.button.signIn')}
        </Button>
      </nav>
    </header>
  )
}
