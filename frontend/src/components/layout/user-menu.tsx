'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { LogOut, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { signOutCurrentUser } from '@/lib/firebase'
import { cn } from '@/lib/utils'

export function UserMenu() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
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

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOutCurrentUser()
      setIsOpen(false)
      router.replace('/sign-in')
    } catch {
      setSigningOut(false)
    }
  }

  const displayName = user?.displayName ?? user?.email ?? t('common.aria.accountMenu')
  const email = user?.email ?? ''
  const initial = (user?.displayName || user?.email || 'A').charAt(0).toUpperCase()

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('common.aria.accountMenu')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className="size-8"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {initial}
        </span>
      </Button>
      <div
        role="menu"
        aria-hidden={!isOpen}
        className={cn(
          'absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border/70 bg-card/96 supports-[backdrop-filter]:bg-card/88 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_28px_72px_rgb(15_23_42/0.16),inset_0_1px_0_rgb(255_255_255/0.42)] dark:bg-card/95 dark:supports-[backdrop-filter]:bg-card/82 dark:shadow-[0_28px_72px_rgb(0_0_0/0.48),inset_0_1px_0_rgb(255_255_255/0.08)]',
          'origin-top-right transition-all duration-200',
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        )}
      >
        <div className="border-b border-border px-3 py-2.5">
          <p className="truncate text-sm font-medium">{displayName}</p>
          {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
        </div>
        <div className="p-1">
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/60"
          >
            <Settings className="size-4" aria-hidden />
            {t('common.nav.settings')}
          </Link>
        </div>
        <div className="border-t border-border p-1">
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden />
            {signingOut ? t('common.button.signingOut') : t('common.button.signOut')}
          </button>
        </div>
      </div>
    </div>
  )
}
