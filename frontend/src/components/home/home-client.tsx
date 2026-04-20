'use client'

import { useState } from 'react'

import { DemoModeBanner } from '@/components/home/demo-mode-banner'
import { ErrorRecoveryCard } from '@/components/home/error-recovery-card'
import { PipelineStepper } from '@/components/pipeline/pipeline-stepper'
import { CodeExecutionPanel } from '@/components/results/code-execution-panel'
import { PacketDownload } from '@/components/results/packet-download'
import { RankedList } from '@/components/results/ranked-list'
import { Button } from '@/components/ui/button'
import { UploadWidget, type UploadFiles } from '@/components/upload/upload-widget'
import { useAgentPipeline } from '@/lib/sse-client'

export function HomeClient() {
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
