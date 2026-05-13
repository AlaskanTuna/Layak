'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="flex h-[var(--topbar-height)] items-center bg-muted/50 px-4 text-xs text-muted-foreground md:px-6">
      <div className="ml-auto flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{t('common.footer.copyright')}</span>
        <span aria-hidden className="opacity-40">
          ·
        </span>
        <Link href="/" className="transition-colors hover:text-foreground">
          {t('common.footer.contact')}
        </Link>
        <span aria-hidden className="opacity-40">
          ·
        </span>
        <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
          {t('common.footer.howItWorks')}
        </Link>
        <span aria-hidden className="opacity-40">
          ·
        </span>
        <Link href="/privacy" className="transition-colors hover:text-foreground">
          {t('common.footer.privacy')}
        </Link>
        <span aria-hidden className="opacity-40">
          ·
        </span>
        <Link href="/terms" className="transition-colors hover:text-foreground">
          {t('common.footer.terms')}
        </Link>
      </div>
    </footer>
  )
}
