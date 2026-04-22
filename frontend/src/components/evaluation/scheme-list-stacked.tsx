'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Inbox } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { SchemeMatch } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

type Props = {
  matches: SchemeMatch[]
  empty?: boolean
}

function formatRm(value: number): string {
  return value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function SchemeRow({ match }: { match: SchemeMatch }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <li className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-heading text-lg font-semibold tracking-tight">{match.scheme_name}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{match.summary}</p>
        </div>
        <div className="shrink-0 text-left tabular-nums sm:text-right">
          <p className="font-heading">
            <span className="text-lg font-normal text-muted-foreground">{t('evaluation.upside.currency')}</span>{' '}
            <span className="text-2xl font-semibold text-primary">{formatRm(match.annual_rm)}</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t('evaluation.schemeCard.perYearEst')}</p>
        </div>
      </div>
      <div className="mt-3 flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-0 text-primary hover:bg-transparent"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUp className="mr-1.5 size-4" aria-hidden />
          ) : (
            <ChevronDown className="mr-1.5 size-4" aria-hidden />
          )}
          {t('evaluation.schemeCard.whyIQualify')}
        </Button>
      </div>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
            <p className="text-sm leading-relaxed">{match.why_qualify}</p>
            <a
              href={match.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
            >
              <ExternalLink className="size-3" aria-hidden />
              {t('evaluation.schemeCard.openAgencyPortal', { agency: match.agency })}
            </a>
          </div>
        </div>
      </div>
    </li>
  )
}

export function SchemeListStacked({ matches, empty = false }: Props) {
  const { t } = useTranslation()
  // Phase 7 Task 9 — filter out `required_contribution` kinds (SKSPS etc.);
  // they render in the separate `<RequiredContributionsCard>` block.
  const qualifying = matches
    .filter(m => m.qualifies && (m.kind ?? 'upside') === 'upside')
    .sort((a, b) => b.annual_rm - a.annual_rm)
  const count = empty ? 0 : qualifying.length

  return (
    <section className="flex flex-col gap-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {t('evaluation.schemeCard.eligibleSchemesCount', { count: empty ? '—' : count })}
      </p>
      {empty || qualifying.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Inbox className="size-5" aria-hidden />
          </div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{t('dashboard.activeApplications.empty')}</p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            {t('evaluation.schemeCard.emptyList')}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {qualifying.map(match => (
            <SchemeRow key={match.scheme_id} match={match} />
          ))}
        </ul>
      )}
    </section>
  )
}
