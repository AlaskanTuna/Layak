'use client'

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, onIdTokenChanged, type User } from 'firebase/auth'

import { getFirebaseAuth } from '@/lib/firebase'

export type Role = 'user' | 'admin' | null

type AuthState = {
  user: User | null
  role: Role
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, role: null, loading: true })

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

async function readRole(user: User | null): Promise<Role> {
  if (!user) return null
  try {
    const token = await user.getIdToken()
    const res = await fetch(`${getBackendUrl()}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) {
      // Backend unreachable / 5xx — treat as regular user; the AuthGuard
      // will redirect any admin-only route to `/dashboard`, which is the
      // correct fail-closed default for an RBAC check.
      return 'user'
    }
    const data: { role?: string } = await res.json()
    return data.role === 'admin' ? 'admin' : 'user'
  } catch {
    return 'user'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true })

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      const role = await readRole(user)
      setState({ user, role, loading: false })
    })
    // Token refreshes (e.g. after `getIdToken(true)`) land here. The role
    // itself doesn't live in the token any more — it's a Firestore field
    // read via `/api/user/me` — so we re-fetch on token refresh in case
    // an admin's role was added/removed server-side between sessions.
    const unsubToken = onIdTokenChanged(auth, async (user) => {
      const role = await readRole(user)
      setState((prev) => ({ ...prev, user, role, loading: false }))
    })
    return () => {
      unsubAuth()
      unsubToken()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
