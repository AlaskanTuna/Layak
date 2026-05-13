'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ErrorRecoveryCard } from '@/components/evaluation/error-recovery-card'
import { type DemoPersona, useEvaluation } from '@/components/evaluation/evaluation-provider'
import { type IntakeMode, IntakeModeToggle } from '@/components/evaluation/intake-mode-toggle'
import { ManualEntryForm, type ManualEntryFormHandle } from '@/components/evaluation/manual-entry-form'
import { PipelineNarrative } from '@/components/evaluation/pipeline-narrative'
import {
  type SamplePersona,
  UploadWidget,
  type UploadSubmission,
  type UploadWidgetHandle
} from '@/components/evaluation/upload-widget'
import { PageHeading } from '@/components/layout/page-heading'
import { UpgradeWaitlistModal } from '@/components/settings/upgrade-waitlist-modal'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { AISYAH_DEPENDANT_OVERRIDES, loadAisyahFixtureFiles } from '@/lib/aisyah-fixtures'
import { FARHAN_DEPENDANT_OVERRIDES, loadFarhanFixtureFiles } from '@/lib/farhan-fixtures'
import type { DependantInput, ManualEntryPayload, Step } from '@/lib/agent-types'
import type { UploadFiles } from '@/components/evaluation/upload-widget'
import { cn } from '@/lib/utils'

const PERSONA_LOADERS: Record<SamplePersona, { load: () => Promise<UploadFiles>; dependants: DependantInput[] }> = {
  aisyah: { load: loadAisyahFixtureFiles, dependants: AISYAH_DEPENDANT_OVERRIDES },
  farhan: { load: loadFarhanFixtureFiles, dependants: FARHAN_DEPENDANT_OVERRIDES }
}

