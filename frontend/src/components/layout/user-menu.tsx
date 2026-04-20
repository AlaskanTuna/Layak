'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { LogOut, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(v => !v)}
        className="size-8"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          G
        </span>
      </Button>
      <div
        role="menu"
        aria-hidden={!isOpen}
        className={cn(
          'absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-xl',
          'origin-top-right transition-all duration-200',
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        )}
      >
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-sm font-medium">Guest</p>
          <p className="text-xs text-muted-foreground">Signed in as guest</p>
        </div>
        <div className="p-1">
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/60"
          >
            <Settings className="size-4" aria-hidden />
            Settings
          </Link>
        </div>
        <div className="border-t border-border p-1">
          <Link
            href="/sign-in"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </Link>
        </div>
      </div>
    </div>
  )
}
