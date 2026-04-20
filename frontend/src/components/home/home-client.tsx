'use client'

import { useState } from 'react'

import { DemoModeBanner } from '@/components/home/demo-mode-banner'
import { PipelineStepper } from '@/components/pipeline/pipeline-stepper'
import { CodeExecutionPanel } from '@/components/results/code-execution-panel'
import { RankedList } from '@/components/results/ranked-list'
import { Button } from '@/components/ui/button'
import { UploadWidget, type UploadFiles } from '@/components/upload/upload-widget'
import { useAgentPipeline } from '@/lib/sse-client'

export function HomeClient() {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const { state, start, reset } = useAgentPipeline()

  const showLanding = state.phase === 'idle'
  const showResults = state.phase === 'done'

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
          {showResults && (
            <>
              <RankedList
                matches={state.matches}
                totalAnnualRm={state.upside?.total_annual_rm ?? null}
              />
              {state.upside && <CodeExecutionPanel upside={state.upside} />}
            </>
          )}
          <div className="flex">
            <Button type="button" variant="outline" onClick={handleReset}>
              Start over
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
