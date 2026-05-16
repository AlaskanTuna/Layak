'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { type WhatIfStrategyPhase, useWhatIf } from '@/hooks/use-what-if'
import type { Profile, WhatIfRequest, WhatIfResponse } from '@/lib/agent-types'
import type { ChatScenarioContext } from '@/lib/chat-types'

type Props = {
  evalId: string
  baselineProfile: Profile
  /** Lift state to the parent so scheme cards can read deltas + the rerun
   *  total animates on the upside hero (Phase 11 Feature 3 spec §4.4). */
  onResult: (
    result: WhatIfResponse | null,
    context: ChatScenarioContext | null,
    strategyPhase: WhatIfStrategyPhase
  ) => void
  onAskCikLay?: (context: ChatScenarioContext, draft: string) => void
  onHeaderActionChange?: (state: HeaderActionState | null) => void
  /** Signal the parent that a scenario rerun is in flight so dependent
   *  surfaces (scheme grids) can render a recalculating affordance. Fired
   *  on every phase transition. */
  onPendingChange?: (pending: boolean) => void
}

type HeaderActionState = {
  isDirty: boolean
  resetAll: () => void
}

type SliderInputs = {
  monthly_income_rm: number
  dependants_count: number
  elderly_dependants_count: number
}

const SLIDER_RANGES = {
  monthly_income_rm: { min: 0, max: 15_000, step: 100 },
  dependants_count: { min: 0, max: 6, step: 1 },
  elderly_dependants_count: { min: 0, max: 4, step: 1 }
} as const

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function deriveBaselineSliders(profile: Profile): SliderInputs {
  const children = profile.dependants.filter(
    (d) => (d.relationship === 'child' || d.relationship === 'sibling') && d.age < 18
  ).length
  const elderly = profile.dependants.filter(
    (d) => (d.relationship === 'parent' || d.relationship === 'grandparent') && d.age >= 60
  ).length
  return {
    monthly_income_rm: clamp(
      profile.monthly_income_rm,
      SLIDER_RANGES.monthly_income_rm.min,
      SLIDER_RANGES.monthly_income_rm.max
    ),
    dependants_count: clamp(children, SLIDER_RANGES.dependants_count.min, SLIDER_RANGES.dependants_count.max),
    elderly_dependants_count: clamp(
      elderly,
      SLIDER_RANGES.elderly_dependants_count.min,
      SLIDER_RANGES.elderly_dependants_count.max
    )
  }
}

function formatRm(value: number): string {
  return `RM ${value.toLocaleString('en-MY', { maximumFractionDigits: 0 })}`
}

function scenarioStrategyStatus(
  phase: WhatIfStrategyPhase,
  strategyCount: number
): ChatScenarioContext['strategy_status'] {
  if (phase === 'refreshing') return 'refreshing'
  if (phase === 'error') return 'error'
  if (phase === 'ready') return strategyCount > 0 ? 'ready' : 'empty'
  return 'not_requested'
}

