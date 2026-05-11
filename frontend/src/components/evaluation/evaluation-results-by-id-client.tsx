'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { DraftPacketPreview } from '@/components/evaluation/draft-packet-preview'
import { ErrorRecoveryCard } from '@/components/evaluation/error-recovery-card'
import { EvaluationResultsToc, type TocSectionId } from '@/components/evaluation/evaluation-results-toc'
import { EvaluationSummaryCard } from '@/components/evaluation/evaluation-summary-card'
import { EvaluationUpsideHero } from '@/components/evaluation/evaluation-upside-hero'
import { PersistedPacketDownload } from '@/components/evaluation/persisted-packet-download'
import { PipelineStepper } from '@/components/evaluation/pipeline-stepper'
import { RequiredContributionsCard } from '@/components/evaluation/required-contributions-card'
import { ResultsChatPanel } from '@/components/evaluation/results-chat-panel'
import { SchemeCardGrid } from '@/components/evaluation/scheme-card-grid'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { PipelineState, StepStatus } from '@/hooks/use-agent-pipeline'
import { useAuth } from '@/lib/auth-context'
import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import {
  type ComputeUpsideResult,
  type EvaluationDoc,
  type EvaluationStepState,
  PIPELINE_STEPS,
  type Step
} from '@/lib/agent-types'
import { authedFetch } from '@/lib/firebase'

const POLL_INTERVAL_MS = 2000

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

function mapStepState(state: EvaluationStepState): StepStatus {
  if (state === 'running') return 'active'
  return state
}

/**
 * Adapt the Firestore-stored EvaluationDoc into the same `PipelineState`
 * shape the streaming `PipelineStepper` already consumes. That way the
 * stepper component (and downstream UI) doesn't need a second renderer
 * for the persisted path.
 */
function docToPipelineState(doc: EvaluationDoc): PipelineState {
  const stepStates = Object.fromEntries(
    PIPELINE_STEPS.map((step) => [step, mapStepState(doc.stepStates[step] ?? 'pending')])
  ) as Record<Step, StepStatus>

  // The persistence layer mirrors the compute_upside trace so the panel
  // rebuilds verbatim after a refresh / deep link. Pre-trace evaluations
  // (written before the field landed) fall back to deriving the per-scheme
  // breakdown from `matches` so the meter still has totals — but the Python
  // snippet + stdout will be empty and the CodeExecutionPanel will hide.
  const upside: ComputeUpsideResult | null =
    doc.stepStates.compute_upside === 'complete'
      ? {
          python_snippet: doc.upsideTrace?.pythonSnippet ?? '',
          stdout: doc.upsideTrace?.stdout ?? '',
          total_annual_rm: doc.totalAnnualRM,
          per_scheme_rm:
            doc.upsideTrace?.perSchemeRM ??
            Object.fromEntries(doc.matches.filter((m) => m.qualifies).map((m) => [m.scheme_id, m.annual_rm]))
        }
      : null

  return {
    phase: doc.status === 'complete' ? 'done' : doc.status === 'error' ? 'error' : 'streaming',
    stepStates,
    profile: doc.profile,
    classification: doc.classification,
    matches: doc.matches,
    upside,
    packet: null,
    evalId: null,
    quotaExceeded: null,
    error: doc.error?.message ?? null,
    errorCategory: doc.error?.category ?? null
  }
}

type FetchPhase = 'loading' | 'ready' | 'not_found' | 'error'

