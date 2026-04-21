'use client'

import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import {
  type Auth,
  GoogleAuthProvider,
  getAuth,
  signOut as firebaseSignOut,
  signInWithPopup,
  type User
} from 'firebase/auth'

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
    throw new Error(
      `Missing Firebase Web config keys: ${missing.join(', ')}. Populate NEXT_PUBLIC_FIREBASE_* in .env.`
    )
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
