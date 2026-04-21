'use client'

import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'

import i18n, { HTML_LANG, type SupportedLanguage } from '@/lib/i18n'

// Mirrors the active i18next language to `<html lang>` so screen readers and
// `Intl.DateTimeFormat` pick up the correct locale. Runs purely on the client
// — `<html lang="en">` stays the server-rendered default.
export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function applyHtmlLang(lng: string) {
      const normalised = lng.split('-')[0] as SupportedLanguage
      const htmlLang = HTML_LANG[normalised] ?? 'en-MY'
      if (typeof document !== 'undefined') {
        document.documentElement.lang = htmlLang
      }
    }

    applyHtmlLang(i18n.language)
    i18n.on('languageChanged', applyHtmlLang)
    return () => {
      i18n.off('languageChanged', applyHtmlLang)
    }
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
