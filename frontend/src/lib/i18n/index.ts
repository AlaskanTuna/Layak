'use client'

import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import ms from './locales/ms.json'
import zh from './locales/zh.json'

export const SUPPORTED_LANGUAGES = ['en', 'ms', 'zh'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

// Human-readable names rendered inside the language dropdown. The Chinese +
// Malay names are in their own scripts so a user who can't read the current
// UI language can still identify their option.
export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  ms: 'Bahasa Malaysia',
  zh: '简体中文'
}

// `<html lang>` values. `ms-MY` / `zh-CN` let screen readers and
// `Intl.DateTimeFormat` pick the correct locale for dates + numbers.
export const HTML_LANG: Record<SupportedLanguage, string> = {
  en: 'en-MY',
  ms: 'ms-MY',
  zh: 'zh-CN'
}

// Singleton guard — Next.js App Router re-evaluates client modules on fast
// refresh, and re-running `.init()` would reset the language detector state.
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        ms: { translation: ms },
        zh: { translation: zh }
      },
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
      // `nonExplicitSupportedLngs: true` treats `zh-Hans` / `zh-TW` as `zh`,
      // and `en-GB` / `en-US` as `en` — keeps the supported list minimal
      // without dropping regional browser preferences on first visit.
      nonExplicitSupportedLngs: true,
      interpolation: { escapeValue: false },
      detection: {
        // localStorage first so an explicit user choice outranks the browser
        // preference on return visits; falls back to navigator.languages and
        // finally `fallbackLng`.
        order: ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: 'layak.lng',
        caches: ['localStorage']
      },
      react: {
        // Without this, `useTranslation` re-renders on every i18next event;
        // limit to the ones we actually react to.
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed'
      }
    })
}

export default i18n
