'use client'

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, onIdTokenChanged, type User } from 'firebase/auth'

import { getFirebaseAuth } from '@/lib/firebase'

export type Role = 'admin' | null

type AuthState = {
  user: User | null
  role: Role
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, role: null, loading: true })

async function readRole(user: User | null): Promise<Role> {
  if (!user) return null
  try {
    const tokenResult = await user.getIdTokenResult()
    return tokenResult.claims.role === 'admin' ? 'admin' : null
  } catch {
    return null
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
    // Token refreshes (claim updates after backend promotion) land here.
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
