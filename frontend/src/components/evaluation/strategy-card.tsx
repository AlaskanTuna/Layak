'use client'

import { AlertTriangle, CheckCircle2, Info, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { StrategyAdvice } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

type Props = {
  advice: StrategyAdvice
  onAskCikLay?: (advice: StrategyAdvice) => void
}

const SEVERITY_ICONS = {
  info: Info,
  warn: AlertTriangle,
  act: CheckCircle2
} as const

const SEVERITY_TINT = {
  info: 'text-[color:var(--primary)]',
  warn: 'text-amber-700 dark:text-amber-400',
  act: 'text-[color:var(--forest)]'
} as const

const SEVERITY_BORDER = {
  info: 'border-[color:var(--primary)]/30',
  warn: 'border-amber-500/35',
  act: 'border-[color:var(--forest)]/35'
} as const

function formatCitation(advice: StrategyAdvice): string {
  // Per UX revamp: cite the scheme file name only — drop section + page so
  // the strategy card's footer stays short and reads at a glance.
  return advice.citation.pdf
}

export function StrategyCard({ advice, onAskCikLay }: Props) {
  const { t } = useTranslation()
  // Layer 5: confidence-gated render. Spec §3.5:
  //   - >= 0.8 full card
  //   - 0.5–0.8 soft suggestion + force-show CTA
  //   - < 0.5 suppressed (handled at the section level, not here, but
  //     we guard defensively anyway).
  if (advice.confidence < 0.5) return null
  const isSoft = advice.confidence < 0.8
  const Icon = SEVERITY_ICONS[advice.severity]
  const forceShowCta = isSoft
  const showCta = forceShowCta || advice.suggested_chat_prompt !== null

  return (
    <article
      className={cn('paper-card flex flex-col gap-3 rounded-[16px] border p-5', SEVERITY_BORDER[advice.severity])}
    >
      <header className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 size-4 shrink-0', SEVERITY_TINT[advice.severity])} aria-hidden />
        <div className="flex flex-1 flex-col gap-0.5">
          <p className={cn('mono-caption', SEVERITY_TINT[advice.severity])}>
            {t(`evaluation.strategy.severity.${advice.severity}`)}
          </p>
          <h3 className="font-heading text-[15.5px] font-semibold tracking-tight text-foreground">{advice.headline}</h3>
        </div>
      </header>
      <p className="text-[14px] leading-[1.55] text-foreground/75">{advice.rationale}</p>
      {isSoft && (
        <p className="mono-caption rounded-md bg-amber-500/10 px-2 py-1 text-amber-900 dark:text-amber-300">
          {t('evaluation.strategy.softSuggestion')}
        </p>
      )}
      <footer className="flex items-end justify-between gap-3 border-t border-foreground/10 pt-3">
        <p className="mono-caption text-foreground/55">
          {t('evaluation.strategy.citedPrefix')} {formatCitation(advice)}
        </p>
        {/* Spec §3.5: ≥ 0.8 CTA only when suggested_chat_prompt is non-null
            (pure-acknowledgment cards have no CTA). 0.5–0.8 force-shows the
            CTA so the user always has a path to Cik Lay for low-confidence
            advisories — `useChat.handoffFromAdvice` falls back to the
            headline when suggested_chat_prompt is null. */}
        {showCta && onAskCikLay && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAskCikLay(advice)}
            className="gap-1 text-[color:var(--primary)] hover:text-[color:var(--primary)]"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            {t('evaluation.strategy.askCikLay')}
          </Button>
        )}
      </footer>
    </article>
  )
}
