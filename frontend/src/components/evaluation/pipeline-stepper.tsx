'use client'

import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PipelineState, StepStatus } from '@/hooks/use-agent-pipeline'
import { PIPELINE_STEPS, type Step } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

type Props = {
  state: PipelineState
  /** Optional per-step label overrides — e.g. manual-entry mode replaces "Extract profile" with "Profile prepared". */
  labelOverrides?: Partial<Record<Step, string>>
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'complete')
    return <Check className="size-3.5 text-[color:var(--forest)]" aria-hidden />
  if (status === 'active')
    return <Loader2 className="size-3.5 animate-spin text-[color:var(--hibiscus)]" aria-hidden />
  if (status === 'error')
    return <AlertCircle className="size-3.5 text-[color:var(--hibiscus)]" aria-hidden />
  return <div className="size-2 rounded-full border border-foreground/35" aria-hidden />
}

function completedCount(state: PipelineState): number {
  return PIPELINE_STEPS.filter((step) => state.stepStates[step] === 'complete').length
}

export function PipelineStepper({ state, labelOverrides }: Props) {
  const { t } = useTranslation()
  const completed = completedCount(state)
  const percent = Math.round((completed / PIPELINE_STEPS.length) * 100)
  const labelFor = (step: Step) => labelOverrides?.[step] ?? t(`evaluation.stepper.labels.${step}`)
  const statusLabel = (status: StepStatus): string => t(`common.stepper.${status}`)

  return (
    <div className="flex flex-col gap-3">
      {/* Custom progress track — matches mono ledger feel */}
      <div className="flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full bg-[color:var(--hibiscus)] transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="mono-caption text-foreground/55 tabular-nums">
          {completed} / {PIPELINE_STEPS.length}
        </span>
      </div>

      <ol className="flex flex-col gap-1.5" aria-label={t('evaluation.stepper.aria')}>
        {PIPELINE_STEPS.map((step: Step, index: number) => {
          const status = state.stepStates[step]
          const num = String(index + 1).padStart(2, '0')
          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-sm transition-colors',
                status === 'active' && 'border-[color:var(--hibiscus)]/40 bg-[color:var(--hibiscus)]/[0.04]',
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
      {state.error && (
        <p className="mono-caption text-[color:var(--hibiscus)]" role="alert">
          {state.error}
        </p>
      )}
    </div>
  )
}