export function EvaluationUploadClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state, start, reset, setDemoMode, acknowledgeQuotaExceeded } = useEvaluation()
  // Derived (not effect-synced) so dismissing the modal clears via the pipeline side and avoids the
  // React 19 set-state-in-effect lint.
  const waitlistOpen = state.quotaExceeded != null
  const initialMode: IntakeMode = searchParams?.get('mode') === 'manual' ? 'manual' : 'upload'
  const [mode, setMode] = useState<IntakeMode>(initialMode)
  // Per-tab persona so switching tabs doesn't carry a stale demo banner over.
  const [demoByTab, setDemoByTab] = useState<Record<IntakeMode, DemoPersona | null>>({
    upload: null,
    manual: null
  })

  useEffect(() => {
    if (state.phase === 'done') {
      // Mock mode leaves evalId null and falls back to the in-memory results route.
      const next = state.evalId ? `/dashboard/evaluation/results/${state.evalId}` : '/dashboard/evaluation/results'
      router.push(next)
    }
  }, [state.phase, state.evalId, router])

  function handleModeChange(next: IntakeMode) {
    setMode(next)
    setDemoMode(demoByTab[next] ?? false)
  }

  // Retained so the recovery card's Retry CTA can replay on a transient failure.
  const lastSubmissionRef = useRef<
    | { kind: 'real'; files: UploadFiles; dependants: DependantInput[] }
    | { kind: 'manual'; payload: ManualEntryPayload }
    | null
  >(null)

  function handleSubmitUpload(submission: UploadSubmission) {
    setDemoByTab((prev) => ({ ...prev, upload: null }))
    setDemoMode(false)
    lastSubmissionRef.current = {
      kind: 'real',
      files: submission.files,
      dependants: submission.dependants
    }
    start({ mode: 'real', files: submission.files, dependants: submission.dependants })
  }

  function handleSubmitManual(payload: ManualEntryPayload) {
    lastSubmissionRef.current = { kind: 'manual', payload }
    start({ mode: 'manual', payload })
  }

  const [loadingPersona, setLoadingPersona] = useState<SamplePersona | null>(null)
  const [sampleLoadError, setSampleLoadError] = useState<string | null>(null)

  async function handleUseSamplesUpload(persona: SamplePersona, behavior: 'prefill' | 'run' = 'prefill') {
    setDemoByTab((prev) => ({ ...prev, upload: persona }))
    setDemoMode(persona)
    setSampleLoadError(null)
    // Mock pipeline is Aisyah-shaped only — Farhan would desync, so gate the dev hatch on persona.
    const useMock =
      behavior === 'run' &&
      persona === 'aisyah' &&
      process.env.NODE_ENV !== 'production' &&
      process.env.NEXT_PUBLIC_USE_MOCK_SSE === '1'
    if (useMock) {
      start({ mode: 'mock' })
      return
    }
    const { load, dependants } = PERSONA_LOADERS[persona]
    setLoadingPersona(persona)
    try {
      const files = await load()
      if (behavior === 'run') {
        lastSubmissionRef.current = { kind: 'real', files, dependants }
        start({ mode: 'real', files, dependants })
      } else {
        uploadWidgetRef.current?.applySample(files, dependants)
      }
    } catch (err) {
      setSampleLoadError(err instanceof Error ? err.message : String(err))
      setDemoMode(false)
      setDemoByTab((prev) => ({ ...prev, upload: null }))
    } finally {
      setLoadingPersona(null)
    }
  }

  function handleUseSamplesManual(persona: DemoPersona) {
    setDemoByTab((prev) => ({ ...prev, manual: persona }))
    setDemoMode(persona)
  }

  function handleClearManual() {
    setDemoByTab((prev) => ({ ...prev, manual: null }))
    if (mode === 'manual') setDemoMode(false)
  }

  function handleReset() {
    setDemoByTab({ upload: null, manual: null })
    setDemoMode(false)
    setMode(initialMode)
    lastSubmissionRef.current = null
    reset()
  }

  function handleRetry() {
    const last = lastSubmissionRef.current
    if (!last) return
    if (last.kind === 'real') {
      start({ mode: 'real', files: last.files, dependants: last.dependants })
    } else {
      start({ mode: 'manual', payload: last.payload })
    }
  }

  function handleSwitchToManual() {
    setDemoByTab((prev) => ({ ...prev, upload: null }))
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

  const samplesBusy = loadingPersona !== null
  const showSampleAction = showIntake
  const uploadWidgetRef = useRef<UploadWidgetHandle | null>(null)
  const manualFormRef = useRef<ManualEntryFormHandle | null>(null)

  function handleSampleSelect(persona: SamplePersona) {
    if (mode === 'manual') {
      manualFormRef.current?.applySample(persona)
    } else {
      handleUseSamplesUpload(persona)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t('evaluation.upload.eyebrow')}
        title={t('evaluation.upload.pageTitle')}
        description={t('evaluation.upload.pageDescription')}
        illustration="/dashboard/start.webp"
        action={
          showSampleAction ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={samplesBusy}
                    className="h-11 gap-2 border-[color:var(--hibiscus)]/55 bg-card px-5 text-sm font-medium hover:border-[color:var(--hibiscus)] hover:bg-card dark:bg-card dark:hover:bg-card"
                  >
                    {samplesBusy ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-[color:var(--hibiscus)]" aria-hidden />
                        {t('evaluation.upload.loadingSamples')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 text-[color:var(--hibiscus)]" aria-hidden />
                        {t('evaluation.upload.sampleDropdownLabel')}
                        <ChevronDown className="size-4 text-[color:var(--hibiscus)]/70" aria-hidden />
                      </>
                    )}
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuLabel>{t('evaluation.upload.sampleDropdownGroupLabel')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleSampleSelect('aisyah')}>
                  <span className="font-medium">{t('evaluation.upload.useSamplesAisyah')}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('evaluation.upload.sampleDropdownAisyahDesc')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSampleSelect('farhan')}>
                  <span className="font-medium">{t('evaluation.upload.useSamplesFarhan')}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('evaluation.upload.sampleDropdownFarhanDesc')}
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />
      {showIntake && (
        <>
          <div id="tour-upload-mode" className="scroll-mt-24 rounded-lg">
            <IntakeModeToggle value={mode} onChange={handleModeChange} />
          </div>
          {/* Both widgets stay mounted so partial form state survives tab switch;
              tour IDs migrate to the active wrapper so anchors aren't 0x0 (Base UI breaks otherwise). */}
          <div
            id={mode === 'upload' ? 'tour-upload-form' : undefined}
            className={cn('scroll-mt-24 rounded-[14px]', mode !== 'upload' && 'hidden')}
            aria-hidden={mode !== 'upload'}
          >
            <UploadWidget
              ref={uploadWidgetRef}
              onSubmit={handleSubmitUpload}
              submitId={mode === 'upload' ? 'tour-upload-submit' : undefined}
            />
            {sampleLoadError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {t('evaluation.sampleLoadError', { error: sampleLoadError })}
              </p>
            )}
          </div>
          <div
            id={mode === 'manual' ? 'tour-upload-form' : undefined}
            className={cn('scroll-mt-24 rounded-[14px]', mode !== 'manual' && 'hidden')}
            aria-hidden={mode !== 'manual'}
          >
            <ManualEntryForm
              ref={manualFormRef}
              onSubmit={handleSubmitManual}
              onUseSamples={handleUseSamplesManual}
              onClear={handleClearManual}
              submitId={mode === 'manual' ? 'tour-upload-submit' : undefined}
            />
          </div>
        </>
      )}
      {showStepper && (
        <>
          <PipelineNarrative state={state} labelOverrides={labelOverrides} />
          {showError && (
            <ErrorRecoveryCard
              message={state.error ?? t('evaluation.unknownError')}
              category={state.errorCategory}
              // Defaults to Aisyah; on a quota-exhausted error the card prefers Manual Entry instead.
              onUseSamples={() => handleUseSamplesUpload('aisyah', 'run')}
              onReset={handleReset}
              onRetry={handleRetry}
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
