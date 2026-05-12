'use client'

import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuth, type Role } from '@/lib/auth-context'

type AuthGuardProps = {
  children: ReactNode
  requireRole?: Role
}

export function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, role, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/sign-in')
      return
    }
    if (!requireRole) return
    if (role !== requireRole) {
      router.replace('/dashboard')
    }
  }, [loading, user, role, requireRole, router])

  const gated = !user || (requireRole != null && role !== requireRole)

  if (loading || gated) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">{t('auth.guard.checkingSession')}</span>
      </div>
    )
  }

  return <>{children}</>
}
