'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FileText, HelpCircle, Home, Menu, type LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  enabled: boolean
  hint?: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, enabled: true },
  { href: '#schemes', label: 'Schemes', icon: FileText, enabled: false, hint: 'v2' },
  { href: '#about', label: 'How it works', icon: HelpCircle, enabled: false, hint: 'v2' }
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
        <div className="flex h-[var(--topbar-height)] shrink-0 items-center border-b border-[var(--glass-border)] px-4">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden" aria-label="Layak home">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-heading text-sm font-semibold text-primary-foreground">
              L
            </div>
            <span
              className={cn(
                'font-heading text-base font-semibold tracking-tight transition-opacity duration-200',
                isCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
              )}
            >
              Layak
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = item.enabled && pathname === item.href
            const body = (
              <span
                className={cn(
                  'flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  !item.enabled && 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-sidebar-foreground/80'
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span
                  className={cn(
                    'flex flex-1 items-center justify-between gap-2 overflow-hidden transition-opacity duration-200',
                    isCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  {item.hint ? (
                    <Badge variant="outline" className="shrink-0 px-1.5 py-0 text-[10px] font-normal">
                      {item.hint}
                    </Badge>
                  ) : null}
                </span>
              </span>
            )
            if (item.enabled) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  {body}
                </Link>
              )
            }
            return (
              <span key={item.label} role="link" aria-disabled aria-label={item.label}>
                {body}
              </span>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-[var(--glass-border)] px-3 py-3">
          <p
            className={cn(
              'text-[11px] leading-relaxed text-sidebar-foreground/60 transition-opacity duration-200',
              isCollapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
            )}
          >
            DRAFT packets only. Not affiliated with any government agency.
          </p>
        </div>
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
          'w-[var(--sidebar-current-width)] transition-[width] duration-200 ease-in-out',
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
          'fixed inset-0 z-[25] hidden bg-black/20 transition-opacity duration-200 md:block',
          collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
        )}
      />

      <div
        aria-hidden
        onClick={onMobileClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col overflow-hidden bg-sidebar text-sidebar-foreground',
          'transition-transform duration-200 ease-in-out md:hidden',
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
