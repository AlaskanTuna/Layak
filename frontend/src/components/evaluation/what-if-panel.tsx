'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useWhatIf } from '@/hooks/use-what-if'
import type { Profile, WhatIfRequest, WhatIfResponse } from '@/lib/agent-types'

type Props = {
  evalId: string
  baselineProfile: Profile
  /** Lift state to the parent so scheme cards can read deltas + the rerun
   *  total animates on the upside hero (Phase 11 Feature 3 spec §4.4). */
  onResult: (result: WhatIfResponse | null) => void
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
    monthly_income_rm: clamp(profile.monthly_income_rm, SLIDER_RANGES.monthly_income_rm.min, SLIDER_RANGES.monthly_income_rm.max),
    dependants_count: clamp(children, SLIDER_RANGES.dependants_count.min, SLIDER_RANGES.dependants_count.max),
    elderly_dependants_count: clamp(elderly, SLIDER_RANGES.elderly_dependants_count.min, SLIDER_RANGES.elderly_dependants_count.max)
  }
}

function formatRm(value: number): string {
  return `RM ${value.toLocaleString('en-MY', { maximumFractionDigits: 0 })}`
}

export function WhatIfPanel({ evalId, baselineProfile, onResult }: Props) {
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
    if (whatIf.phase === 'ready' && whatIf.data) {
      onResult(whatIf.data)
    } else if (whatIf.phase === 'idle') {
      onResult(null)
    }
  }, [whatIf.phase, whatIf.data, onResult])

  const resetAll = useCallback(() => {
    setValues(baseline)
    // Hook clears in the diffs effect above when state matches baseline.
  }, [baseline])

  const resetSlider = useCallback(
    (key: keyof SliderInputs) => {
      setValues((prev) => ({ ...prev, [key]: baseline[key] }))
    },
    [baseline]
  )

  const isDirty = Object.keys(diffsFromBaseline).length > 0

  return (
    <section className="paper-card flex flex-col gap-4 rounded-[16px] p-5">
      {isDirty && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={resetAll} className="gap-1.5">
            <RotateCcw className="size-3.5" aria-hidden />
            {t('evaluation.whatIf.resetAll')}
          </Button>
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
          onReset={() => resetSlider('monthly_income_rm')}
          resetLabel={t('evaluation.whatIf.resetSlider')}
        />
        <SliderField
          label={t('evaluation.whatIf.sliderChildrenLabel')}
          value={values.dependants_count}
          baseline={baseline.dependants_count}
          range={SLIDER_RANGES.dependants_count}
          format={(v) => String(v)}
          onChange={(v) => setValues((prev) => ({ ...prev, dependants_count: v }))}
          onReset={() => resetSlider('dependants_count')}
          resetLabel={t('evaluation.whatIf.resetSlider')}
        />
        <SliderField
          label={t('evaluation.whatIf.sliderElderlyLabel')}
          value={values.elderly_dependants_count}
          baseline={baseline.elderly_dependants_count}
          range={SLIDER_RANGES.elderly_dependants_count}
          format={(v) => String(v)}
          onChange={(v) => setValues((prev) => ({ ...prev, elderly_dependants_count: v }))}
          onReset={() => resetSlider('elderly_dependants_count')}
          resetLabel={t('evaluation.whatIf.resetSlider')}
        />
      </div>

      <footer className="flex flex-col gap-2 border-t border-foreground/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm">
          {whatIf.phase === 'debouncing' || whatIf.phase === 'in-flight' ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-foreground/55" aria-hidden />
              <span className="mono-caption text-foreground/55">
                {t('evaluation.whatIf.running')}
              </span>
            </>
          ) : whatIf.phase === 'rate-limited' ? (
            <span className="mono-caption text-amber-700 dark:text-amber-400">
              {t('evaluation.whatIf.rateLimited', { seconds: whatIf.retryAfterSeconds ?? 60 })}
            </span>
          ) : whatIf.phase === 'error' ? (
            <span className="mono-caption text-destructive">
              {t('evaluation.whatIf.errorGeneric')}
            </span>
          ) : whatIf.data ? (
            <span className="mono-caption text-foreground/55">
              {t('evaluation.whatIf.totalUpsideLabel')}:{' '}
              <span className="font-mono tabular-nums text-foreground">
                {formatRm(whatIf.data.total_annual_rm)}
              </span>
            </span>
          ) : null}
        </div>
      </footer>
    </section>
  )
}

function SliderField({
  label,
  value,
  baseline,
  range,
  format,
  onChange,
  onReset,
  resetLabel
}: {
  label: string
  value: number
  baseline: number
  range: { min: number; max: number; step: number }
  format: (v: number) => string
  onChange: (v: number) => void
  onReset: () => void
  resetLabel: string
}) {
  const isDirty = value !== baseline
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="mono-caption text-foreground/55">{label}</span>
        {isDirty && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--primary)] hover:underline"
          >
            {resetLabel}
          </button>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[15px] tabular-nums text-foreground">{format(value)}</span>
        {isDirty && (
          <span className="mono-caption text-foreground/40">{format(baseline)} ↓</span>
        )}
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
