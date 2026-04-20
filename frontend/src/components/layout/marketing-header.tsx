import Link from 'next/link'

import { BrandMark } from '@/components/layout/brand-mark'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'

export function MarketingHeader() {
  return (
    <header className="topbar-glass sticky top-0 z-20 flex h-[var(--topbar-height)] items-center px-4 md:px-6">
      <Link href="/" className="flex items-center gap-2" aria-label="Layak home">
        <BrandMark />
        <span className="font-heading text-base font-semibold tracking-tight">Layak</span>
      </Link>
      <nav className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Button render={<Link href="/dashboard/how-it-works" />} size="sm" variant="ghost">
          How it works
        </Button>
        <Button render={<Link href="/sign-in" />} size="sm">
          Sign in
        </Button>
      </nav>
    </header>
  )
}
