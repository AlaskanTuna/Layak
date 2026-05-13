'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type Props = {
  /** When true, pin the footer to the viewport bottom behind the main
   *  sheet so it reads as a "ground floor" that the page rolls back to
   *  reveal as content scrolls past. Layout owner is responsible for
   *  giving <main> a solid background and a higher z-index. */
  sticky?: boolean
}

export function Footer({ sticky = false }: Props = {}) {
  const { t } = useTranslation()
  return (
    <footer
      className={cn(
        'flex h-[var(--topbar-height)] items-center bg-muted/50 px-4 text-xs text-muted-foreground md:px-6',
        sticky && 'sticky bottom-0 -z-10'
      )}
    >
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
