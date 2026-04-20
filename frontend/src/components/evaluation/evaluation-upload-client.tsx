'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { ErrorRecoveryCard } from '@/components/evaluation/error-recovery-card'
import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import { PipelineStepper } from '@/components/evaluation/pipeline-stepper'
import { UploadWidget, type UploadFiles } from '@/components/evaluation/upload-widget'
import { Button } from '@/components/ui/button'

export function EvaluationUploadClient() {
  const router = useRouter()
  const { state, start, reset, setDemoMode } = useEvaluation()

  useEffect(() => {
    if (state.phase === 'done') {
      router.push('/dashboard/evaluation/results')
    }
  }, [state.phase, router])

  function handleSubmit(files: UploadFiles) {
    setDemoMode(false)
    start({ mode: 'real', files })
  }

  function handleUseSamples() {
    setDemoMode(true)
    start({ mode: 'mock' })
  }

  function handleReset() {
    setDemoMode(false)
    reset()
  }

  const showUpload = state.phase === 'idle'
  const showStepper = state.phase === 'streaming' || state.phase === 'error' || state.phase === 'done'
  const showError = state.phase === 'error'

  return (
    <div className="flex flex-col gap-4">
      {showUpload && <UploadWidget onSubmit={handleSubmit} onUseSamples={handleUseSamples} />}
      {showStepper && (
        <>
          <PipelineStepper state={state} />
          {showError && (
            <ErrorRecoveryCard
              message={state.error ?? 'Unknown error.'}
              onUseSamples={handleUseSamples}
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
