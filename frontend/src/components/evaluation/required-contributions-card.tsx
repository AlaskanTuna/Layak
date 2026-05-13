'use client'

import { ArrowUpRight, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { SchemeMatch } from '@/lib/agent-types'
import { localisedSchemeName } from '@/lib/scheme-name'

type Props = {
  matches: SchemeMatch[]
}

function formatRm(value: number): string {
  return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Surfaces `kind === 'required_contribution'` matches (e.g. PERKESO SKSPS
 * mandatory contribution for gig drivers under Akta 789). Mirrors the visual
 * structure of `SchemeCardGrid` so the page reads as a coherent set of
 * sections — heading + card grid — distinguished only by the amber accent
 * tone (you PAY into these schemes, you don't receive from them).
 *
 * Renders nothing when there are no contribution matches.
 */
export function RequiredContributionsCard({ matches }: Props) {
  const { t } = useTranslation()
  const contributions = matches.filter((m) => m.qualifies && m.kind === 'required_contribution')

  if (contributions.length === 0) return null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {t('evaluation.requiredContributions.heading')}
        </h2>
        <span className="mono-caption text-foreground/55">
          {contributions.length === 1
            ? t('evaluation.requiredContributions.countSingular', { count: contributions.length })
            : t('evaluation.requiredContributions.countPlural', { count: contributions.length })}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contributions.map((match) => {
          const annualRm = match.annual_contribution_rm ?? 0
          return (
            <li
              key={match.scheme_id}
              className="paper-card relative flex flex-col gap-4 rounded-[14px] p-5 transition-shadow hover:shadow-[0_24px_50px_-22px_color-mix(in_oklch,var(--ink)_28%,transparent)]"
            >
              <header className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="mono-caption text-amber-700 dark:text-amber-300">
                    {t('evaluation.requiredContributions.categoryLabel')}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/12 px-2 py-0.5 mono-caption text-[9.5px] text-amber-700 dark:text-amber-300">
                    <ShieldAlert className="size-3" aria-hidden />
                    {t('evaluation.requiredContributions.badge')}
                  </span>
                </div>
                <h3 className="font-heading text-base font-semibold tracking-tight">
                  {localisedSchemeName(t, match.scheme_id, match.scheme_name)}
                </h3>
                <p className="text-xs leading-relaxed text-foreground/65">{match.summary}</p>
              </header>

              <div className="flex flex-1 flex-col gap-1 rounded-md border border-amber-500/20 bg-amber-500/[0.05] p-3">
                <p className="mono-caption text-amber-700 dark:text-amber-300">
                  {t('evaluation.requiredContributions.annualLabel')}
                </p>
                <p className="font-heading text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatRm(annualRm)}
                </p>
              </div>

              <footer className="flex items-center justify-between gap-3 border-t border-foreground/10 pt-3">
                <span className="mono-caption text-foreground/55">{match.agency}</span>
                <Button
                  render={<a href={match.portal_url} target="_blank" rel="noopener noreferrer" />}
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                >
                  {t('evaluation.requiredContributions.portalCta')}
                  <ArrowUpRight className="ml-1 size-3.5" aria-hidden />
                </Button>
              </footer>
            </li>
          )
        })}
      </ul>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t('evaluation.requiredContributions.footnote')}
      </p>
    </section>
  )
}
