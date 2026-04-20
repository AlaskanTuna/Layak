'use client'

import { useState } from 'react'

import { DemoModeBanner } from '@/components/home/demo-mode-banner'
import { PipelineStepper } from '@/components/pipeline/pipeline-stepper'
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
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p>Pipeline finished. Ranked scheme list and provenance panel land in the next commit.</p>
              {state.upside && (
                <p>
                  Total annual upside:{' '}
                  <span className="font-medium text-foreground">
                    RM{state.upside.total_annual_rm.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </span>
                </p>
              )}
            </div>
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
