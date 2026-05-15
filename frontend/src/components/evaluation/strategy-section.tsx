'use client'

import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react'

import { StrategyCard } from '@/components/evaluation/strategy-card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import type { StrategyAdvice } from '@/lib/agent-types'

type ScenarioStrategyStatus = 'baseline' | 'refreshing' | 'ready' | 'empty' | 'error'

type Props = {
  advisories: StrategyAdvice[]
  scenarioStatus?: ScenarioStrategyStatus
  onAskCikLay?: (advice: StrategyAdvice) => void
}

const SCENARIO_STATUS_STYLES: Record<ScenarioStrategyStatus, string> = {
  baseline: 'invisible border-transparent bg-transparent text-foreground/55',
  refreshing: 'border-foreground/15 bg-foreground/[0.04] text-foreground/60',
  ready: 'border-[color:var(--forest)]/30 bg-[color:var(--forest)]/8 text-[color:var(--forest)]',
  empty: 'border-foreground/15 bg-foreground/[0.04] text-foreground/60',
  error: 'border-[color:var(--hibiscus)]/30 bg-[color:var(--hibiscus)]/8 text-[color:var(--hibiscus)]'
}

export function StrategySection({ advisories, scenarioStatus = 'baseline', onAskCikLay }: Props) {
  const { t } = useTranslation()
  // Hard cap at 3 cards per spec §3.7 — the backend already caps but we
  // defensively slice here in case a legacy persisted eval carried more.
  const visible = advisories.filter((a) => a.confidence >= 0.5).slice(0, 3)
  const description = t('evaluation.strategy.sectionDescription')

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-xl font-semibold tracking-tight">{t('evaluation.strategy.sectionTitle')}</h2>
          <InfoTooltip content={description} label={description} />
        </div>
        <div
          className={`inline-flex min-h-8 w-fit items-center gap-2 rounded-full border px-3 py-1.5 ${SCENARIO_STATUS_STYLES[scenarioStatus]}`}
          aria-hidden={scenarioStatus === 'baseline'}
        >
          {scenarioStatus === 'refreshing' ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : scenarioStatus === 'ready' ? (
            <CheckCircle2 className="size-3.5" aria-hidden />
          ) : scenarioStatus === 'error' ? (
            <AlertTriangle className="size-3.5" aria-hidden />
          ) : (
            <Info className="size-3.5" aria-hidden />
          )}
          <span className="mono-caption">
            {t(`evaluation.strategy.scenario.${scenarioStatus === 'baseline' ? 'refreshing' : scenarioStatus}`)}
          </span>
        </div>
      </header>

      {visible.length === 0 ? (
        <div className="paper-card flex flex-col gap-1 rounded-[16px] border border-[color:var(--forest)]/25 p-5">
          <p className="font-heading text-[15.5px] font-semibold tracking-tight">
            {t('evaluation.strategy.emptyHeadline')}
          </p>
          <p className="text-sm text-foreground/65">{t('evaluation.strategy.emptyDescription')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visible.map((advice) => (
            <StrategyCard key={advice.advice_id} advice={advice} onAskCikLay={onAskCikLay} />
          ))}
        </div>
      )}
    </section>
  )
}
