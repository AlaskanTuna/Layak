import Link from 'next/link'

import { AuthContextPane } from '@/components/auth/auth-context-pane'
import { BrandMark } from '@/components/layout/brand-mark'
import { Footer } from '@/components/layout/footer'
import { LanguageToggle } from '@/components/layout/language-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-(--topbar-height) items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Layak home">
          <BrandMark />
          <span className="font-sans text-base font-semibold tracking-tight">Layak</span>
        </Link>
        <LanguageToggle />
      </header>
      <main className="flex-1 px-4 py-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="mx-auto grid w-full max-w-6xl items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-12">
          <AuthContextPane />
          <div className="mx-auto flex w-full max-w-[460px] flex-col justify-center">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
