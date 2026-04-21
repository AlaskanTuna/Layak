'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="px-4 pb-8 pt-2 text-xs text-muted-foreground md:px-6">
      <div className="section-shell mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="font-heading text-sm font-semibold text-foreground">{t('common.brand')}</span>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] sm:inline">
            Transparent eligibility guidance
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t('common.footer.copyright')}</span>
          <Link href="/" className="transition-colors hover:text-foreground">
            {t('common.footer.contact')}
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
            {t('common.footer.howItWorks')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
