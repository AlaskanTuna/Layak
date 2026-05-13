'use client'

import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import {
  type Auth,
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  signOut as firebaseSignOut,
  setPersistence,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User
} from 'firebase/auth'

// Mirrors backend/app/auth.py:GUEST_UID. Used by the public-access guest
// sign-in flow and as a settings-page guard so the shared demo account
// can't be self-destructed by any single judge.
export const GUEST_UID = 'guest-demo'

function getGuestApiBase(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

function assertConfig(): void {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  if (missing.length > 0) {
    throw new Error(`Missing Firebase Web config keys: ${missing.join(', ')}. Populate NEXT_PUBLIC_FIREBASE_* in .env.`)
  }
}

let cachedApp: FirebaseApp | null = null
let cachedAuth: Auth | null = null

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp
  assertConfig()
  cachedApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  return cachedApp
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth
  cachedAuth = getAuth(getFirebaseApp())
  return cachedAuth
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(getFirebaseAuth(), provider)
  return result.user
}

export async function signInWithEmail(
  email: string,
  password: string,
  remember: boolean = true
): Promise<User> {
  const auth = getFirebaseAuth()
  // Firebase ignores `setPersistence` if it can't write to the chosen store
  // (private-mode Safari, strict ITP) — failing here would block the whole
  // sign-in, so let it fall through silently and continue with the default.
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence).catch(
    () => undefined
  )
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<User> {
  const result = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
  if (displayName) {
    await updateProfile(result.user, { displayName })
  }
  return result.user
}

export async function signInAsGuest(): Promise<User> {
  const res = await fetch(`${getGuestApiBase()}/api/auth/guest-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) {
    throw new Error(`Guest sign-in failed: ${res.status} ${res.statusText}`)
  }
  const { customToken } = (await res.json()) as { customToken: string }
  if (!customToken) {
    throw new Error('Guest sign-in returned an empty token')
  }
  const result = await signInWithCustomToken(getFirebaseAuth(), customToken)
  return result.user
}

export async function signOutCurrentUser(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth())
}

export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const user = getFirebaseAuth().currentUser
  const headers = new Headers(init.headers)
  if (user) {
    const token = await user.getIdToken()
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(input, { ...init, headers })
}
