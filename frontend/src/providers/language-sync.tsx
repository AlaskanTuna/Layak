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

// `detection.lookupLocalStorage` key from i18n/index.ts. The presence of this
// key is the signal that the user explicitly picked a language in this
// browser — it's only written by i18next-browser-languagedetector's
// `caches: ['localStorage']` after a `changeLanguage` call.
const LANG_LS_KEY = 'layak.lng'

function readLocalStorageLang(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(LANG_LS_KEY)
  } catch {
    return null
  }
}

async function patchPreferences(lng: SupportedLanguage): Promise<void> {
  try {
    await authedFetch(`${backendUrl()}/api/user/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lng })
    })
  } catch {
    // Best-effort — UI already flipped; a Firestore outage shouldn't
    // surface an error toast for what's essentially a preference tweak.
  }
}

/**
 * Phase 9 — bridges i18next and `users/{uid}.language`:
 *
 * 1. **Hydrate on auth-ready.** First time `useAuth()` resolves to a signed-in
 *    user, GET `/api/user/me`. Resolution rule:
 *    - If the browser has a cached language choice (`localStorage.layak.lng`
 *      is set), treat that as the user's explicit intent. If it differs from
 *      the server value, PATCH the server UP rather than flipping the UI
 *      DOWN — otherwise a user who picked Bahasa Malaysia before Phase 9
 *      landed (server still `"en"` default) gets silently reset on refresh.
 *    - If the browser has no cached choice (fresh device), adopt the
 *      server language so device-B picks up the device-A preference.
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
        if (!serverLang || !isSupported(serverLang)) return

        const cachedLang = readLocalStorageLang()
        const hasExplicitBrowserChoice = cachedLang !== null && isSupported(cachedLang)

        if (hasExplicitBrowserChoice && cachedLang !== serverLang) {
          // Browser disagrees with server. Treat localStorage as the user's
          // explicit intent (they toggled the dropdown here) and push UP to
          // the server instead of silently flipping the UI DOWN.
          if (cachedLang !== i18n.language) {
            await i18n.changeLanguage(cachedLang)
          }
          await patchPreferences(cachedLang as SupportedLanguage)
          return
        }

        // No explicit browser choice (or it already agrees with server) —
        // adopt the server value so cross-device sync works.
        if (serverLang !== i18n.language) {
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
        void patchPreferences(lng)
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
