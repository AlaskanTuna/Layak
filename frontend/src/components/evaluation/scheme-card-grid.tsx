'use client'

import { useState } from 'react'
import { ArrowRight, ChevronDown, ExternalLink, Quote, Sparkles, TrendingDown, TrendingUp, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { RuleCitation, SchemeDelta, SchemeMatch } from '@/lib/agent-types'
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
  /** Optional override for the section heading. Falls back to the i18n key
   *  matching the resolved `kind`. */
  heading?: string
  /** When true, suppress the inner section heading so a parent can provide
   *  its own. The matches-count chip is also suppressed. */
  hideHeading?: boolean
}

/** Strip backend-supplied multi-line whitespace so each card's body
 *  collapses to a tight paragraph instead of inheriting trailing newlines
 *  or padding from upstream prompt templates. */
function tidyText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function formatRm(value: number): string {
  return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function categoryKeyFor(
  match: SchemeMatch
):
  | 'cashTransfer'
  | 'taxRelief'
  | 'welfare'
  | 'education'
  | 'healthcare'
  | 'retirement'
  | 'subsidy'
  | 'assistance' {
  // Subsidy-credit cards get the more specific category when we know it
  // (PeKa B40 / MySalam → healthcare, RMT / SPBT → education, SARA / MyKasih
  // → cash transfer, BUDI95 → generic subsidy). Keep the catch-all "subsidy"
  // for unknown subsidy_credit matches the discovery agent surfaces later.
  if (match.kind === 'subsidy_credit') {
    const id = match.scheme_id.toLowerCase()
    if (id === 'peka_b40' || id === 'mysalam') return 'healthcare'
    if (id === 'rmt' || id === 'spbt') return 'education'
    if (id === 'sara' || id === 'mykasih') return 'cashTransfer'
    return 'subsidy'
  }
  const agency = match.agency.toLowerCase()
  const id = match.scheme_id.toLowerCase()
  if (id.includes('str') || agency.includes('treasury')) return 'cashTransfer'
  if (agency.includes('lhdn')) return 'taxRelief'
  if (id === 'i_saraan' || id === 'i_suri' || agency.includes('kwsp') || agency.includes('epf')) return 'retirement'
  if (id === 'bap' || id === 'kwapm' || id === 'taska_permata' || agency.includes('kpm') || agency.includes('moe') || agency.includes('permata') || agency.includes('kpwkm')) return 'education'
  if (agency.includes('jkm') || agency.includes('tnb') || agency.includes('petra')) return 'welfare'
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

export function SchemeCardGrid({ matches, deltas, kind = 'upside', heading, hideHeading = false }: Props) {
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
    heading ?? (kind === 'subsidy_credit' ? t('evaluation.subsidies.title') : t('evaluation.schemeCard.heading'))

  return (
    <section className="flex flex-col gap-4">
      {!hideHeading && (
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-xl font-semibold tracking-tight">{sectionHeading}</h2>
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
                  : categoryKey === 'education'
                    ? t('schemes.labels.education')
                    : categoryKey === 'healthcare'
                      ? t('schemes.labels.healthcare')
                      : categoryKey === 'retirement'
                        ? t('schemes.labels.retirement')
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
                <div className="flex min-h-[1.25rem] items-center justify-between gap-2">
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
                <h3 className="line-clamp-2 min-h-[2.5rem] font-heading text-base font-semibold leading-[1.25] tracking-tight">
                  {localisedSchemeName(t, match.scheme_id, match.scheme_name)}
                </h3>
                <p className="line-clamp-3 min-h-[3.4rem] text-xs leading-relaxed text-foreground/65">
                  {tidyText(match.summary)}
                </p>
              </header>

              <WhyQualifyBlock
                label={t('evaluation.schemeCard.whyQualify')}
                text={tidyText(match.why_qualify)}
                hint={t('evaluation.schemeCard.whyQualifyTapReveal')}
              />

              {/* Sources + footer are wrapped so `mt-auto` glues the whole
                  group to the bottom. This pins the Sources disclosure flush
                  above the footer's border-top divider on every card,
                  regardless of how short or long the header content is. */}
              <div className="mt-auto flex flex-col gap-3">
                <SourcesPanel citations={match.rule_citations} t={t} />
                <footer className="flex flex-col gap-3 border-t border-foreground/10 pt-3">
                {/* Unified value row: same `label left / bold value right`
                    structure on both subsidy and upside cards. Color is the
                    only differentiator (hibiscus for subsidy, foreground for
                    upside) so visual hierarchy matches across the grid. */}
                <div className="flex min-h-[2.25rem] items-baseline justify-between gap-3">
                  <p className="mono-caption shrink-0 text-foreground/55">
                    {isSubsidy ? t('evaluation.schemeCard.subsidyInfo') : t('evaluation.schemeCard.estValue')}
                  </p>
                  {isSubsidy ? (
                    <p className="text-right font-heading text-[13px] font-semibold leading-[1.25] text-[color:var(--hibiscus)]">
                      {t('evaluation.schemeCard.subsidyAutoCredited')}
                    </p>
                  ) : (
                    <p className="font-heading text-[15px] font-semibold tabular-nums text-foreground">
                      {formatRm(match.annual_rm)}
                    </p>
                  )}
                </div>
                {isSubsidy && match.expires_at_iso && (
                  <p className="text-right text-[11px] font-medium text-[color:var(--hibiscus)]">
                    {t('evaluation.schemeCard.expiresOn', {
                      date: formatExpiryDate(match.expires_at_iso, i18n.language)
                    })}
                  </p>
                )}
                {/* Phase 11 Feature 3 — what-if delta chip inside the footer
                    so the visual hierarchy stays card-body → footer instead of
                    spilling a status pill outside the action area. */}
                <DeltaChip delta={deltaByScheme.get(match.scheme_id)} t={t} />
                <Button
                  render={<a href={match.portal_url} target="_blank" rel="noopener noreferrer" />}
                  size="sm"
                  variant={isTop && !isSubsidy ? 'default' : 'outline'}
                  className={cn(
                    'w-full rounded-full',
                    isTop && !isSubsidy &&
                      'bg-[color:var(--hibiscus)] text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92',
                    isSubsidy &&
                      'border-[color:var(--hibiscus)]/55 hover:border-[color:var(--hibiscus)] hover:bg-[color:var(--hibiscus)]/8 dark:hover:bg-[color:var(--hibiscus)]/12'
                  )}
                >
                  {isSubsidy ? t('evaluation.schemeCard.checkBalance') : t('evaluation.schemeCard.startApp')}
                  {isSubsidy ? (
                    <ExternalLink className="ml-1 size-3.5 text-[color:var(--hibiscus)]" aria-hidden />
                  ) : (
                    <ArrowRight className="ml-1 size-3.5" aria-hidden />
                  )}
                </Button>
                </footer>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Per-card click-to-reveal spoiler over the AI-generated `why_qualify`
 *  description. Reduces visual noise on a grid of 6-12 cards: the text is
 *  obscured by a heavy blur with cursor-pointer + hover affordance, and
 *  unveils on click. Each instance carries its own reveal state. */
function WhyQualifyBlock({ label, text, hint }: { label: string; text: string; hint: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      aria-expanded={revealed}
      aria-label={revealed ? label : hint}
      disabled={revealed}
      className={cn(
        'group relative flex flex-col gap-1 rounded-md border border-foreground/8 bg-foreground/[0.025] p-3 text-left transition-colors',
        !revealed && 'cursor-pointer hover:bg-foreground/[0.04]',
        revealed && 'cursor-default'
      )}
    >
      <p className="mono-caption text-foreground/55">{label}</p>
      <p
        className={cn(
          'text-xs leading-[1.55] text-foreground/80 transition-[filter] duration-200',
          !revealed && 'select-none blur-[8px]'
        )}
        aria-hidden={!revealed}
      >
        {text}
      </p>
    </button>
  )
}

/** Render the rule's citation list with visual distinction between RAG-retrieved
 *  passages (live Vertex AI Search) and hardcoded fallback citations. Lets a
 *  judge or end-user verify that the eligibility claim is grounded in a
 *  gazetted PDF — the architectural payoff of `services/vertex_ai_search.py`. */
function SourcesPanel({
  citations,
  t
}: {
  citations: RuleCitation[]
  t: ReturnType<typeof useTranslation>['t']
}) {
  if (!citations || citations.length === 0) return null
  return (
    <details className="group rounded-md border border-foreground/8 bg-foreground/[0.02]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 mono-caption text-foreground/65 transition-colors hover:bg-foreground/[0.04] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-1.5">
          <Quote className="size-3.5" aria-hidden />
          {t('evaluation.schemeCard.sourcesLabel', { count: citations.length })}
        </span>
        <ChevronDown className="size-3.5 transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="flex flex-col gap-2.5 border-t border-foreground/8 p-3">
        {citations.map((c, i) => {
          const isRag = c.rule_id.startsWith('rag.') || c.page_ref === 'Vertex AI Search retrieval'
          const isHttp = c.source_url != null && /^https?:\/\//.test(c.source_url)
          return (
            <li key={`${c.rule_id}-${i}`} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em]',
                    isRag
                      ? 'bg-[color:var(--primary)]/12 text-[color:var(--primary)]'
                      : 'bg-foreground/10 text-foreground/65'
                  )}
                >
                  {isRag ? t('evaluation.schemeCard.sourceRagBadge') : t('evaluation.schemeCard.sourceGovBadge')}
                </span>
                <span
                  className="mono-caption min-w-0 truncate text-foreground/55"
                  title={c.source_pdf}
                >
                  {c.source_pdf}
                </span>
              </div>
              <p className="line-clamp-3 text-[11px] leading-[1.5] text-foreground/75">{c.passage}</p>
              {isHttp ? (
                <a
                  href={c.source_url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono-caption inline-flex w-fit items-center gap-1 text-[10px] text-[color:var(--primary)] hover:underline"
                >
                  {t('evaluation.schemeCard.sourceOpen')}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : c.source_url ? (
                // `gs://` URIs (Vertex AI Search hits) aren't browser-openable
                // but are worth surfacing as visible proof the passage came
                // from Discovery Engine, not from a hand-written string.
                <span className="mono-caption inline-flex w-fit items-center text-[10px] text-foreground/45" title={c.source_url}>
                  {c.source_url}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </details>
  )
}

function DeltaChip({ delta, t }: { delta: SchemeDelta | undefined; t: ReturnType<typeof useTranslation>['t'] }) {
  if (!delta || delta.status === 'unchanged') return null

  const isAmountUp = delta.status === 'amount_changed' && delta.delta_rm >= 0
  const isAmountDown = delta.status === 'amount_changed' && delta.delta_rm < 0

  const tone =
    delta.status === 'lost' || isAmountDown
      ? 'border-destructive/35 bg-destructive/8 text-destructive'
      : delta.status === 'gained' || isAmountUp
        ? 'border-[color:var(--forest)]/35 bg-[color:var(--forest)]/8 text-[color:var(--forest)]'
        : 'border-[color:var(--primary)]/35 bg-[color:var(--primary)]/8 text-[color:var(--primary)]'

  const Icon =
    delta.status === 'gained'
      ? Sparkles
      : delta.status === 'lost'
        ? XCircle
        : isAmountDown
          ? TrendingDown
          : delta.status === 'amount_changed'
            ? TrendingUp
            : ArrowRight

  const eyebrow =
    delta.status === 'gained'
      ? t('evaluation.whatIf.deltaChip.eyebrow.gained')
      : delta.status === 'lost'
        ? t('evaluation.whatIf.deltaChip.eyebrow.lost')
        : delta.status === 'tier_changed'
          ? t('evaluation.whatIf.deltaChip.eyebrow.tier_changed')
          : t('evaluation.whatIf.deltaChip.eyebrow.amount_changed')

  // tier_changed renders as a two-line pill: eyebrow on top, the before→after
  // diff (with the backend's ASCII "->" swapped to a unicode arrow) on a
  // second line in sentence-case prose. The other statuses are short labels
  // and fit a single-line pill with the eyebrow as the value's lead-in.
  if (delta.status === 'tier_changed') {
    const note = (delta.note ?? '').replace(/\s*->\s*/g, ' → ')
    const [before, after] = note.split(' → ')
    return (
      <div
        className={cn('inline-flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5', tone)}
        role="status"
      >
        <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="mono-caption text-[9.5px] leading-none opacity-80">{eyebrow}</span>
          <span className="text-[11px] leading-[1.35] text-foreground/85">
            {after ? (
              <>
                <span className="text-foreground/55 line-through decoration-foreground/30">{before}</span>{' '}
                <span className="opacity-60">→</span> <span className="font-medium">{after}</span>
              </>
            ) : (
              note
            )}
          </span>
        </div>
      </div>
    )
  }

  let value = ''
  if (delta.status === 'gained' && delta.new_annual_rm != null) {
    value = `RM ${Math.round(delta.new_annual_rm).toLocaleString('en-MY')}`
  } else if (delta.status === 'lost' && delta.baseline_annual_rm != null) {
    value = `RM ${Math.round(delta.baseline_annual_rm).toLocaleString('en-MY')}`
  } else if (delta.status === 'amount_changed') {
    const sign = delta.delta_rm >= 0 ? '+' : '−'
    value = `${sign}RM ${Math.round(Math.abs(delta.delta_rm)).toLocaleString('en-MY')}`
  }

  return (
    <div
      className={cn('inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1', tone)}
      role="status"
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="mono-caption text-[9.5px] leading-none opacity-85">{eyebrow}</span>
      <span aria-hidden className="opacity-40">·</span>
      <span className="text-[11px] font-semibold tabular-nums leading-none">{value}</span>
    </div>
  )
}
