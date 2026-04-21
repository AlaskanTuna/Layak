'use client'

import { useRouter } from 'next/navigation'
import { type ReactNode, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

import { useAuth } from '@/lib/auth-context'

export function AuthGuard({ children }: { children: ReactNode }) {
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
        <span className="sr-only">Checking your session…</span>
      </div>
    )
  }

  return <>{children}</>
}
