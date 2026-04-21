'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ErrorRecoveryCard } from '@/components/evaluation/error-recovery-card'
import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import { type IntakeMode, IntakeModeToggle } from '@/components/evaluation/intake-mode-toggle'
import { ManualEntryForm } from '@/components/evaluation/manual-entry-form'
import { PipelineStepper } from '@/components/evaluation/pipeline-stepper'
import { UploadWidget, type UploadFiles } from '@/components/evaluation/upload-widget'
import { Button } from '@/components/ui/button'
import type { ManualEntryPayload, Step } from '@/lib/agent-types'

const MANUAL_MODE_LABEL_OVERRIDES: Partial<Record<Step, string>> = {
  extract: 'Profile prepared'
}

export function EvaluationUploadClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state, start, reset, setDemoMode } = useEvaluation()
  const initialMode: IntakeMode = searchParams?.get('mode') === 'manual' ? 'manual' : 'upload'
  const [mode, setMode] = useState<IntakeMode>(initialMode)

  useEffect(() => {
    if (state.phase === 'done') {
      router.push('/dashboard/evaluation/results')
    }
  }, [state.phase, router])

  function handleSubmitUpload(files: UploadFiles) {
    setDemoMode(false)
    start({ mode: 'real', files })
  }

  function handleSubmitManual(payload: ManualEntryPayload) {
    start({ mode: 'manual', payload })
  }

  function handleUseSamplesUpload() {
    setDemoMode(true)
    start({ mode: 'mock' })
  }

  function handleUseSamplesManual() {
    // Inside the manual form — the form itself has already reset to Aisyah
    // values. Flip the demo banner so the UI reflects "DEMO MODE" parity
    // with the upload-path samples button.
    setDemoMode(true)
  }

  function handleReset() {
    setDemoMode(false)
    setMode(initialMode)
    reset()
  }

  const showIntake = state.phase === 'idle'
  const showStepper = state.phase === 'streaming' || state.phase === 'error' || state.phase === 'done'
  const showError = state.phase === 'error'
  const labelOverrides = mode === 'manual' ? MANUAL_MODE_LABEL_OVERRIDES : undefined

  return (
    <div className="flex flex-col gap-4">
      {showIntake && (
        <>
          <IntakeModeToggle value={mode} onChange={setMode} />
          {mode === 'upload' && (
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Heads up: MyKad / payslip / utility bill don&apos;t list your household members. If you have
              children, a parent, or anyone else you support, choose <strong>Enter manually</strong> above for
              a complete eligibility check — otherwise schemes that depend on dependants (JKM Warga Emas, LHDN
              child relief) won&apos;t surface.
            </p>
          )}
          {mode === 'upload' ? (
            <UploadWidget onSubmit={handleSubmitUpload} onUseSamples={handleUseSamplesUpload} />
          ) : (
            <ManualEntryForm onSubmit={handleSubmitManual} onUseSamples={handleUseSamplesManual} />
          )}
        </>
      )}
      {showStepper && (
        <>
          <PipelineStepper state={state} labelOverrides={labelOverrides} />
          {showError && (
            <ErrorRecoveryCard
              message={state.error ?? 'Unknown error.'}
              // Error-recovery "Use samples" always falls back to the known-good
              // mock-replay path, regardless of which intake mode failed.
              onUseSamples={handleUseSamplesUpload}
              onReset={handleReset}
            />
          )}
          {!showError && (
            <div className="flex">
              <Button type="button" variant="outline" onClick={handleReset}>
                Start over
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
