'use client'

import { useState } from 'react'

import { DemoModeBanner } from '@/components/home/demo-mode-banner'
import { UploadWidget, type UploadFiles } from '@/components/upload/upload-widget'

type Phase = 'landing' | 'processing' | 'results'

export function HomeClient() {
  const [phase, setPhase] = useState<Phase>('landing')
  const [isDemoMode, setIsDemoMode] = useState(false)

  function handleSubmit(files: UploadFiles) {
    // TODO(task-2 commit 2): wire SSE consumer; replay against real backend when NEXT_PUBLIC_USE_MOCK_SSE is unset.
    console.info('[Layak] upload submitted — pipeline wiring lands in commit 2', Object.keys(files))
    setIsDemoMode(false)
    setPhase('processing')
  }

  function handleUseSamples() {
    // TODO(task-2 commit 2): trigger mock SSE replay from aisyah-response fixture.
    setIsDemoMode(true)
    setPhase('processing')
  }

  return (
    <div className="flex flex-col gap-4">
      {isDemoMode && <DemoModeBanner />}
      {phase === 'landing' && <UploadWidget onSubmit={handleSubmit} onUseSamples={handleUseSamples} />}
      {phase === 'processing' && (
        <p className="text-sm text-muted-foreground" role="status">
          Pipeline wiring lands in the next commit.
        </p>
      )}
    </div>
  )
}