export function EvaluationResultsByIdClient({ evalId }: { evalId: string }) {
  const router = useRouter()
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const { reset, setDemoMode } = useEvaluation()
  const [doc, setDoc] = useState<EvaluationDoc | null>(null)
  const [phase, setPhase] = useState<FetchPhase>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pollHandleRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchDoc = useCallback(async () => {
    try {
      const res = await authedFetch(`${getBackendUrl()}/api/evaluations/${evalId}`, {
        method: 'GET'
      })
      if (res.status === 404) {
        setPhase('not_found')
        return
      }
      if (!res.ok) {
        setErrorMessage(t('evaluation.results.backendReturned', { status: res.status, statusText: res.statusText }))
        setPhase('error')
        return
      }
      const next = (await res.json()) as EvaluationDoc
      setDoc(next)
      setPhase('ready')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }, [evalId, t])

  // Initial hydrate — runs after Firebase auth resolves so authedFetch can
  // attach the Bearer token. AuthGuard upstream already guarantees `user`
  // is set, but useAuth's `loading` flag protects the first render.
  // setState lands AFTER the await resolves; the lint rule's strict reading
  // covers a synchronous-setState-in-effect pattern that this code doesn't
  // hit, but the rule still trips on the call graph — silenced inline.
  useEffect(() => {
    if (authLoading || !user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDoc()
  }, [authLoading, user, fetchDoc])

  // Poll while running. Stops on `complete` / `error` / `not_found`.
  useEffect(() => {
    if (phase !== 'ready' || !doc || doc.status !== 'running') return
    pollHandleRef.current = setInterval(() => {
      void fetchDoc()
    }, POLL_INTERVAL_MS)
    return () => {
      if (pollHandleRef.current) {
        clearInterval(pollHandleRef.current)
        pollHandleRef.current = null
      }
    }
  }, [phase, doc, fetchDoc])

  useEffect(
    () => () => {
      // The evaluation provider is shared across the whole
      // `/dashboard/evaluation/*` subtree. Clear any completed/demo state when
      // the user leaves results so upload/history pages don't inherit it.
      setDemoMode(false)
      reset()
    },
    [reset, setDemoMode]
  )

  const pipelineState = useMemo(() => (doc ? docToPipelineState(doc) : null), [doc])

  if (phase === 'loading' || authLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t('evaluation.results.loading')}
      </div>
    )
  }

  if (phase === 'not_found') {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t('evaluation.results.notFoundTitle')}</AlertTitle>
        <AlertDescription>
          {t('evaluation.results.notFoundBody')}
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" render={<Link href="/dashboard/evaluation" />}>
              <ArrowLeft className="mr-1.5 size-3.5" aria-hidden />
              {t('evaluation.results.backToEvaluations')}
            </Button>
            <Button size="sm" render={<Link href="/dashboard/evaluation/upload" />}>
              {t('evaluation.results.startNew')}
              <ArrowRight className="ml-1.5 size-3.5" aria-hidden />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (phase === 'error' || !doc || !pipelineState) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>{t('evaluation.results.errorTitle')}</AlertTitle>
        <AlertDescription>
          {errorMessage ?? t('evaluation.results.errorUnexpected')}
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPhase('loading')
                void fetchDoc()
              }}
            >
              {t('evaluation.results.retry')}
            </Button>
            <Button size="sm" render={<Link href="/dashboard/evaluation" />}>
              {t('evaluation.results.backToEvaluations')}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  const isRunning = doc.status === 'running'
  const isComplete = doc.status === 'complete'
  const isError = doc.status === 'error'

  // `totalAnnualRM` remains upside-only, but the hero copy should reflect the
  // full matched set the user sees on the page, including required-
  // contribution items surfaced in the separate card below.
  const matchedCount = doc.matches.filter((m) => m.qualifies).length
  const totalAnnualRm = doc.totalAnnualRM ?? 0
  const hasContent = isComplete || (isRunning && doc.matches.length > 0)

  const visibleSections: readonly TocSectionId[] = (() => {
    const ids: TocSectionId[] = []
    if (hasContent) {
      ids.push('overview', 'schemes', 'required')
    }
    if (isComplete) {
      ids.push('preview', 'download')
    }
    return ids
  })()

  function handleStartAnother() {
    setDemoMode(false)
    reset()
    router.push('/dashboard/evaluation/upload')
  }

  return (
    <div className="flex flex-col gap-6">
      {(isRunning || isError) && <PipelineStepper state={pipelineState} />}

      {isError && (
        // Category-tailored recovery on persisted errors. The original
        // files + dependants aren't retained server-side, so Retry isn't
        // meaningful here; omitted `onRetry` tells the card to drop the
        // Retry CTA entirely. The remaining CTAs (manual, samples,
        // settings, reset) all route back to the upload page where the
        // user picks a fresh submission — category still drives which of
        // those CTAs renders.
        <ErrorRecoveryCard
          message={doc.error?.message ?? t('evaluation.unknownError')}
          category={doc.error?.category ?? null}
          onUseSamples={handleStartAnother}
          onReset={handleStartAnother}
          onSwitchToManual={() => router.push('/dashboard/evaluation/upload?mode=manual')}
        />
      )}

      {hasContent && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px] lg:gap-10">
          <div className="flex min-w-0 flex-col gap-6">
            <section
              id="overview"
              aria-label={t('evaluation.results.toc.overview')}
              className="flex scroll-mt-28 flex-col gap-4 lg:scroll-mt-20"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-heading text-xl font-semibold tracking-tight">
                  {t('evaluation.results.toc.overview')}
                </h2>
              </div>
              <EvaluationUpsideHero
                totalAnnualRm={totalAnnualRm}
                matchedCount={matchedCount}
                packet={null}
                empty={!isComplete}
              />
              {isComplete && <EvaluationSummaryCard evalId={evalId} />}
            </section>
            <section
              id="schemes"
              aria-label={t('evaluation.results.toc.schemes')}
              className="scroll-mt-28 lg:scroll-mt-20"
            >
              <SchemeCardGrid matches={doc.matches} />
            </section>
            <section
              id="required"
              aria-label={t('evaluation.results.toc.required')}
              className="scroll-mt-28 lg:scroll-mt-20"
            >
              <RequiredContributionsCard matches={doc.matches} />
            </section>

            {isComplete && (
              <>
                <section
                  id="preview"
                  aria-label={t('evaluation.results.toc.preview')}
                  className="flex scroll-mt-28 flex-col gap-4 lg:scroll-mt-20"
                >
                  <h2 className="font-heading text-xl font-semibold tracking-tight">
                    {t('evaluation.results.toc.preview')}
                  </h2>
                  <DraftPacketPreview evalId={evalId} matches={doc.matches} />
                </section>
                <section
                  id="download"
                  aria-label={t('evaluation.results.toc.download')}
                  className="flex scroll-mt-28 flex-col gap-4 lg:scroll-mt-20"
                >
                  <h2 className="font-heading text-xl font-semibold tracking-tight">
                    {t('evaluation.results.toc.download')}
                  </h2>
                  <PersistedPacketDownload evalId={evalId} matches={doc.matches} />
                  <div className="flex border-t border-foreground/10 pt-5">
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleStartAnother}
                      className="rounded-full bg-[color:var(--hibiscus)] px-6 text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
                    >
                      {t('evaluation.results.startAnother')}
                      <ArrowRight className="ml-1.5 size-4" aria-hidden />
                    </Button>
                  </div>
                </section>
              </>
            )}
          </div>

          <EvaluationResultsToc visibleSections={visibleSections} />
        </div>
      )}

      {/* Phase 10 — floating chatbot. Only available when the eval has at
          least one qualifying match (no chat without context). The panel
          uses fixed positioning, so it never affects the page layout above. */}
      {isComplete && matchedCount > 0 && <ResultsChatPanel evalId={evalId} matches={doc.matches} />}
    </div>
  )
}
