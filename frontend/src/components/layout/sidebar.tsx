'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Library, Menu, Sparkles, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BrandMark } from '@/components/layout/brand-mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  labelKey: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'common.nav.dashboard', icon: LayoutDashboard },
  { href: '/dashboard/evaluation', labelKey: 'common.nav.evaluation', icon: Sparkles },
  { href: '/dashboard/schemes', labelKey: 'common.nav.schemes', icon: Library }
]

type SidebarProps = {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    onMobileClose()
  }, [pathname, onMobileClose])

  function renderContent(isCollapsed: boolean) {
    return (
      <>
        <div className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-[var(--glass-border)] pl-4">
          <Link href="/" className="flex items-center overflow-hidden" aria-label={t('common.aria.layakHome')}>
            <BrandMark />
            <span
              className={cn(
                'whitespace-nowrap font-heading text-base font-semibold tracking-tight transition-[max-width,margin-left,opacity] duration-200 ease-in-out',
                isCollapsed ? 'pointer-events-none ml-0 max-w-0 opacity-0' : 'ml-2.5 max-w-xs opacity-100'
              )}
            >
              {t('common.brand')}
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = pathname === item.href
            const label = t(item.labelKey)

            return (
              <Link
                key={item.labelKey}
                href={item.href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'flex h-9 w-full items-center rounded-md pl-4 text-sm transition-[background-color,color] duration-200 ease-in-out',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span
                    className={cn(
                      'truncate transition-[max-width,margin-left,opacity] duration-200 ease-in-out',
                      isCollapsed ? 'pointer-events-none ml-0 max-w-0 opacity-0' : 'ml-3 max-w-xs opacity-100'
                    )}
                  >
                    {label}
                  </span>
                </span>
              </Link>
            )
          })}
        </nav>
      </>
    )
  }

  return (
    <>
      <aside
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
        style={
          {
            '--sidebar-current-width': collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'
          } as React.CSSProperties
        }
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden',
          'w-[var(--sidebar-current-width)] transition-[width] duration-300 ease-in-out',
          'sidebar-glass backdrop-blur-md text-sidebar-foreground',
          'md:flex'
        )}
      >
        {renderContent(collapsed)}
      </aside>

      <div
        aria-hidden
        onClick={() => setCollapsed(true)}
        className={cn(
          'fixed inset-0 z-[25] hidden bg-black/10 backdrop-blur-md transition-opacity duration-300 ease-in-out md:block',
          collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        )}
      />

      <div
        aria-hidden
        onClick={onMobileClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-md transition-opacity duration-300 ease-in-out md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col overflow-hidden bg-sidebar text-sidebar-foreground',
          'transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {renderContent(false)}
      </aside>
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t('common.aria.openMenu')}
      onClick={onClick}
      className="size-8 md:hidden"
    >
      <Menu className="size-4" aria-hidden />
    </Button>
  )
}
