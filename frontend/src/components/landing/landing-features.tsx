'use client'

import { BookOpen, FileSearch, Files, ListOrdered, Sigma, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Step = {
  icon: LucideIcon
  titleKey: string
  descriptionKey: string
}

const STEPS: Step[] = [
  { icon: FileSearch, titleKey: 'marketing.features.step1.title', descriptionKey: 'marketing.features.step1.description' },
  { icon: BookOpen, titleKey: 'marketing.features.step2.title', descriptionKey: 'marketing.features.step2.description' },
  { icon: ListOrdered, titleKey: 'marketing.features.step3.title', descriptionKey: 'marketing.features.step3.description' },
  { icon: Sigma, titleKey: 'marketing.features.step4.title', descriptionKey: 'marketing.features.step4.description' },
  { icon: Files, titleKey: 'marketing.features.step5.title', descriptionKey: 'marketing.features.step5.description' }
]

export function LandingFeatures() {
  const { t } = useTranslation()
  return (
    <section className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20 md:px-6">
        <div className="mb-10 flex flex-col gap-2">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('marketing.features.sectionTitle')}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            {t('marketing.features.sectionDescription')}
          </p>
        </div>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            return (
              <li
                key={step.titleKey}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <span className="text-xs text-muted-foreground">0{idx + 1}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-heading text-sm font-semibold">{t(step.titleKey)}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{t(step.descriptionKey)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
