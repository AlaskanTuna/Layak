'use client'

import { ArrowRight, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SchemeVerifiedBadge } from '@/components/schemes/scheme-verified-badge'
import { Button } from '@/components/ui/button'
import type { SchemeDelta, SchemeMatch } from '@/lib/agent-types'
import { localisedSchemeName } from '@/lib/scheme-name'
import { cn } from '@/lib/utils'

type Props = {
  matches: SchemeMatch[]
  /** Phase 11 Feature 3 — when present, render per-scheme delta chips
   *  below each card's footer. `null` while what-if hasn't been run. */
  deltas?: SchemeDelta[] | null
  /** Filter to a single scheme kind. Defaults to `upside` so the legacy
   *  call site (Eligible Schemes) keeps its meaning; pass `subsidy_credit`
   *  to render the Subsidies section. */
  kind?: 'upside' | 'subsidy_credit'
  /** Toggle the SchemeVerifiedBadge under each card footer. Off on the
   *  Eligible Schemes grid because the citation is already implied by the
   *  scheme name; subsidies still surface the badge so the user trusts the
   *  auto-credit claim. */
  showVerifiedBadge?: boolean
  /** Optional override for the section heading. Falls back to the i18n key
   *  matching the resolved `kind`. */
  heading?: string
  /** When true, suppress the inner section heading so a parent can provide
   *  its own. The matches-count chip is also suppressed. */
  hideHeading?: boolean
}


