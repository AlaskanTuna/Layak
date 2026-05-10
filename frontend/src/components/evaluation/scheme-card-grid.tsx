'use client'

import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { SchemeMatch } from '@/lib/agent-types'
import { localisedSchemeName } from '@/lib/scheme-name'
import { cn } from '@/lib/utils'

type Props = {
  matches: SchemeMatch[]
}

function formatRm(value: number): string {
  return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function categoryKeyFor(match: SchemeMatch): 'cashTransfer' | 'taxRelief' | 'welfare' | 'assistance' {
  const agency = match.agency.toLowerCase()
  const id = match.scheme_id.toLowerCase()
  if (id.includes('str') || agency.includes('treasury')) return 'cashTransfer'
  if (agency.includes('lhdn')) return 'taxRelief'
  if (agency.includes('jkm')) return 'welfare'
  return 'assistance'
}

export function SchemeCardGrid({ matches }: Props) {
  const { t } = useTranslation()
  // Keep only upside schemes in the ranked grid. Required-contribution
  // entries (e.g. PERKESO SKSPS) render separately in
  // `<RequiredContributionsCard>` so their RM amounts don't get visually
  // confused with annual relief the user would receive.
  const qualifying = matches
    .filter((m) => m.qualifies && (m.kind ?? 'upside') === 'upside')
    .sort((a, b) => b.annual_rm - a.annual_rm)

  if (qualifying.length === 0) {
    return (
      <section className="paper-card rounded-[14px] p-6 text-center">
        <p className="text-sm text-foreground/65">{t('evaluation.schemeCard.noMatches')}</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">{t('evaluation.schemeCard.heading')}</h2>
        <span className="mono-caption text-foreground/55">
          {qualifying.length === 1
            ? t('evaluation.schemeCard.matchesSingular', { count: qualifying.length })
            : t('evaluation.schemeCard.matchesPlural', { count: qualifying.length })}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {qualifying.map((match, index) => {
          const isTop = index === 0
          const categoryKey = categoryKeyFor(match)
          const category =
            categoryKey === 'cashTransfer'
              ? t('schemes.labels.cashTransfer')
              : categoryKey === 'taxRelief'
                ? t('schemes.labels.taxRelief')
                : categoryKey === 'welfare'
                  ? t('schemes.labels.welfare')
                  : t('evaluation.schemeCard.categoryAssistance')
          return (
            <li
              key={match.scheme_id}
              id={`scheme-${match.scheme_id}`}
              className={cn(
                'paper-card relative flex scroll-mt-24 flex-col gap-4 rounded-[14px] p-5 transition-shadow hover:shadow-[0_24px_50px_-22px_color-mix(in_oklch,var(--ink)_28%,transparent)]'
              )}
            >
              {isTop && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70"
                />
              )}
              <header className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="mono-caption text-[color:var(--primary)]">{category}</span>
                  {isTop && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--forest)]/35 bg-[color:var(--forest)]/12 px-2 py-0.5 mono-caption text-[9.5px] text-[color:var(--forest)]">
                      <span className="size-1 rounded-full bg-[color:var(--forest)]" />
                      Top match
                    </span>
                  )}
                </div>
                <h3 className="font-heading text-base font-semibold tracking-tight">
                  {localisedSchemeName(t, match.scheme_id, match.scheme_name)}
                </h3>
                <p className="text-xs leading-relaxed text-foreground/65">{match.summary}</p>
              </header>

              <div className="flex flex-1 flex-col gap-1 rounded-md border border-foreground/8 bg-foreground/[0.025] p-3">
                <p className="mono-caption text-foreground/55">
                  {t('evaluation.schemeCard.whyQualify')}
                </p>
                <p className="text-xs leading-[1.55] text-foreground/80">{match.why_qualify}</p>
              </div>

              <footer className="flex items-end justify-between gap-3 border-t border-foreground/10 pt-3">
                <div className="flex flex-col">
                  <p className="mono-caption text-foreground/55">{t('evaluation.schemeCard.estValue')}</p>
                  <p className="font-heading text-[15px] font-semibold tabular-nums text-foreground">
                    {formatRm(match.annual_rm)}
                  </p>
                </div>
                <Button
                  render={<a href={match.portal_url} target="_blank" rel="noopener noreferrer" />}
                  size="sm"
                  className={
                    isTop
                      ? 'rounded-full bg-[color:var(--hibiscus)] text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92'
                      : 'rounded-full'
                  }
                  variant={isTop ? 'default' : 'outline'}
                >
                  {t('evaluation.schemeCard.startApp')}
                  <ArrowRight className="ml-1 size-3.5" aria-hidden />
                </Button>
              </footer>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
