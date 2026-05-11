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
        <main className="mx-auto min-h-[calc(100svh-var(--topbar-height))] w-full max-w-7xl flex-1 px-4 pt-6 pb-16 md:px-6 md:pt-8 md:pb-20">
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}
