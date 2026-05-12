'use client'

import { useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useAuth, type Role } from '@/lib/auth-context'
import { getFirebaseAuth } from '@/lib/firebase'

type AuthGuardProps = {
  children: ReactNode
  requireRole?: Role
}

export function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, role, loading } = useAuth()
  // When a requireRole route is hit and the token doesn't yet carry the
  // claim, allow one force-refresh round-trip before redirecting. Covers the
  // Firebase custom-claims propagation gap: the backend writes the claim on
  // the first authed request, but the frontend's cached ID token still
  // reflects pre-promotion claims until refreshed.
  const [refreshing, setRefreshing] = useState(false)
  const [refreshTried, setRefreshTried] = useState(false)

  const forceRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const current = getFirebaseAuth().currentUser
      if (current) {
        await current.getIdToken(true)
      }
    } finally {
      setRefreshing(false)
      setRefreshTried(true)
    }
  }, [])

  useEffect(() => {
    if (loading || refreshing) return
    if (!user) {
      router.replace('/sign-in')
      return
    }
    if (!requireRole) return
    if (role === requireRole) return
    if (refreshTried) {
      router.replace('/dashboard')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void forceRefresh()
  }, [loading, user, role, requireRole, refreshing, refreshTried, router, forceRefresh])

  const gated = !user || (requireRole != null && role !== requireRole)

  if (loading || refreshing || gated) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">{t('auth.guard.checkingSession')}</span>
      </div>
    )
  }

  return <>{children}</>
}
