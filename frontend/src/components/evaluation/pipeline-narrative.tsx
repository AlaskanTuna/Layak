'use client'

import { useState } from 'react'
import { AlertCircle, Check, ChevronDown, Loader2, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PipelineState, StepStatus } from '@/hooks/use-agent-pipeline'
import { PIPELINE_STEPS, type Step } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

type Props = {
  state: PipelineState
  /** Optional per-step label overrides — e.g. manual-entry mode replaces
   *  "Extract profile" with "Profile prepared". Forwarded only to the
   *  progress strip; the lay narration uses backend-supplied headlines. */
  labelOverrides?: Partial<Record<Step, string>>
  /** When true, the whole card renders in retrospective mode — collapsed by
   *  default to a single summary line on the persisted results page. */
  retrospective?: boolean
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'complete') return <Check className="size-3.5 text-[color:var(--forest)]" aria-hidden />
  if (status === 'active') return <Loader2 className="size-3.5 animate-spin text-[color:var(--primary)]" aria-hidden />
  if (status === 'error') return <AlertCircle className="size-3.5 text-[color:var(--hibiscus)]" aria-hidden />
  return <div className="size-2 rounded-full border border-foreground/35" aria-hidden />
}

function completedCount(state: PipelineState): number {
  return PIPELINE_STEPS.filter((step) => state.stepStates[step] === 'complete').length
}

export function PipelineNarrative({ state, labelOverrides, retrospective }: Props) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(retrospective ?? false)
  const [showTechnical, setShowTechnical] = useState(false)
  const completed = completedCount(state)
  const percent = Math.round((completed / PIPELINE_STEPS.length) * 100)
  const labelFor = (step: Step) => labelOverrides?.[step] ?? t(`evaluation.stepper.labels.${step}`)
  const statusLabel = (status: StepStatus): string => t(`common.stepper.${status}`)

  const summary =
    state.phase === 'done'
      ? t('evaluation.narrative.summaryDone', { count: state.narrativeEvents.length })
      : state.phase === 'error'
        ? t('evaluation.narrative.summaryError')
        : t('evaluation.narrative.summaryRunning')

  // Retrospective + collapsed → one-line summary with a chevron to expand.
  if (retrospective && collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="paper-card flex w-full items-center justify-between rounded-[14px] px-4 py-3 text-left transition-colors hover:bg-accent/30"
      >
        <span className="mono-caption text-foreground/60">{summary}</span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--primary)]">
          {t('evaluation.narrative.showDetails')}
          <ChevronDown className="size-3.5" aria-hidden />
        </span>
      </button>
    )
  }

  return (
    <section className="paper-card flex flex-col gap-4 rounded-[16px] p-4 sm:p-5">
      {retrospective && (
        <header className="flex items-center justify-between">
          <p className="mono-caption text-foreground/60">{summary}</p>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="mono-caption text-foreground/55 hover:text-foreground"
          >
            {t('evaluation.narrative.collapse')}
          </button>
        </header>
      )}

      {/* Progress strip — preserves the existing pipeline-stepper feel */}
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full bg-[color:var(--primary)] transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="mono-caption text-foreground/55 tabular-nums">
          {completed} / {PIPELINE_STEPS.length}
        </span>
      </div>

      {/* Tier 1 — Lay narration */}
      <NarrativeLayer state={state} labelFor={labelFor} statusLabel={statusLabel} />

      {/* Tier 2 — Technical transcript (collapsed by default) */}
      {state.technicalEvents.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-foreground/10 pt-3">
          <button
            type="button"
            onClick={() => setShowTechnical((v) => !v)}
            aria-expanded={showTechnical}
            className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-foreground/70 hover:text-foreground"
          >
            <Terminal className="size-3.5" aria-hidden />
            {showTechnical ? t('evaluation.narrative.hideTechnical') : t('evaluation.narrative.showTechnical')}
            <ChevronDown
              className={cn('size-3.5 transition-transform', showTechnical && 'rotate-180')}
              aria-hidden
            />
          </button>
          {showTechnical && <TechnicalLayer state={state} />}
        </div>
      )}

      {state.error && (
        <p className="mono-caption text-[color:var(--hibiscus)]" role="alert">
          {state.error}
        </p>
      )}
    </section>
  )
}

function NarrativeLayer({
  state,
  labelFor,
  statusLabel
}: {
  state: PipelineState
  labelFor: (step: Step) => string
  statusLabel: (status: StepStatus) => string
}) {
  // When narrative events haven't streamed yet (e.g., legacy persisted eval
  // with no narrativeLog), fall back to the old stepper labels so the card
  // doesn't go blank.
  const fallback = state.narrativeEvents.length === 0

  if (fallback) {
    return (
      <ol className="flex flex-col gap-1.5">
        {PIPELINE_STEPS.map((step, index) => {
          const status = state.stepStates[step]
          const num = String(index + 1).padStart(2, '0')
          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-sm transition-colors',
                status === 'active' && 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/[0.04]',
                status === 'complete' && 'border-[color:var(--forest)]/30 bg-[color:var(--forest)]/[0.04]',
                status === 'error' && 'border-[color:var(--hibiscus)]/50 bg-[color:var(--hibiscus)]/[0.06]',
                status === 'pending' && 'border-foreground/10'
              )}
              aria-current={status === 'active' ? 'step' : undefined}
            >
              <span
                className={cn(
                  'mono-caption w-6 shrink-0 tabular-nums',
                  status === 'pending' ? 'text-foreground/35' : 'text-foreground/55'
                )}
              >
                {num}
              </span>
              <span className="flex w-4 shrink-0 items-center justify-center">
                <StepIcon status={status} />
              </span>
              <span
                className={cn(
                  'flex-1 truncate font-sans text-[13.5px]',
                  status === 'pending' ? 'text-foreground/55' : 'font-medium text-foreground'
                )}
              >
                {labelFor(step)}
              </span>
              <span className="mono-caption text-foreground/45">{statusLabel(status)}</span>
            </li>
          )
        })}
      </ol>
    )
  }

  // Backend-supplied narration — render headline + data point per event.
  return (
    <ol className="flex flex-col gap-1.5">
      {state.narrativeEvents.map((ev, i) => (
        <li
          key={`${ev.step}-${i}`}
          className="flex items-center gap-3 rounded-[10px] border border-[color:var(--forest)]/25 bg-[color:var(--forest)]/[0.04] px-3 py-2.5"
        >
          <span className="flex w-4 shrink-0 items-center justify-center">
            <Check className="size-3.5 text-[color:var(--forest)]" aria-hidden />
          </span>
          <span className="flex-1 truncate font-sans text-[13.5px] font-medium text-foreground">
            {ev.headline}
          </span>
          {ev.data_point && (
            <span className="mono-caption shrink-0 tabular-nums text-foreground/65">{ev.data_point}</span>
          )}
        </li>
      ))}
    </ol>
  )
}

function TechnicalLayer({ state }: { state: PipelineState }) {
  const { t } = useTranslation()
  return (
    <pre
      tabIndex={0}
      role="region"
      aria-label={t('evaluation.narrative.technicalLogLabel')}
      className="overflow-x-auto rounded-[8px] border border-foreground/15 bg-foreground/[0.04] p-3 font-mono text-[12px] leading-relaxed text-foreground/85"
    >
      {state.technicalEvents
        .map((ev) => `[${ev.timestamp.slice(11, 19)}] step=${ev.step}\n${ev.log_lines.join('\n')}`)
        .join('\n\n')}
    </pre>
  )
}
