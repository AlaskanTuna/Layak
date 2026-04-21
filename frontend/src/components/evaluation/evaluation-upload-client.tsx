'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorRecoveryCard } from '@/components/evaluation/error-recovery-card'
import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import { type IntakeMode, IntakeModeToggle } from '@/components/evaluation/intake-mode-toggle'
import { ManualEntryForm } from '@/components/evaluation/manual-entry-form'
import { PipelineStepper } from '@/components/evaluation/pipeline-stepper'
import { UploadWidget, type UploadSubmission } from '@/components/evaluation/upload-widget'
import { UpgradeWaitlistModal } from '@/components/settings/upgrade-waitlist-modal'
import { Button } from '@/components/ui/button'
import { AISYAH_DEPENDANT_OVERRIDES, loadAisyahFixtureFiles } from '@/lib/aisyah-fixtures'
import type { ManualEntryPayload, Step } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

export function EvaluationUploadClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state, start, reset, setDemoMode, acknowledgeQuotaExceeded } = useEvaluation()
  // Modal open state is derived directly from `state.quotaExceeded` —
  // dismissing the modal calls `acknowledgeQuotaExceeded()` which clears
  // it on the pipeline side, naturally closing the modal. Avoids the
  // React 19 set-state-in-effect lint and the cascade-render risk.
  const waitlistOpen = state.quotaExceeded != null
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

  const [loadingSamples, setLoadingSamples] = useState(false)
  const [sampleLoadError, setSampleLoadError] = useState<string | null>(null)

  async function handleUseSamplesUpload() {
    setDemoByTab(prev => ({ ...prev, upload: true }))
    setDemoMode(true)
    setSampleLoadError(null)
    // Dev escape hatch — when NEXT_PUBLIC_USE_MOCK_SSE=1 the pipeline replays
    // canned events; skip the fetch entirely.
    const useMock =
      process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_USE_MOCK_SSE === '1'
    if (useMock) {
      start({ mode: 'mock' })
      return
    }
    setLoadingSamples(true)
    try {
      const files = await loadAisyahFixtureFiles()
      start({ mode: 'real', files, dependants: AISYAH_DEPENDANT_OVERRIDES })
    } catch (err) {
      setSampleLoadError(err instanceof Error ? err.message : String(err))
      setDemoMode(false)
      setDemoByTab(prev => ({ ...prev, upload: false }))
    } finally {
      setLoadingSamples(false)
    }
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

  function handleSwitchToManual() {
    // Quota-exhausted recovery — drop the failed pipeline state and flip
    // the user into Manual Entry mode where the OCR step is synthetic.
    setDemoByTab(prev => ({ ...prev, upload: false }))
    setDemoMode(false)
    setMode('manual')
    reset()
  }

  const showIntake = state.phase === 'idle'
  const showStepper = state.phase === 'streaming' || state.phase === 'error' || state.phase === 'done'
  const showError = state.phase === 'error'
  const labelOverrides: Partial<Record<Step, string>> | undefined =
    mode === 'manual' ? { extract: t('evaluation.stepper.labels.extractManual') } : undefined

  function handleWaitlistOpenChange(open: boolean) {
    if (!open) acknowledgeQuotaExceeded()
  }

  return (
    <div className="flex flex-col gap-4">
      {showIntake && (
        <>
          <IntakeModeToggle value={mode} onChange={handleModeChange} />
          {/* Both widgets stay mounted so partial form state survives a tab switch. */}
          <div className={cn(mode !== 'upload' && 'hidden')} aria-hidden={mode !== 'upload'}>
            <UploadWidget
              onSubmit={handleSubmitUpload}
              onUseSamples={handleUseSamplesUpload}
              samplesLoading={loadingSamples}
            />
            {sampleLoadError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {t('evaluation.sampleLoadError', { error: sampleLoadError })}
              </p>
            )}
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
              message={state.error ?? t('evaluation.unknownError')}
              // "Use samples" falls back to the same upload path; on a
              // quota-exhausted error the card prefers the Manual Entry CTA
              // instead because the upload path would 429 the same way.
              onUseSamples={handleUseSamplesUpload}
              onReset={handleReset}
              onSwitchToManual={handleSwitchToManual}
            />
          )}
          {!showError && (
            <div className="flex">
              <Button type="button" variant="outline" onClick={handleReset}>
                {t('common.button.startOver')}
              </Button>
            </div>
          )}
        </>
      )}
      <UpgradeWaitlistModal
        open={waitlistOpen}
        onOpenChange={handleWaitlistOpenChange}
        context={
          state.quotaExceeded
            ? {
                kind: 'rate_limit',
                resetAt: state.quotaExceeded.resetAt,
                limit: state.quotaExceeded.limit,
                windowHours: state.quotaExceeded.windowHours
              }
            : undefined
        }
      />
    </div>
  )
}
