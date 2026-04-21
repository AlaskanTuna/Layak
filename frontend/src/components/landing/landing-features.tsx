'use client'

import Image from 'next/image'
import { BadgeCheck, BookOpen, FileSearch, Files, ListOrdered, Sigma, type LucideIcon } from 'lucide-react'
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
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10 md:px-6">
      <div className="section-shell px-6 py-8 sm:px-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70">
            <Image
              src="/marketing/pipeline-visual.webp"
              alt="Layak AI pipeline illustration"
              width={1536}
              height={1024}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/88 via-background/30 to-transparent p-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/78 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
                <BadgeCheck className="size-3.5 text-primary" aria-hidden />
                Transparent pipeline
              </div>
            </div>
          </div>

          <div>
            <div className="mb-8 flex flex-col gap-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-primary">Built to be legible, not magical</p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                {t('marketing.features.sectionTitle')}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                {t('marketing.features.sectionDescription')}
              </p>
            </div>
            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {STEPS.map((step, idx) => {
                const Icon = step.icon
                return (
                  <li
                    key={step.titleKey}
                    className="rounded-2xl border border-border/80 bg-background/75 p-5 shadow-sm backdrop-blur"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="size-4" aria-hidden />
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        0{idx + 1}
                      </span>
                    </div>
                    <h3 className="font-heading text-base font-semibold">{t(step.titleKey)}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(step.descriptionKey)}</p>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
