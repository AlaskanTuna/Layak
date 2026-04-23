import type { TFunction } from 'i18next'

import type { SchemeId } from '@/lib/agent-types'

/**
 * Render the scheme name in the user's language.
 *
 * The backend's `SchemeMatch.scheme_name` is built at match-time with an
 * English descriptor suffix (e.g. "JKM Bantuan Kanak-Kanak — per-child
 * monthly payment"). The proper-noun prefix (agency + scheme acronym) stays
 * as-is across languages; only the descriptive suffix after the em-dash
 * localises via the `schemes.namesById` i18n map.
 *
 * `fallback` is the backend-supplied name: if the map has no entry for the
 * scheme (e.g. a new scheme shipped server-side before the locale bundle
 * catches up), we render what the backend sent rather than an empty string.
 */
export function localisedSchemeName(
  t: TFunction,
  schemeId: SchemeId,
  fallback: string
): string {
  const key = `schemes.namesById.${schemeId}`
  const translated = t(key, { defaultValue: fallback })
  return translated
}