function formatRm(value: number): string {
  return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function categoryKeyFor(match: SchemeMatch): 'cashTransfer' | 'taxRelief' | 'welfare' | 'subsidy' | 'assistance' {
  if (match.kind === 'subsidy_credit') return 'subsidy'
  const agency = match.agency.toLowerCase()
  const id = match.scheme_id.toLowerCase()
  if (id.includes('str') || agency.includes('treasury')) return 'cashTransfer'
  if (agency.includes('lhdn')) return 'taxRelief'
  if (agency.includes('jkm')) return 'welfare'
  return 'assistance'
}

/** Format an ISO date string (e.g. "2026-12-31") as a locale-aware short
 * date (e.g. "Dec 31, 2026" / "31 Dis 2026" / "2026年12月31日"). Falls
 * back to the raw ISO string if parsing fails. */
function formatExpiryDate(iso: string, locale: string): string {
  const parsed = new Date(iso + 'T00:00:00')
  if (Number.isNaN(parsed.getTime())) return iso
  const intlLocale = locale === 'ms' ? 'ms-MY' : locale === 'zh' ? 'zh-CN' : 'en-MY'
  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(parsed)
}

export function SchemeCardGrid({
  matches,
  deltas,
  kind = 'upside',
  showVerifiedBadge = true,
  heading,
  hideHeading = false
}: Props) {
  const { t, i18n } = useTranslation()
  const deltaByScheme = new Map<string, SchemeDelta>()
  for (const d of deltas ?? []) {
    deltaByScheme.set(d.scheme_id, d)
  }
  // Phase 12: each call site renders a single kind so `Eligible Schemes`
  // (upside) and `Subsidies` (subsidy_credit) can live in their own page
  // subsections. `required_contribution` entries (e.g. PERKESO SKSPS) still
  // render separately in `<RequiredContributionsCard>` so RM amounts don't
  // get visually confused with annual relief the user would receive.
  const qualifying = matches
    .filter((m) => {
      if (!m.qualifies) return false
      const matchKind = (m.kind ?? 'upside') as 'upside' | 'subsidy_credit' | 'required_contribution'
      return matchKind === kind
    })
    .slice()
    .sort((a, b) => b.annual_rm - a.annual_rm)

  if (qualifying.length === 0) {
    return null
  }

  const sectionHeading =
    heading ??
    (kind === 'subsidy_credit'
      ? t('evaluation.subsidies.title')
      : t('evaluation.schemeCard.heading'))

  return (
    <section className="flex flex-col gap-4">
      {!hideHeading && (
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-lg font-semibold tracking-tight">{sectionHeading}</h2>
          <span className="mono-caption text-foreground/55">
            {qualifying.length === 1
              ? t('evaluation.schemeCard.matchesSingular', { count: qualifying.length })
              : t('evaluation.schemeCard.matchesPlural', { count: qualifying.length })}
          </span>
        </div>
      )}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {qualifying.map((match, index) => {
          const isSubsidy = (match.kind ?? 'upside') === 'subsidy_credit'
          // "Top match" badge only applies to the leading upside card.
          const isTop = index === 0 && !isSubsidy
          const categoryKey = categoryKeyFor(match)
          const category =
            categoryKey === 'cashTransfer'
              ? t('schemes.labels.cashTransfer')
              : categoryKey === 'taxRelief'
                ? t('schemes.labels.taxRelief')
                : categoryKey === 'welfare'
                  ? t('schemes.labels.welfare')
                  : categoryKey === 'subsidy'
                    ? t('evaluation.schemeCard.categorySubsidy')
                    : t('evaluation.schemeCard.categoryAssistance')
          return (
            <li
              key={match.scheme_id}
              id={`scheme-${match.scheme_id}`}
              className={cn(
                'paper-card relative isolate flex scroll-mt-24 flex-col gap-4 overflow-hidden rounded-[14px] p-5 transition-shadow hover:shadow-[0_24px_50px_-22px_color-mix(in_oklch,var(--ink)_28%,transparent)]'
              )}
            >
              <header className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'mono-caption',
                      isSubsidy ? 'text-[color:var(--hibiscus)]' : 'text-[color:var(--primary)]'
                    )}
                  >
                    {category}
                  </span>
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

              {isSubsidy ? (
                <footer className="flex items-end justify-between gap-3 border-t border-foreground/10 pt-3">
                  <div className="flex flex-col gap-1">
                    <p className="mono-caption text-foreground/55">
                      {t('evaluation.schemeCard.subsidyInfo')}
                    </p>
                    <p className="text-xs leading-[1.4] text-foreground/80">
                      {t('evaluation.schemeCard.subsidyAutoCredited')}
                    </p>
                    {match.expires_at_iso && (
                      <p className="text-[12px] font-bold text-[color:var(--hibiscus)]">
                        {t('evaluation.schemeCard.expiresOn', {
                          date: formatExpiryDate(match.expires_at_iso, i18n.language)
                        })}
                      </p>
                    )}
                    {showVerifiedBadge && <SchemeVerifiedBadge schemeId={match.scheme_id} />}
                  </div>
                  <Button
                    render={<a href={match.portal_url} target="_blank" rel="noopener noreferrer" />}
                    size="sm"
                    variant="outline"
                    className="rounded-full border-[color:var(--hibiscus)]/55 hover:border-[color:var(--hibiscus)] hover:bg-[color:var(--hibiscus)]/8 dark:hover:bg-[color:var(--hibiscus)]/12"
                  >
                    {t('evaluation.schemeCard.checkBalance')}
                    <ExternalLink className="ml-1 size-3.5 text-[color:var(--hibiscus)]" aria-hidden />
                  </Button>
                </footer>
              ) : (
                <footer className="flex items-end justify-between gap-3 border-t border-foreground/10 pt-3">
                  <div className="flex flex-col gap-1">
                    <p className="mono-caption text-foreground/55">{t('evaluation.schemeCard.estValue')}</p>
                    <p className="font-heading text-[15px] font-semibold tabular-nums text-foreground">
                      {formatRm(match.annual_rm)}
                    </p>
                    {showVerifiedBadge && <SchemeVerifiedBadge schemeId={match.scheme_id} />}
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
              )}

              {/* Phase 11 Feature 3 — what-if delta chip under the footer.
                  Renders only when the user has dragged a slider and the
                  rerun has landed. `unchanged` is silent. */}
              <DeltaChip delta={deltaByScheme.get(match.scheme_id)} t={t} />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function DeltaChip({
  delta,
  t
}: {
  delta: SchemeDelta | undefined
  t: ReturnType<typeof useTranslation>['t']
}) {
  if (!delta || delta.status === 'unchanged') return null
  const tone =
    delta.status === 'lost'
      ? 'border-destructive/40 bg-destructive/10 text-destructive'
      : delta.status === 'gained'
        ? 'border-[color:var(--forest)]/40 bg-[color:var(--forest)]/10 text-[color:var(--forest)]'
        : 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
  let label = ''
  if (delta.status === 'gained' && delta.new_annual_rm != null) {
    label = t('evaluation.whatIf.deltaChip.gained', {
      amount: Math.round(delta.new_annual_rm).toLocaleString('en-MY')
    })
  } else if (delta.status === 'lost' && delta.baseline_annual_rm != null) {
    label = t('evaluation.whatIf.deltaChip.lost', {
      amount: Math.round(delta.baseline_annual_rm).toLocaleString('en-MY')
    })
  } else if (delta.status === 'tier_changed') {
    label = t('evaluation.whatIf.deltaChip.tier_changed', { note: delta.note ?? '' })
  } else if (delta.status === 'amount_changed') {
    label = t('evaluation.whatIf.deltaChip.amount_changed', {
      sign: delta.delta_rm >= 0 ? '+' : '−',
      amount: Math.round(Math.abs(delta.delta_rm)).toLocaleString('en-MY')
    })
  }
  return (
    <div
      className={cn(
        'mt-2 inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.1em]',
        tone
      )}
      role="status"
    >
      {label}
    </div>
  )
}
