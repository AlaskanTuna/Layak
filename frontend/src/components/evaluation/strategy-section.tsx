'use client'

import { useTranslation } from 'react-i18next'

import { StrategyCard } from '@/components/evaluation/strategy-card'
import type { StrategyAdvice } from '@/lib/agent-types'

type Props = {
  advisories: StrategyAdvice[]
  onAskCikLay?: (advice: StrategyAdvice) => void
}

export function StrategySection({ advisories, onAskCikLay }: Props) {
  const { t } = useTranslation()
  // Hard cap at 3 cards per spec §3.7 — the backend already caps but we
  // defensively slice here in case a legacy persisted eval carried more.
  const visible = advisories.filter((a) => a.confidence >= 0.5).slice(0, 3)

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="mono-caption text-foreground/55">{t('evaluation.strategy.sectionEyebrow')}</p>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {t('evaluation.strategy.sectionTitle')}
        </h2>
        <p className="text-sm text-foreground/65">{t('evaluation.strategy.sectionDescription')}</p>
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
