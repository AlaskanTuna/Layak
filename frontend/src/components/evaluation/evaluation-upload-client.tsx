'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ErrorRecoveryCard } from '@/components/evaluation/error-recovery-card'
import { type DemoPersona, useEvaluation } from '@/components/evaluation/evaluation-provider'
import { type IntakeMode, IntakeModeToggle } from '@/components/evaluation/intake-mode-toggle'
import { ManualEntryForm, type ManualEntryFormHandle } from '@/components/evaluation/manual-entry-form'
import { PipelineStepper } from '@/components/evaluation/pipeline-stepper'
import { type SamplePersona, UploadWidget, type UploadSubmission } from '@/components/evaluation/upload-widget'
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

// Per-persona fixture loader table. Keeps the dispatch branchless in the
// upload handler — add another persona by adding another entry here.
const PERSONA_LOADERS: Record<SamplePersona, { load: () => Promise<UploadFiles>; dependants: DependantInput[] }> = {
  aisyah: { load: loadAisyahFixtureFiles, dependants: AISYAH_DEPENDANT_OVERRIDES },
  farhan: { load: loadFarhanFixtureFiles, dependants: FARHAN_DEPENDANT_OVERRIDES }
}

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
  // Per-tab demo persona — when the user clicks a "Use <persona> sample data"
  // button on a tab, we remember that choice on that tab so switching tabs
  // doesn't show a stale demo banner for a tab with no demo state. The active
  // tab's persona is mirrored to the global `demoPersona` that drives the
  // banner. Manual Entry only has an Aisyah sample, so its slot is narrower.
  const [demoByTab, setDemoByTab] = useState<Record<IntakeMode, DemoPersona | null>>({
    upload: null,
    manual: null
  })

  useEffect(() => {
    if (state.phase === 'done') {
      // Real + manual intake stamp `evalId` from the SSE done event; mock
      // mode (dev escape hatch) leaves it null and falls back to the
      // in-memory results route.
      const next = state.evalId ? `/dashboard/evaluation/results/${state.evalId}` : '/dashboard/evaluation/results'
      router.push(next)
    }
  }, [state.phase, state.evalId, router])

  function handleModeChange(next: IntakeMode) {
    setMode(next)
    setDemoMode(demoByTab[next] ?? false)
  }

  // Retain the last submission so the recovery card's Retry CTA can
  // replay the same pipeline on a transient failure (service_unavailable
  // / deadline_exceeded). `null` means there's nothing to retry (e.g.
  // just after `reset()` or before any submit).
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

  async function handleUseSamplesUpload(persona: SamplePersona) {
    setDemoByTab((prev) => ({ ...prev, upload: persona }))
    setDemoMode(persona)
    setSampleLoadError(null)
    // Dev escape hatch — when NEXT_PUBLIC_USE_MOCK_SSE=1 the pipeline replays
    // canned events (Aisyah-shaped) regardless of persona; skip the fetch
    // entirely. The mock pipeline doesn't know about Farhan and would
    // desync, so only honour mock mode for Aisyah.
    const useMock =
      persona === 'aisyah' && process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_USE_MOCK_SSE === '1'
    if (useMock) {
      start({ mode: 'mock' })
      return
    }
    const { load, dependants } = PERSONA_LOADERS[persona]
    setLoadingPersona(persona)
    try {
      const files = await load()
      lastSubmissionRef.current = { kind: 'real', files, dependants }
      start({ mode: 'real', files, dependants })
    } catch (err) {
      setSampleLoadError(err instanceof Error ? err.message : String(err))
      setDemoMode(false)
      setDemoByTab((prev) => ({ ...prev, upload: null }))
    } finally {
      setLoadingPersona(null)
    }
  }

  function handleUseSamplesManual(persona: DemoPersona) {
    // Inside the manual form — the form itself has already reset to the
    // chosen persona's values. Mark the manual tab with the matching persona
    // so switching to upload clears the banner and switching back restores
    // the right copy ("gig driver Aisyah" vs "salaried teacher Farhan").
    setDemoByTab((prev) => ({ ...prev, manual: persona }))
    setDemoMode(persona)
  }

  function handleClearManual() {
    // User wiped the manual form — demo banner should drop if it was up.
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
    // Transient-error replay. No submission retained means there's nothing
    // to retry — the button wouldn't render in that case (the recovery card
    // only wires Retry when `onRetry` is defined), but we guard here too.
    const last = lastSubmissionRef.current
    if (!last) return
    if (last.kind === 'real') {
      start({ mode: 'real', files: last.files, dependants: last.dependants })
    } else {
      start({ mode: 'manual', payload: last.payload })
    }
  }

  function handleSwitchToManual() {
    // Quota-exhausted recovery — drop the failed pipeline state and flip
    // the user into Manual Entry mode where the OCR step is synthetic.
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
  // Header dropdown is visible whenever we're on the intake screen. Dispatch
  // splits by tab: upload tab loads fixture files into the pipeline, manual
  // tab calls the form's imperative `applySample` to prefill fields.
  const showSampleAction = showIntake
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
        action={
          showSampleAction ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline" size="sm" disabled={samplesBusy} className="gap-1.5">
                    {samplesBusy ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        {t('evaluation.upload.loadingSamples')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5" aria-hidden />
                        {t('evaluation.upload.sampleDropdownLabel')}
                        <ChevronDown className="size-3.5 opacity-60" aria-hidden />
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
          <IntakeModeToggle value={mode} onChange={handleModeChange} />
          {/* Both widgets stay mounted so partial form state survives a tab switch. */}
          <div className={cn(mode !== 'upload' && 'hidden')} aria-hidden={mode !== 'upload'}>
            <UploadWidget onSubmit={handleSubmitUpload} />
            {sampleLoadError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {t('evaluation.sampleLoadError', { error: sampleLoadError })}
              </p>
            )}
          </div>
          <div className={cn(mode !== 'manual' && 'hidden')} aria-hidden={mode !== 'manual'}>
            <ManualEntryForm
              ref={manualFormRef}
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
              category={state.errorCategory}
              // "Use samples" falls back to the upload path with the default
              // Aisyah persona; on a quota-exhausted error the card prefers
              // the Manual Entry CTA instead because the upload path would
              // 429 the same way. Farhan is only reachable from the idle
              // intake screen to keep the recovery card single-action.
              onUseSamples={() => handleUseSamplesUpload('aisyah')}
              onReset={handleReset}
              // Retry is always wired — an error event implies a prior
              // submit, which always populated `lastSubmissionRef`. The
              // handler no-ops defensively if the ref was cleared mid-stream.
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