export function WhatIfPanel({
  evalId,
  baselineProfile,
  onResult,
  onAskCikLay,
  onHeaderActionChange,
  onPendingChange
}: Props) {
  const { t } = useTranslation()
  const baseline = useMemo(() => deriveBaselineSliders(baselineProfile), [baselineProfile])
  const [values, setValues] = useState<SliderInputs>(baseline)
  const whatIf = useWhatIf(evalId)

  // Whenever a slider moves AWAY from baseline, queue a debounced rerun.
  // When the user resets all sliders to baseline, drop the override state
  // entirely (the parent reverts to the persisted eval).
  const diffsFromBaseline = useMemo(() => {
    const overrides: WhatIfRequest['overrides'] = {}
    if (values.monthly_income_rm !== baseline.monthly_income_rm) {
      overrides.monthly_income_rm = values.monthly_income_rm
    }
    if (values.dependants_count !== baseline.dependants_count) {
      overrides.dependants_count = values.dependants_count
    }
    if (values.elderly_dependants_count !== baseline.elderly_dependants_count) {
      overrides.elderly_dependants_count = values.elderly_dependants_count
    }
    return overrides
  }, [values, baseline])

  const scenarioContext = useMemo<ChatScenarioContext | null>(() => {
    if (whatIf.phase !== 'ready' || !whatIf.data) return null
    return {
      overrides: diffsFromBaseline,
      total_annual_rm: whatIf.data.total_annual_rm,
      matches: whatIf.data.matches,
      deltas: whatIf.data.deltas,
      strategy: whatIf.strategyPhase === 'ready' ? whatIf.data.strategy : [],
      strategy_status: scenarioStrategyStatus(whatIf.strategyPhase, whatIf.data.strategy.length)
    }
  }, [diffsFromBaseline, whatIf.data, whatIf.phase, whatIf.strategyPhase])

  // Effect drives the debounced rerun. `runWhatIf` itself debounces 500ms.
  useEffect(() => {
    if (Object.keys(diffsFromBaseline).length === 0) {
      whatIf.clear()
      return
    }
    whatIf.runWhatIf(diffsFromBaseline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diffsFromBaseline])

  // Bubble the latest result up to the parent for delta-chip + total
  // rendering. Treat 'rate-limited' / 'error' as no-result states so the
  // page doesn't strand stale data.
  useEffect(() => {
    if (whatIf.phase === 'ready' && whatIf.data && scenarioContext) {
      onResult(whatIf.data, scenarioContext, whatIf.strategyPhase)
    } else if (whatIf.phase === 'idle' || whatIf.phase === 'rate-limited' || whatIf.phase === 'error') {
      onResult(null, null, 'idle')
    }
  }, [whatIf.phase, whatIf.data, whatIf.strategyPhase, onResult, scenarioContext])

  // Bubble pending state so scheme grids can pulse while the deterministic
  // rerun is debouncing or in flight. Deterministic backend latency is
  // sub-ms but network latency + 500ms debounce still produce a perceptible
  // window where the cards on screen are stale.
  const isPending = whatIf.phase === 'debouncing' || whatIf.phase === 'in-flight'
  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])

  const resetAll = useCallback(() => {
    setValues(baseline)
    // Hook clears in the diffs effect above when state matches baseline.
  }, [baseline])

  const isDirty = Object.keys(diffsFromBaseline).length > 0

  useEffect(() => {
    onHeaderActionChange?.({ isDirty, resetAll })
  }, [isDirty, onHeaderActionChange, resetAll])

  useEffect(
    () => () => {
      onHeaderActionChange?.(null)
    },
    [onHeaderActionChange]
  )

  return (
    <div className="flex flex-col gap-2">
      <section className="paper-card flex flex-col gap-4 rounded-[16px] p-5">
        {whatIf.data && (
          <div className="-mb-1 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <span className="mono-caption text-foreground/55">{t('evaluation.whatIf.totalUpsideLabel')}</span>
            <span className="font-mono text-xl font-semibold tabular-nums text-foreground sm:text-2xl">
              {formatRm(whatIf.data.total_annual_rm)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <SliderField
            label={t('evaluation.whatIf.sliderIncomeLabel')}
            value={values.monthly_income_rm}
            baseline={baseline.monthly_income_rm}
            range={SLIDER_RANGES.monthly_income_rm}
            format={(v) => formatRm(v)}
            onChange={(v) => setValues((prev) => ({ ...prev, monthly_income_rm: v }))}
          />
          <SliderField
            label={t('evaluation.whatIf.sliderChildrenLabel')}
            value={values.dependants_count}
            baseline={baseline.dependants_count}
            range={SLIDER_RANGES.dependants_count}
            format={(v) => String(v)}
            onChange={(v) => setValues((prev) => ({ ...prev, dependants_count: v }))}
          />
          <SliderField
            label={t('evaluation.whatIf.sliderElderlyLabel')}
            value={values.elderly_dependants_count}
            baseline={baseline.elderly_dependants_count}
            range={SLIDER_RANGES.elderly_dependants_count}
            format={(v) => String(v)}
            onChange={(v) => setValues((prev) => ({ ...prev, elderly_dependants_count: v }))}
          />
        </div>

        <footer className="flex flex-col gap-2 border-t border-foreground/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm">
            {whatIf.phase === 'debouncing' || whatIf.phase === 'in-flight' ? (
              <>
                <Loader2 className="size-3.5 animate-spin text-foreground/55" aria-hidden />
                <span className="mono-caption text-foreground/55">{t('evaluation.whatIf.running')}</span>
              </>
            ) : whatIf.phase === 'rate-limited' ? (
              <span className="mono-caption text-amber-700 dark:text-amber-400">
                {t('evaluation.whatIf.rateLimited', { seconds: whatIf.retryAfterSeconds ?? 60 })}
              </span>
            ) : whatIf.phase === 'error' ? (
              <span className="mono-caption text-destructive">{t('evaluation.whatIf.errorGeneric')}</span>
            ) : null}
          </div>
          {scenarioContext && onAskCikLay && (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              {scenarioContext.strategy_status === 'refreshing' && (
                <span className="mono-caption text-foreground/50">
                  {t('evaluation.whatIf.strategyStillRefreshing')}
                </span>
              )}
              {(scenarioContext.strategy_status === 'empty' || scenarioContext.strategy_status === 'error') && (
                <span className="mono-caption text-foreground/50">{t('evaluation.whatIf.strategyNotBlocking')}</span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onAskCikLay(
                    scenarioContext,
                    scenarioContext.strategy_status === 'ready'
                      ? t('evaluation.whatIf.askScenarioPrompt')
                      : t('evaluation.whatIf.askScenarioWithoutStrategyPrompt')
                  )
                }
                className="gap-1.5 self-start rounded-full sm:self-auto"
              >
                <MessageCircle className="size-3.5" aria-hidden />
                {scenarioContext.strategy_status === 'ready'
                  ? t('evaluation.whatIf.askScenario')
                  : t('evaluation.whatIf.askScenarioChanges')}
              </Button>
            </div>
          )}
        </footer>
      </section>
    </div>
  )
}

function SliderField({
  label,
  value,
  baseline,
  range,
  format,
  onChange
}: {
  label: string
  value: number
  baseline: number
  range: { min: number; max: number; step: number }
  format: (v: number) => string
  onChange: (v: number) => void
}) {
  const isDirty = value !== baseline
  return (
    <div className="flex min-h-[88px] flex-col gap-1.5">
      <span className="mono-caption block h-5 leading-[1.15] text-foreground/55">{label}</span>
      <div className="flex h-7 min-w-0 items-baseline gap-2">
        <span className="shrink-0 whitespace-nowrap font-mono text-[15px] tabular-nums text-foreground">
          {format(value)}
        </span>
        <span
          className={`mono-caption min-w-0 truncate whitespace-nowrap text-foreground/40 ${isDirty ? '' : 'invisible'}`}
        >
          {format(baseline)} baseline
        </span>
      </div>
      <input
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-foreground/15 accent-[color:var(--primary)]"
      />
    </div>
  )
}
