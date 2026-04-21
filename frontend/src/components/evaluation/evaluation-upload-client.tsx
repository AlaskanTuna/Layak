'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ErrorRecoveryCard } from '@/components/evaluation/error-recovery-card'
import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import { type IntakeMode, IntakeModeToggle } from '@/components/evaluation/intake-mode-toggle'
import { ManualEntryForm } from '@/components/evaluation/manual-entry-form'
import { PipelineStepper } from '@/components/evaluation/pipeline-stepper'
import { UploadWidget, type UploadSubmission } from '@/components/evaluation/upload-widget'
import { Button } from '@/components/ui/button'
import type { ManualEntryPayload, Step } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

const MANUAL_MODE_LABEL_OVERRIDES: Partial<Record<Step, string>> = {
  extract: 'Profile prepared'
}

export function EvaluationUploadClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state, start, reset, setDemoMode } = useEvaluation()
  const initialMode: IntakeMode = searchParams?.get('mode') === 'manual' ? 'manual' : 'upload'
  const [mode, setMode] = useState<IntakeMode>(initialMode)
  // Per-tab demo flag — when the user clicks "Use Aisyah sample data" on a
  // tab, we remember that choice on that tab so switching tabs doesn't show
  // a stale demo banner for a tab with no demo state. The active tab's flag
  // is mirrored to the global `isDemoMode` that drives the banner.
  const [demoByTab, setDemoByTab] = useState<Record<IntakeMode, boolean>>({
    upload: false,
    manual: false
  })

  useEffect(() => {
    if (state.phase === 'done') {
      // Real + manual intake stamp `evalId` from the SSE done event; mock
      // mode (dev escape hatch) leaves it null and falls back to the
      // in-memory results route.
      const next = state.evalId
        ? `/dashboard/evaluation/results/${state.evalId}`
        : '/dashboard/evaluation/results'
      router.push(next)
    }
  }, [state.phase, state.evalId, router])

  function handleModeChange(next: IntakeMode) {
    setMode(next)
    setDemoMode(demoByTab[next])
  }

  function handleSubmitUpload(submission: UploadSubmission) {
    setDemoByTab(prev => ({ ...prev, upload: false }))
    setDemoMode(false)
    start({ mode: 'real', files: submission.files, dependants: submission.dependants })
  }

  function handleSubmitManual(payload: ManualEntryPayload) {
    start({ mode: 'manual', payload })
  }

  function handleUseSamplesUpload() {
    setDemoByTab(prev => ({ ...prev, upload: true }))
    setDemoMode(true)
    start({ mode: 'mock' })
  }

  function handleUseSamplesManual() {
    // Inside the manual form — the form itself has already reset to Aisyah
    // values. Mark the manual tab as demo so switching to upload clears the
    // banner and switching back restores it.
    setDemoByTab(prev => ({ ...prev, manual: true }))
    setDemoMode(true)
  }

  function handleClearManual() {
    // User wiped the manual form — demo banner should drop if it was up.
    setDemoByTab(prev => ({ ...prev, manual: false }))
    if (mode === 'manual') setDemoMode(false)
  }

  function handleReset() {
    setDemoByTab({ upload: false, manual: false })
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
          <IntakeModeToggle value={mode} onChange={handleModeChange} />
          {/* Both widgets stay mounted so partial form state survives a tab switch. */}
          <div className={cn(mode !== 'upload' && 'hidden')} aria-hidden={mode !== 'upload'}>
            <UploadWidget onSubmit={handleSubmitUpload} onUseSamples={handleUseSamplesUpload} />
          </div>
          <div className={cn(mode !== 'manual' && 'hidden')} aria-hidden={mode !== 'manual'}>
            <ManualEntryForm
              onSubmit={handleSubmitManual}
              onUseSamples={handleUseSamplesManual}
              onClear={handleClearManual}
            />
          </div>
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
