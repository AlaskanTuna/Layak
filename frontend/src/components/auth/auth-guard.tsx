'use client'

import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuth } from '@/lib/auth-context'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in')
    }
  }, [loading, user, router])

  if (loading || !user) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-svh items-center justify-center"
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">{t('auth.guard.checkingSession')}</span>
      </div>
    )
  }

  return <>{children}</>
}
