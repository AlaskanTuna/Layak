'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/lib/auth-context'
import { BrandMark } from '@/components/layout/brand-mark'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'

export function MarketingHeader() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const [scrollProgress, setScrollProgress] = useState(0)

  const ctaHref = user ? '/dashboard' : '/sign-in'
  const ctaLabel = loading
    ? ' '
    : user
      ? t('marketing.hero.goToDashboard', 'Go to Dashboard')
      : t('marketing.hero.getStarted', 'Get Started')

  useEffect(() => {
    const updateScrollProgress = () => {
      const next = Math.min(Math.max(window.scrollY / 180, 0), 1)
      setScrollProgress(next)
    }

    updateScrollProgress()
    window.addEventListener('scroll', updateScrollProgress, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollProgress)
  }, [])

  const surfaceStrength = 30 + scrollProgress * 55
  const borderStrength = scrollProgress * 40
  const shadowStrength = scrollProgress * 12

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 h-[var(--topbar-height)] border-b transition-[background-color,border-color,box-shadow,color,backdrop-filter] duration-150"
      style={{
        color: 'var(--foreground)',
        backgroundColor:
          scrollProgress === 0
            ? 'transparent'
            : `color-mix(in oklch, var(--background) ${surfaceStrength}%, transparent)`,
        borderColor:
          scrollProgress === 0 ? 'transparent' : `color-mix(in oklch, var(--border) ${borderStrength}%, transparent)`,
        boxShadow:
          scrollProgress === 0
            ? 'none'
            : `0 18px 44px -28px color-mix(in oklch, black ${shadowStrength}%, transparent)`,
        backdropFilter: `blur(${scrollProgress * 12}px)`,
        WebkitBackdropFilter: `blur(${scrollProgress * 12}px)`
      }}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={t('common.aria.layakHome')}>
          <BrandMark />
          <span className="font-sans text-[17px] font-semibold tracking-tight text-inherit">{t('common.brand')}</span>
        </Link>
        <nav className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <Button
            render={<Link href={ctaHref} />}
            size="sm"
            aria-label={ctaLabel}
            className="ml-2 h-9 rounded-full bg-[color:var(--hibiscus)] px-4 text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
          >
            {ctaLabel}
          </Button>
        </nav>
      </div>
    </header>
  )
}
