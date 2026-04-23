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
  // Phase 7 Task 9 — keep only upside schemes in the ranked grid. Required-
  // contribution entries (e.g. PERKESO SKSPS) render separately in
  // `<RequiredContributionsCard>` so their RM amounts don't get visually
  // confused with annual relief the user would receive.
  const qualifying = matches
    .filter(m => m.qualifies && (m.kind ?? 'upside') === 'upside')
    .sort((a, b) => b.annual_rm - a.annual_rm)

  if (qualifying.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {t('evaluation.schemeCard.noMatches')}
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">{t('evaluation.schemeCard.heading')}</h2>
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
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
              className={cn(
                'flex flex-col gap-4 rounded-xl border p-5 transition-colors',
                isTop ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
              )}
            >
              <header className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-[0.14em] text-primary">{category}</span>
                <h3 className="font-heading text-base font-semibold tracking-tight">
                  {localisedSchemeName(t, match.scheme_id, match.scheme_name)}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{match.summary}</p>
              </header>

              <div className="flex flex-1 flex-col gap-1 rounded-md border border-border/60 bg-background/60 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {t('evaluation.schemeCard.whyQualify')}
                </p>
                <p className="text-xs leading-relaxed">{match.why_qualify}</p>
              </div>

              <footer className="flex items-end justify-between gap-3">
                <div className="flex flex-col">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t('evaluation.schemeCard.estValue')}</p>
                  <p className="font-heading text-sm font-semibold">{formatRm(match.annual_rm)}</p>
                </div>
                <Button
                  render={<a href={match.portal_url} target="_blank" rel="noopener noreferrer" />}
                  size="sm"
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
