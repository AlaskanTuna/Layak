'use client'

import { useState } from 'react'

import { CodeExecutionPanel } from '@/components/evaluation/code-execution-panel'
import { DemoModeBanner } from '@/components/evaluation/demo-mode-banner'
import { ErrorRecoveryCard } from '@/components/evaluation/error-recovery-card'
import { PacketDownload } from '@/components/evaluation/packet-download'
import { PipelineStepper } from '@/components/evaluation/pipeline-stepper'
import { RankedList } from '@/components/evaluation/ranked-list'
import { UploadWidget, type UploadFiles } from '@/components/evaluation/upload-widget'
import { Button } from '@/components/ui/button'
import { useAgentPipeline } from '@/hooks/use-agent-pipeline'

export function EvaluationClient() {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const { state, start, reset } = useAgentPipeline()

  const showLanding = state.phase === 'idle'
  const showResults = state.phase === 'done'
  const showError = state.phase === 'error'

  function handleSubmit(files: UploadFiles) {
    setIsDemoMode(false)
    start({ mode: 'real', files })
  }

  function handleUseSamples() {
    setIsDemoMode(true)
    start({ mode: 'mock' })
  }

  function handleReset() {
    setIsDemoMode(false)
    reset()
  }

  return (
    <div className="flex flex-col gap-4">
      {isDemoMode && <DemoModeBanner />}
      {showLanding && <UploadWidget onSubmit={handleSubmit} onUseSamples={handleUseSamples} />}
      {!showLanding && (
        <>
          <PipelineStepper state={state} />
          {showError && (
            <ErrorRecoveryCard
              message={state.error ?? 'Unknown error.'}
              onUseSamples={handleUseSamples}
              onReset={handleReset}
            />
          )}
          {showResults && (
            <>
              <RankedList matches={state.matches} totalAnnualRm={state.upside?.total_annual_rm ?? null} />
              {state.upside && <CodeExecutionPanel upside={state.upside} />}
              <PacketDownload packet={state.packet} />
            </>
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
