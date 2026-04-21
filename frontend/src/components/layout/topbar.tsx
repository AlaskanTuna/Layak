'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { BrandMark } from '@/components/layout/brand-mark'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { NotificationMenu } from '@/components/layout/notification-menu'
import { MobileMenuButton } from '@/components/layout/sidebar'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'

type TopbarProps = {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { t } = useTranslation()
  return (
    <header className="topbar-glass sticky top-0 z-20 flex h-[var(--topbar-height)] items-center gap-2 px-3 md:px-4 backdrop-blur-md">
      <MobileMenuButton onClick={onMenuClick} />
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden" aria-label={t('common.aria.layakHome')}>
        <BrandMark size="sm" />
        <span className="font-heading text-base font-semibold tracking-tight">{t('common.brand')}</span>
      </Link>
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-1">
        <LanguageToggle />
        <ThemeToggle />
        <NotificationMenu />
        <UserMenu />
      </div>
    </header>
  )
}
