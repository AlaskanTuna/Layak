'use client'

import { FileCheck, FileSearch, Sparkles, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Step = {
  id: 'extract' | 'match' | 'generate'
  icon: LucideIcon
}

const STEPS: readonly Step[] = [
  { id: 'extract', icon: FileSearch },
  { id: 'match', icon: Sparkles },
  { id: 'generate', icon: FileCheck }
]

/**
 * Three-step explainer rail mirrored after SolarSim's `/projects` "How it
 * works" pattern. Folds the five-step pipeline (extract → classify → match →
 * rank → generate) into three reader-friendly buckets for the history page.
 */
export function HowLayakEvaluatesRail() {
  const { t } = useTranslation()
  return (
    <aside className="paper-card relative isolate flex h-full flex-col gap-5 overflow-hidden rounded-[18px] p-5 sm:p-6">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70 sm:inset-y-6"
      />
      <div className="relative flex flex-col gap-1">
        <p className="mono-caption text-foreground/55">{t('evaluation.evaluatesRail.eyebrow')}</p>
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {t('evaluation.evaluatesRail.title')}
        </h2>
      </div>

      <ol className="relative flex flex-col gap-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          return (
            <li key={step.id} className="flex items-start gap-3">
              <div className="flex shrink-0 flex-col items-center gap-1">
                <span className="mono-caption text-foreground/45 tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex size-9 items-center justify-center rounded-md bg-[color:var(--hibiscus)]/10 text-[color:var(--hibiscus)]">
                  <Icon className="size-4" aria-hidden />
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1 pt-0.5">
                <p className="font-heading text-[15px] font-semibold tracking-tight">
                  {t(`evaluation.evaluatesRail.steps.${step.id}.title`)}
                </p>
                <p className="text-[13px] leading-relaxed text-foreground/65">
                  {t(`evaluation.evaluatesRail.steps.${step.id}.body`)}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
