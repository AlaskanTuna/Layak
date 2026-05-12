'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, ChevronDown, Loader2, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PipelineState, StepStatus } from '@/hooks/use-agent-pipeline'
import { PIPELINE_STEPS, type PipelineNarrativeEvent, type Step } from '@/lib/agent-types'
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

const CYCLE_MS = 3000

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

  // Map narrative events by step so the cycling status label can pull
  // headline + data_point per row.
  const narrativeByStep = useMemo(() => {
    const map = new Map<Step, PipelineNarrativeEvent>()
    for (const ev of state.narrativeEvents) {
      // Latest event for a given step wins — matches the backend contract
      // (one narrative event per step, emitted right after step_result).
      map.set(ev.step, ev)
    }
    return map
  }, [state.narrativeEvents])

  const summary =
    state.phase === 'done'
      ? t('evaluation.narrative.summaryDone', { count: state.narrativeEvents.length })
      : state.phase === 'error'
        ? t('evaluation.narrative.summaryError')
        : t('evaluation.narrative.summaryRunning')

  const hasTechnical =
    state.technicalEvents.length > 0 ||
    Boolean(state.upside?.python_snippet) ||
    Boolean(state.upside?.stdout)

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

      <ol className="flex flex-col gap-1.5">
        {PIPELINE_STEPS.map((step, index) => {
          const status = state.stepStates[step]
          const num = String(index + 1).padStart(2, '0')
          const narrative = narrativeByStep.get(step) ?? null
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
              <CyclingStatus status={status} statusLabel={statusLabel} narrative={narrative} />
            </li>
          )
        })}
      </ol>

      {hasTechnical && (
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

/**
 * Right-aligned status pill that cross-fades through the step's status label
 * + narrative headline + data point every {CYCLE_MS}ms. Pending/error rows
 * skip the cycle and render a single static label.
 */
function CyclingStatus({
  status,
  statusLabel,
  narrative
}: {
  status: StepStatus
  statusLabel: (status: StepStatus) => string
  narrative: PipelineNarrativeEvent | null
}) {
  const items = useMemo(() => {
    const base = statusLabel(status)
    if (status === 'pending' || status === 'error') return [base]
    if (!narrative) return [base]
    const out: string[] = [base, narrative.headline]
    if (narrative.data_point) out.push(narrative.data_point)
    return out
  }, [status, statusLabel, narrative])

  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % items.length)
    }, CYCLE_MS)
    return () => clearInterval(id)
  }, [items])

  const safeIdx = items.length > 0 ? idx % items.length : 0
  const label = items[safeIdx] ?? ''
  return (
    <span
      key={`${label}-${safeIdx}`}
      className={cn(
        'mono-caption cycle-fade ml-auto max-w-[200px] truncate text-right',
        status === 'pending' ? 'text-foreground/45' : 'text-foreground/65'
      )}
      title={label}
    >
      {label}
    </span>
  )
}

function TechnicalLayer({ state }: { state: PipelineState }) {
  const { t } = useTranslation()
  const lines = state.technicalEvents
    .map((ev) => `[${ev.timestamp.slice(11, 19)}] step=${ev.step}\n${ev.log_lines.join('\n')}`)
    .join('\n\n')
  const snippet = state.upside?.python_snippet?.trim()
  const stdout = state.upside?.stdout?.trim()
  return (
    <div className="flex flex-col gap-3">
      {lines && (
        <pre
          tabIndex={0}
          role="region"
          aria-label={t('evaluation.narrative.technicalLogLabel')}
          className="overflow-x-auto rounded-[8px] border border-foreground/15 bg-foreground/[0.04] p-3 font-mono text-[12px] leading-relaxed text-foreground/85"
        >
          {lines}
        </pre>
      )}
      {(snippet || stdout) && (
        <div className="rounded-[8px] border border-foreground/15 bg-foreground/[0.04]">
          <p className="mono-caption px-3 pt-2.5 text-[color:var(--primary)]">
            {t('evaluation.narrative.codeExecutionTitle')}
          </p>
          {snippet && (
            <div className="border-t border-foreground/10 px-3 pb-3 pt-2">
              <p className="mono-caption text-foreground/55">
                {t('evaluation.narrative.codeExecutionSnippet')}
              </p>
              <pre className="mt-1.5 overflow-x-auto font-mono text-[12px] leading-relaxed text-foreground/85">
                {snippet}
              </pre>
            </div>
          )}
          {stdout && (
            <div className="border-t border-foreground/10 px-3 pb-3 pt-2">
              <p className="mono-caption text-foreground/55">
                {t('evaluation.narrative.codeExecutionStdout')}
              </p>
              <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-[color:var(--forest)]">
                {stdout}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
