'use client'

import { useEffect, useRef } from 'react'

import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import { authedFetch } from '@/lib/firebase'

// Debounce window for the PATCH — rapid toggling (e.g. a user scanning
// through the dropdown) should coalesce into a single server write instead
// of firing one PATCH per key press.
const PATCH_DEBOUNCE_MS = 200

function backendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

function isSupported(lng: string): lng is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lng)
}

/**
 * Phase 9 — bridges i18next and `users/{uid}.language`:
 *
 * 1. **Hydrate on auth-ready.** First time `useAuth()` resolves to a signed-in
 *    user, GET `/api/user/me` and flip i18next if the server-stored language
 *    differs from whatever localStorage / the browser preference produced.
 *    Server outranks localStorage so a language picked on device A shows up
 *    on device B immediately.
 * 2. **Persist on change.** Listen for i18next `languageChanged` and PATCH
 *    `/api/user/preferences` (debounced so rapid toggles coalesce).
 *
 * Sits inside `<AuthProvider>` so `useAuth()` resolves; rendered near the
 * root of the tree so language sync runs globally across every authed page.
 */
export function LanguageSync({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const hydratedUidRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate on the first render where auth resolves to a signed-in user.
  // The ref gates re-hydration on subsequent re-renders and on sign-out →
  // sign-in-as-someone-else (different uid → re-hydrate).
  useEffect(() => {
    if (loading || !user) return
    if (hydratedUidRef.current === user.uid) return
    hydratedUidRef.current = user.uid

    void (async () => {
      try {
        const res = await authedFetch(`${backendUrl()}/api/user/me`, { method: 'GET' })
        if (!res.ok) return
        const body = (await res.json()) as { language?: string }
        const serverLang = body.language
        if (serverLang && isSupported(serverLang) && serverLang !== i18n.language) {
          await i18n.changeLanguage(serverLang)
        }
      } catch {
        // Non-fatal — the UI already has localStorage / browser-detected
        // language. Server sync is best-effort.
      }
    })()
  }, [loading, user])

  // Persist on change. The listener fires on every `i18n.changeLanguage(...)`
  // including the hydration flip above — that's fine: the PATCH is a no-op
  // when the server already stores the value, Firestore deduplicates.
  useEffect(() => {
    function onLanguageChanged(lng: string) {
      if (!isSupported(lng)) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        // Only attempt the PATCH when the user is signed in — pre-auth
        // toggles on the landing page stay in localStorage until sign-in.
        if (!user) return
        void authedFetch(`${backendUrl()}/api/user/preferences`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: lng })
        }).catch(() => {
          // Best-effort — UI already flipped; a Firestore outage shouldn't
          // surface an error toast for what's essentially a preference tweak.
        })
      }, PATCH_DEBOUNCE_MS)
    }

    i18n.on('languageChanged', onLanguageChanged)
    return () => {
      i18n.off('languageChanged', onLanguageChanged)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [user])

  return <>{children}</>
}
