'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { FileText, KeyboardIcon, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ErrorRecoveryCard } from '@/components/evaluation/error-recovery-card'
import { type DemoPersona, useEvaluation } from '@/components/evaluation/evaluation-provider'
import { type IntakeMode, IntakeModeToggle } from '@/components/evaluation/intake-mode-toggle'
import { ManualEntryForm } from '@/components/evaluation/manual-entry-form'
import { PipelineStepper } from '@/components/evaluation/pipeline-stepper'
import {
  type SamplePersona,
  UploadWidget,
  type UploadSubmission
} from '@/components/evaluation/upload-widget'
import { UpgradeWaitlistModal } from '@/components/settings/upgrade-waitlist-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AISYAH_DEPENDANT_OVERRIDES, loadAisyahFixtureFiles } from '@/lib/aisyah-fixtures'
import { FARHAN_DEPENDANT_OVERRIDES, loadFarhanFixtureFiles } from '@/lib/farhan-fixtures'
import type { DependantInput, ManualEntryPayload, Step } from '@/lib/agent-types'
import type { UploadFiles } from '@/components/evaluation/upload-widget'
import { cn } from '@/lib/utils'

// Per-persona fixture loader table. Keeps the dispatch branchless in the
// upload handler — add another persona by adding another entry here.
const PERSONA_LOADERS: Record<
  SamplePersona,
  { load: () => Promise<UploadFiles>; dependants: DependantInput[] }
> = {
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
      const next = state.evalId
        ? `/dashboard/evaluation/results/${state.evalId}`
        : '/dashboard/evaluation/results'
      router.push(next)
    }
  }, [state.phase, state.evalId, router])

  function handleModeChange(next: IntakeMode) {
    setMode(next)
    setDemoMode(demoByTab[next] ?? false)
  }

  // Phase 7 Task 6 — retain the last submission so the recovery card's
  // Retry CTA can replay the same pipeline on a transient failure
  // (service_unavailable / deadline_exceeded). `null` means there's
  // nothing to retry (e.g. just after `reset()` or before any submit).
  const lastSubmissionRef = useRef<
    | { kind: 'real'; files: UploadFiles; dependants: DependantInput[] }
    | { kind: 'manual'; payload: ManualEntryPayload }
    | null
  >(null)

  function handleSubmitUpload(submission: UploadSubmission) {
    setDemoByTab(prev => ({ ...prev, upload: null }))
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
    setDemoByTab(prev => ({ ...prev, upload: persona }))
    setDemoMode(persona)
    setSampleLoadError(null)
    // Dev escape hatch — when NEXT_PUBLIC_USE_MOCK_SSE=1 the pipeline replays
    // canned events (Aisyah-shaped) regardless of persona; skip the fetch
    // entirely. The mock pipeline doesn't know about Farhan and would
    // desync, so only honour mock mode for Aisyah.
    const useMock =
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
      lastSubmissionRef.current = { kind: 'real', files, dependants }
      start({ mode: 'real', files, dependants })
    } catch (err) {
      setSampleLoadError(err instanceof Error ? err.message : String(err))
      setDemoMode(false)
      setDemoByTab(prev => ({ ...prev, upload: null }))
    } finally {
      setLoadingPersona(null)
    }
  }

  function handleUseSamplesManual() {
    // Inside the manual form — the form itself has already reset to Aisyah
    // values. Mark the manual tab as demo so switching to upload clears the
    // banner and switching back restores it. Manual mode is Aisyah-only;
    // Farhan lives on the upload tab.
    setDemoByTab(prev => ({ ...prev, manual: 'aisyah' }))
    setDemoMode('aisyah')
  }

  function handleClearManual() {
    // User wiped the manual form — demo banner should drop if it was up.
    setDemoByTab(prev => ({ ...prev, manual: null }))
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
    setDemoByTab(prev => ({ ...prev, upload: null }))
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
          <QuickStartGuide mode={mode} onModeChange={handleModeChange} />
          <IntakeModeToggle value={mode} onChange={handleModeChange} />
          {/* Both widgets stay mounted so partial form state survives a tab switch. */}
          <div className={cn(mode !== 'upload' && 'hidden')} aria-hidden={mode !== 'upload'}>
            <UploadWidget
              onSubmit={handleSubmitUpload}
              onUseSamples={handleUseSamplesUpload}
              samplesLoading={loadingPersona}
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

function QuickStartGuide({
  mode,
  onModeChange
}: {
  mode: IntakeMode
  onModeChange: (mode: IntakeMode) => void
}) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          {t('evaluation.intake.quickStartEyebrow')}
        </p>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {t('evaluation.intake.quickStartTitle')}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('evaluation.intake.quickStartDescription')}
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <PathCard
          icon={<Sparkles className="size-4" aria-hidden />}
          title={t('evaluation.intake.sampleTitle')}
          description={t('evaluation.intake.sampleDescription')}
          footer={t('evaluation.intake.sampleFooter')}
          tone="amber"
        />
        <PathCard
          icon={<FileText className="size-4" aria-hidden />}
          title={t('evaluation.intake.uploadTitle')}
          description={t('evaluation.intake.uploadDescription')}
          footer={t('evaluation.intake.uploadFooter')}
          active={mode === 'upload'}
          onClick={() => onModeChange('upload')}
        />
        <PathCard
          icon={<KeyboardIcon className="size-4" aria-hidden />}
          title={t('evaluation.intake.manualTitle')}
          description={t('evaluation.intake.manualDescription')}
          footer={t('evaluation.intake.manualFooter')}
          active={mode === 'manual'}
          onClick={() => onModeChange('manual')}
        />
      </div>
    </section>
  )
}

function PathCard({
  icon,
  title,
  description,
  footer,
  active = false,
  tone = 'default',
  onClick
}: {
  icon: React.ReactNode
  title: string
  description: string
  footer: string
  active?: boolean
  tone?: 'default' | 'amber'
  onClick?: () => void
}) {
  const clickable = onClick != null
  return (
    <Card
      className={cn(
        'border transition-colors',
        tone === 'amber' && 'border-amber-300/70 bg-amber-50/70 dark:border-amber-700/70 dark:bg-amber-950/20',
        clickable && 'cursor-pointer hover:border-primary/40 hover:bg-primary/5',
        active && 'border-primary bg-primary/5 ring-1 ring-primary/20'
      )}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <CardHeader className="gap-2">
        <div
          className={cn(
            'flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary',
            tone === 'amber' && 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
          )}
        >
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        <p className="text-xs font-medium text-foreground/80">{footer}</p>
      </CardContent>
    </Card>
  )
}
