# i18n — English + Bahasa Malaysia + Simplified Chinese

The UI layer supports three languages. The dropdown next to the theme toggle in the header switches at runtime; the choice is persisted to `localStorage` under key `layak.lng`.

## What's translated

Every English string rendered by the frontend components under `frontend/src/{app,components}/` — marketing copy, auth flows, dashboard chrome, upload widget, manual entry form, evaluation stepper, results page, settings, PDPA privacy / terms, footer, error banners, `aria-label`s on icon-only buttons, and input placeholders.

## What's explicitly NOT translated

These stay in their source language, by design:

- **Backend-generated content.** Gemini responses (classify reasoning, match rationale, `compute_upside` Python stdout) are emitted by the agent pipeline in the language the prompt produced. Translating them client-side would break citation grounding.
- **Scheme names + legal references.** "Sumbangan Tunai Rahmah", "JKM Warga Emas", "LHDN Form B", "Form BK-01", "JKM18" are proper nouns from the committed government PDFs — they must match the source so citations remain verifiable.
- **Cited passages from scheme PDFs** — the passage snippets returned by the rule engine are rendered verbatim from their source-language government documents.
- **Currency amounts.** "RM8,208" format is kept across all three locales because it's the Malaysian convention every user recognises.
- **Agency acronyms.** LHDN, JKM, JPN, KWSP, LHDNM, TNB, MyKad, STR are kept as-is.
- **Brand names.** Grab, Foodpanda, Google, Firebase, Gemini, Vertex AI, Cloud Run, WeasyPrint.
- **Watermark text.** "DRAFT — NOT SUBMITTED" is rendered into PDFs by the backend and appears byte-for-byte in the privacy / terms copy; keeping it untranslated avoids a mismatch with what the user actually sees on the downloaded PDF.
- **Effective date of privacy + terms** — fixed textual date ("21 April 2026") that's localised via `Intl.DateTimeFormat` at render time, not through the JSON bundles.

## How to add a key

1. Add to `locales/en.json` under the relevant namespace (`common`, `marketing`, `auth`, `dashboard`, `evaluation`, `schemes`, `settings`). Nested dotted paths are fine (`marketing.hero.description`).
2. Add the corresponding value to `locales/ms.json` and `locales/zh.json`. **A key missing from either non-English file falls back to English silently** — run the audit checks from `docs/plan.md` Phase 6 Task 7 before shipping.
3. Use it: `const { t } = useTranslation(); t('marketing.hero.description')`.

## Interpolation

Placeholders use `{{variable}}` syntax. Plurals that depend on a count use two keys (`matchesSingular` / `matchesPlural`) and `t.call`-site switching rather than i18next's `count` mechanic — simpler and avoids surprises when Chinese / Malay don't mark plurals the same way English does.

## Server components

The singleton in `lib/i18n/index.ts` is marked `'use client'` — don't import it from a server component. For static metadata (`generateMetadata`), keep the English string inline or thread a locale through the request; the header toggle is a client-only switch by design.
