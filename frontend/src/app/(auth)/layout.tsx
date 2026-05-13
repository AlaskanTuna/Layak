import Link from 'next/link'

import { AuthContextPane } from '@/components/auth/auth-context-pane'
import { BrandMark } from '@/components/layout/brand-mark'
import { Footer } from '@/components/layout/footer'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-(--topbar-height) items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Layak home">
          <BrandMark />
          <span className="font-sans text-base font-semibold tracking-tight">Layak</span>
        </Link>
        <nav className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </nav>
      </header>
      {/* The auth sheet sits on top of the footer (z-10 + solid bg) so the
          footer reads as a thin "ground floor" the page rolls back to reveal
          on scroll — matching the same fold-over treatment used elsewhere. */}
      <main className="relative z-10 flex min-h-[calc(100svh-var(--topbar-height))] flex-col items-center justify-center bg-background px-4 py-8 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid w-full max-w-5xl items-stretch gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-10">
          <AuthContextPane />
          <div className="mx-auto flex w-full max-w-[440px] flex-col justify-center">
            {children}
          </div>
        </div>
      </main>
      <Footer sticky />
    </div>
  )
}
