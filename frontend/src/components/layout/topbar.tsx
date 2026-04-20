'use client'

import Link from 'next/link'

import { MobileMenuButton } from '@/components/layout/sidebar'
import { ThemeToggle } from '@/components/layout/theme-toggle'

type TopbarProps = {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="topbar-glass sticky top-0 z-20 flex h-[var(--topbar-height)] items-center gap-2 px-3 md:px-4">
      <MobileMenuButton onClick={onMenuClick} />
      <Link href="/" className="flex items-center gap-2 md:hidden" aria-label="Layak home">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary font-heading text-sm font-semibold text-primary-foreground">
          L
        </div>
        <span className="font-heading text-base font-semibold tracking-tight">Layak</span>
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  )
}
