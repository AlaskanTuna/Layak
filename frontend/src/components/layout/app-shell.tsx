'use client'

import { useCallback, useState } from 'react'

import { Footer } from '@/components/layout/footer'
import { FloatingHelpLauncher } from '@/components/layout/floating-help-launcher'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

type Props = {
  children: React.ReactNode
}

export function AppShell({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const handleMobileOpen = useCallback(() => setMobileOpen(true), [])
  const handleMobileClose = useCallback(() => setMobileOpen(false), [])

  return (
    <>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />
      <FloatingHelpLauncher />
      <div className="flex min-h-svh flex-col md:pl-[var(--sidebar-collapsed)]">
        <Topbar onMenuClick={handleMobileOpen} />
        {/* The page sheet (topbar + main) sits on top of the footer via a
            solid background + higher z-index, so the footer reads as a thin
            "ground floor" the sheet rolls back to reveal once scrolled past
            the last content. Generous bottom padding keeps content from
            butting against the reveal line. */}
        <main className="relative z-10 mx-auto min-h-[calc(100svh-var(--topbar-height))] w-full max-w-7xl flex-1 bg-background px-4 pt-6 pb-24 md:px-6 md:pt-8 md:pb-32">
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}
