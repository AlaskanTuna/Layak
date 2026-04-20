import Link from 'next/link'

import { BrandMark } from '@/components/layout/brand-mark'
import { Footer } from '@/components/layout/footer'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-[var(--topbar-height)] items-center justify-center px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Layak home">
          <BrandMark />
          <span className="font-heading text-base font-semibold tracking-tight">Layak</span>
        </Link>
      </header>
      <main className="flex min-h-[calc(100svh-var(--topbar-height))] flex-1 items-center justify-center px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}
