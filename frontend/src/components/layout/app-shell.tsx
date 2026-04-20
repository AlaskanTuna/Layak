'use client'

import { useCallback, useState } from 'react'

import { Footer } from '@/components/layout/footer'
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
      <div className="flex min-h-svh flex-col md:pl-[var(--sidebar-collapsed)]">
        <Topbar onMenuClick={handleMobileOpen} />
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
        <Footer />
      </div>
    </>
  )
}
