'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BookOpen, LayoutDashboard, Library, Menu, Sparkles, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/evaluation', label: 'Evaluation', icon: Sparkles },
  { href: '/dashboard/schemes', label: 'Schemes', icon: Library },
  { href: '/dashboard/how-it-works', label: 'How it Works', icon: BookOpen }
]

type SidebarProps = {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    onMobileClose()
  }, [pathname, onMobileClose])

  function renderContent(isCollapsed: boolean) {
    return (
      <>
        <div
          className={cn(
            'flex h-[var(--topbar-height)] shrink-0 items-center border-b border-[var(--glass-border)] transition-[padding] duration-200 ease-in-out',
            isCollapsed ? 'justify-center px-0' : 'px-4'
          )}
        >
          <Link href="/" className="flex items-center overflow-hidden" aria-label="Layak home">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-sm font-semibold text-primary-foreground">
              L
            </div>
            <span
              className={cn(
                'whitespace-nowrap font-heading text-base font-semibold tracking-tight transition-[max-width,margin-left,opacity] duration-200 ease-in-out',
                isCollapsed ? 'pointer-events-none ml-0 max-w-0 opacity-0' : 'ml-2.5 max-w-xs opacity-100'
              )}
            >
              Layak
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'flex h-9 w-full items-center rounded-md text-sm transition-[padding,background-color,color] duration-200 ease-in-out',
                    isCollapsed ? 'justify-center px-0' : 'justify-start px-2.5',
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
                    {item.label}
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
          'sidebar-glass text-sidebar-foreground',
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
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Open menu"
      onClick={onClick}
      className="size-8 md:hidden"
    >
      <Menu className="size-4" aria-hidden />
    </Button>
  )
}
