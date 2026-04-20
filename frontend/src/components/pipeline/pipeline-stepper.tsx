'use client'

import { AlertCircle, Check, Loader2 } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import { PIPELINE_STEPS, STEP_LABELS, type Step } from '@/lib/agent-types'
import type { PipelineState, StepStatus } from '@/lib/sse-client'
import { cn } from '@/lib/utils'

type Props = {
  state: PipelineState
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'complete') return <Check className="size-4 text-primary" aria-hidden />
  if (status === 'active') return <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
  if (status === 'error') return <AlertCircle className="size-4 text-destructive" aria-hidden />
  return <div className="size-4 rounded-full border border-muted-foreground/40" aria-hidden />
}

function statusLabel(status: StepStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'active':
      return 'In progress'
    case 'complete':
      return 'Complete'
    case 'error':
      return 'Failed'
  }
}

function completedCount(state: PipelineState): number {
  return PIPELINE_STEPS.filter(step => state.stepStates[step] === 'complete').length
}

export function PipelineStepper({ state }: Props) {
  const completed = completedCount(state)
  const percent = Math.round((completed / PIPELINE_STEPS.length) * 100)

  return (
    <div className="flex flex-col gap-3">
      <Progress value={percent} />
      <ol className="flex flex-col gap-2" aria-label="Pipeline progress">
        {PIPELINE_STEPS.map((step: Step) => {
          const status = state.stepStates[step]
          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
                status === 'active' && 'border-primary/40 bg-primary/5',
                status === 'complete' && 'border-primary/20',
                status === 'error' && 'border-destructive/40 bg-destructive/5',
                status === 'pending' && 'border-border'
              )}
              aria-current={status === 'active' ? 'step' : undefined}
            >
              <StepIcon status={status} />
              <span className={cn('flex-1', status === 'pending' && 'text-muted-foreground')}>
                {STEP_LABELS[step]}
              </span>
              <span className="text-xs text-muted-foreground">{statusLabel(status)}</span>
            </li>
          )
        })}
      </ol>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
    </div>
  )
}
