'use client'

import { ExternalLink, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
 * mandatory contribution for gig drivers under Akta 789) in a dedicated
 * block beneath the upside ranked list. These are schemes the user PAYS
 * into, not ones they receive from — distinguishing them visually avoids
 * a misleading "RM X,XXX upside" conflation.
 *
 * Renders nothing when there are no contribution matches, so it can safely
 * be dropped into any results layout without adding conditional render
 * scaffolding at the call site.
 */
export function RequiredContributionsCard({ matches }: Props) {
  const { t } = useTranslation()
  const contributions = matches.filter((m) => m.qualifies && m.kind === 'required_contribution')

  if (contributions.length === 0) return null

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5"
      aria-label={t('evaluation.requiredContributions.heading')}
    >
      <header className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <ShieldCheck className="size-4" aria-hidden />
        </div>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            {t('evaluation.requiredContributions.heading')}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('evaluation.requiredContributions.intro')}</p>
        </div>
      </header>

      <ul className="flex flex-col gap-3">
        {contributions.map((match) => {
          const annualRm = match.annual_contribution_rm ?? 0
          return (
            <li
              key={match.scheme_id}
              className="flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="font-heading text-sm font-semibold tracking-tight">
                  {localisedSchemeName(t, match.scheme_id, match.scheme_name)}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{match.summary}</p>
              </div>
              <div className="shrink-0 text-left tabular-nums sm:text-right">
                <p className="font-heading">
                  <span className="text-xs text-muted-foreground">
                    {t('evaluation.requiredContributions.annualLabel')}
                  </span>
                  <br />
                  <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">{formatRm(annualRm)}</span>
                </p>
                <a
                  href={match.portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
                >
                  <ExternalLink className="size-3" aria-hidden />
                  {t('evaluation.schemeCard.openAgencyPortal', { agency: match.agency })}
                </a>
              </div>
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
