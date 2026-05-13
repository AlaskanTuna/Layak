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
import { PipelineNarrative } from '@/components/evaluation/pipeline-narrative'
import { RequiredContributionsCard } from '@/components/evaluation/required-contributions-card'
import { ResultsChatPanel } from '@/components/evaluation/results-chat-panel'
import { StrategySection } from '@/components/evaluation/strategy-section'
import { WhatIfPanel } from '@/components/evaluation/what-if-panel'
import { useChat } from '@/hooks/use-chat'
import { SchemeCardGrid } from '@/components/evaluation/scheme-card-grid'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import type { PipelineState, StepStatus } from '@/hooks/use-agent-pipeline'
import { useAuth } from '@/lib/auth-context'
import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import {
  type ComputeUpsideResult,
  type EvaluationDoc,
  type EvaluationStepState,
  PIPELINE_STEPS,
  type Step,
  type WhatIfResponse
} from '@/lib/agent-types'
import type { ChatScenarioContext } from '@/lib/chat-types'
import { authedFetch } from '@/lib/firebase'
import { notificationStore } from '@/lib/notification-store'

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
    errorCategory: doc.error?.category ?? null,
    // Phase 11 Feature 4 — replay the lay/dev tier events on persisted load.
    // Legacy docs without these fields fall back to empty arrays; the
    // narrative component degrades to the old stepper-style UI in that case.
    narrativeEvents: doc.narrativeLog ?? [],
    technicalEvents: doc.technicalLog ?? [],
    // Phase 11 Feature 2 — replay persisted strategy advisories.
    strategy: doc.strategy ?? []
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
  const lastStatusRef = useRef<string | null>(null)
  // Phase 11 Feature 2 — lifted chat hook. Called BEFORE the early returns
  // below so it always runs (Rules of Hooks). Shared between the chat panel
  // and the Strategy section's "Ask Cik Lay about this" CTA so the handoff
  // stages a draft + advisory on the SAME hook instance the panel renders.
  const chat = useChat(evalId)
  // Phase 11 Feature 3 — latest what-if rerun. When non-null, scheme cards
  // render delta chips and the upside hero swaps to `total_annual_rm`.
  const [whatIfPreview, setWhatIfPreview] = useState<{
    result: WhatIfResponse
    context: ChatScenarioContext
  } | null>(null)
  const whatIfResult = whatIfPreview?.result ?? null
  const handleWhatIfResult = useCallback(
    (result: WhatIfResponse | null, context: ChatScenarioContext | null) => {
      setWhatIfPreview(result && context ? { result, context } : null)
    },
    []
  )

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

  useEffect(() => {
    if (!doc) return
    const prev = lastStatusRef.current
    lastStatusRef.current = doc.status
    if (prev === doc.status) return
    // Only fire on a real transition FROM 'running' to a terminal state —
    // i.e. the user was actively watching the pipeline finish in this session.
    // When navigating into a historical (already-complete) eval from the
    // history table, `prev` is `null` so we skip the emit; the streaming
    // path's bell entry already captured the original completion at the time.
    if (prev !== 'running') return

    if (doc.status === 'complete') {
      const qualifyingCount = doc.matches.filter((m) => m.qualifies).length
      if (qualifyingCount > 0) {
        notificationStore.notify({
          title: t('common.notifications.events.evalComplete.title'),
          description: t('common.notifications.events.evalComplete.body', { count: qualifyingCount }),
          severity: 'success',
          toast: true,
          groupKey: `eval-${evalId}`
        })
      } else {
        notificationStore.notify({
          title: t('common.notifications.events.evalCompleteEmpty.title'),
          description: t('common.notifications.events.evalCompleteEmpty.body'),
          severity: 'info',
          toast: true,
          groupKey: `eval-${evalId}`
        })
      }
    } else if (doc.status === 'error') {
      notificationStore.notify({
        title: t('common.notifications.events.evalFailed.title'),
        description: t('common.notifications.events.evalFailed.body', {
          category: doc.error?.category ?? 'Unknown error'
        }),
        severity: 'error',
        toast: true,
        groupKey: `eval-${evalId}`
      })
    }
  }, [doc, evalId, t])

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
  const displayedMatches = whatIfResult?.matches ?? doc.matches
  const matchedCount = displayedMatches.filter((m) => m.qualifies).length
  const totalAnnualRm = whatIfResult?.total_annual_rm ?? doc.totalAnnualRM ?? 0
  const hasChatContext = doc.matches.some((m) => m.qualifies) || whatIfResult !== null
  const hasContent = isComplete || (isRunning && doc.matches.length > 0)

  // Derive section presence from the *actual* data the children will render.
  // The cards below all self-hide on empty inputs (RequiredContributionsCard
  // and DraftPacketPreview return null when their filtered slice is empty);
  // mirroring that here keeps the TOC truthful and prevents dangling anchors
  // that scroll to nothing.
  const hasRequiredContributions = doc.matches.some((m) => m.qualifies && m.kind === 'required_contribution')
  const hasSubsidies = doc.matches.some((m) => m.qualifies && m.kind === 'subsidy_credit')
  const hasUpsideMatches = doc.matches.some((m) => m.qualifies && (m.kind ?? 'upside') === 'upside')
  const hasQualifyingForPacket = doc.matches.some((m) => m.qualifies)

  const showOverview = hasContent
  const showSchemes = hasContent && (hasUpsideMatches || !isComplete)
  const showSubsidies = hasContent && hasSubsidies
  const showRequired = hasContent && hasRequiredContributions
  const showPreview = isComplete && hasQualifyingForPacket
  // Phase 11 Feature 2 — Strategy section renders whenever the eval reached
  // the optimize_strategy step, even when no advisories tripped (the empty
  // state communicates "no conflicts detected").
  const optimizerComplete = doc.stepStates.optimize_strategy === 'complete'
  const showStrategy = isComplete && optimizerComplete
  const showWhatIfs = isComplete && Boolean(doc.profile)

  // Page order matches the spec: Overview → Eligible Schemes → Subsidies →
  // Required Contributions → Strategy → What-Ifs → Inline Preview.
  const visibleSections: readonly TocSectionId[] = (() => {
    const ids: TocSectionId[] = []
    if (showOverview) ids.push('overview')
    if (showSchemes) ids.push('schemes')
    if (showSubsidies) ids.push('subsidies')
    if (showRequired) ids.push('required')
    if (showStrategy) ids.push('strategy')
    if (showWhatIfs) ids.push('whatIfs')
    if (showPreview) ids.push('preview')
    return ids
  })()


  function handleStartAnother() {
    setDemoMode(false)
    reset()
    router.push('/dashboard/evaluation/upload')
  }

  return (
    <div className="flex flex-col gap-6">
      {(isRunning || isError) && <PipelineNarrative state={pipelineState} />}

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
            {showOverview && (
              <section
                id="overview"
                aria-label={t('evaluation.results.toc.overview')}
                className="flex scroll-mt-28 flex-col gap-4 lg:scroll-mt-20"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-heading text-xl font-semibold tracking-tight">
                    {t('evaluation.results.toc.overview')}
                  </h2>
                  {whatIfResult && (
                    <span className="mono-caption rounded-full border border-[color:var(--primary)]/35 bg-[color:var(--primary)]/10 px-2.5 py-1 text-[color:var(--primary)]">
                      {t('evaluation.whatIf.previewLabel')}
                    </span>
                  )}
                </div>
                <EvaluationUpsideHero
                  totalAnnualRm={totalAnnualRm}
                  matchedCount={matchedCount}
                  packet={null}
                  empty={!isComplete}
                />
                {isComplete && <EvaluationSummaryCard evalId={evalId} />}
              </section>
            )}
            {showSchemes && (
              <section
                id="schemes"
                aria-label={t('evaluation.results.toc.schemes')}
                className="scroll-mt-28 lg:scroll-mt-20"
              >
                <SchemeCardGrid
                  matches={whatIfResult?.matches ?? doc.matches}
                  deltas={whatIfResult?.deltas ?? null}
                  kind="upside"
                />
              </section>
            )}
            {showSubsidies && (
              <section
                id="subsidies"
                aria-label={t('evaluation.results.toc.subsidies')}
                className="flex scroll-mt-28 flex-col gap-3 lg:scroll-mt-20"
              >
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl font-semibold tracking-tight">
                    {t('evaluation.subsidies.title')}
                  </h2>
                  <InfoTooltip
                    content={t('evaluation.subsidies.description')}
                    label={t('evaluation.subsidies.description')}
                  />
                </div>
                <SchemeCardGrid
                  matches={whatIfResult?.matches ?? doc.matches}
                  deltas={whatIfResult?.deltas ?? null}
                  kind="subsidy_credit"
                  hideHeading
                />
              </section>
            )}
            {showRequired && (
              <section
                id="required"
                aria-label={t('evaluation.results.toc.required')}
                className="scroll-mt-28 lg:scroll-mt-20"
              >
                <RequiredContributionsCard matches={doc.matches} />
              </section>
            )}
            {showStrategy && (
              <section
                id="strategy"
                aria-label={t('evaluation.results.toc.strategy')}
                className="scroll-mt-28 lg:scroll-mt-20"
              >
                <StrategySection
                  advisories={whatIfResult?.strategy ?? pipelineState.strategy}
                  onAskCikLay={(advice) =>
                    chat.handoffFromAdvice(advice, whatIfPreview?.context ?? null)
                  }
                />
              </section>
            )}
            {showWhatIfs && doc.profile && (
              <section
                id="whatIfs"
                aria-label={t('evaluation.results.toc.whatIfs')}
                className="flex scroll-mt-28 flex-col gap-3 lg:scroll-mt-20"
              >
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-xl font-semibold tracking-tight">
                    {t('evaluation.whatIfs.sectionTitle')}
                  </h2>
                  <InfoTooltip
                    content={t('evaluation.whatIfs.sectionDescription')}
                    label={t('evaluation.whatIfs.sectionDescription')}
                  />
                </div>
                <WhatIfPanel
                  evalId={evalId}
                  baselineProfile={doc.profile}
                  onResult={handleWhatIfResult}
                  onAskCikLay={chat.handoffFromScenario}
                />
              </section>
            )}
            {showPreview && (
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
            )}
            {!isRunning && !isError && pipelineState.narrativeEvents.length > 0 && (
              <PipelineNarrative state={pipelineState} retrospective />
            )}
            {isComplete && (
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
            )}
          </div>

          <EvaluationResultsToc visibleSections={visibleSections} />
        </div>
      )}

      {/* Phase 10 — floating chatbot. Only available when the eval has at
          least one qualifying match (no chat without context). The panel
          uses fixed positioning, so it never affects the page layout above. */}
      {isComplete && hasChatContext && (
        <ResultsChatPanel evalId={evalId} matches={displayedMatches} chat={chat} />
      )}
    </div>
  )
}
