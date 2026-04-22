'use client'

import { AlertTriangle, Calculator, FileSearch, FileType, type LucideIcon, Network, ScanSearch } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import Image from 'next/image'

type PipelineStep = {
  step: string
  titleKey: string
  bodyKey: string
  icon: LucideIcon
  tools: string[]
}

const PIPELINE: PipelineStep[] = [
  {
    step: '01',
    titleKey: 'marketing.features.step1.title',
    bodyKey: 'marketing.howItWorks.step1Body',
    icon: FileSearch,
    tools: ['Gemini 2.5 Flash', 'Vision OCR']
  },
  {
    step: '02',
    titleKey: 'marketing.features.step2.title',
    bodyKey: 'marketing.howItWorks.step2Body',
    icon: ScanSearch,
    tools: ['Python rules', 'Pydantic']
  },
  {
    step: '03',
    titleKey: 'marketing.features.step3.title',
    bodyKey: 'marketing.howItWorks.step3Body',
    icon: Network,
    tools: ['Vertex AI Search', 'Rule engine']
  },
  {
    step: '04',
    titleKey: 'marketing.features.step4.title',
    bodyKey: 'marketing.howItWorks.step4Body',
    icon: Calculator,
    tools: ['Gemini Code Execution', 'Python']
  },
  {
    step: '05',
    titleKey: 'marketing.features.step5.title',
    bodyKey: 'marketing.howItWorks.step5Body',
    icon: FileType,
    tools: ['WeasyPrint', 'Jinja2']
  }
]

function PipelineTimeline() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-8 md:flex-row relative">
      <div className="md:w-1/2 flex flex-col pt-8">
        <div className="mb-12">
          <h2 className="font-heading text-3xl font-semibold tracking-tight mb-3 capitalize">
            {t('marketing.howItWorks.pipelineTitle')}
          </h2>
          <span className="text-sm uppercase tracking-widest text-muted-foreground">
            {t('marketing.howItWorks.pipelineSubtitle')}
          </span>
        </div>
        <ol className="flex flex-col">
          {PIPELINE.map((step, index) => {
            const Icon = step.icon
            const isLast = index === PIPELINE.length - 1
            return (
              <li key={step.step} className="relative flex gap-6 pb-12 last:pb-8">
                {!isLast && (
                  <span aria-hidden className="absolute left-[1.625rem] top-[3.25rem] bottom-0 w-[2px] bg-border/60" />
                )}
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 bg-background shadow-md z-10">
                  <span className="font-heading text-lg font-bold tabular-nums text-primary">{step.step}</span>
                </div>
                <div className="flex flex-1 flex-col gap-3 pt-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-heading text-xl font-bold tracking-tight">{t(step.titleKey)}</h3>
                    <Icon className="size-5 text-muted-foreground" aria-hidden />
                  </div>
                  <p className="text-base font-medium leading-relaxed text-muted-foreground max-w-sm">
                    {t(step.bodyKey)}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {step.tools.map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Sticky visual section */}
      <div className="hidden md:block w-1/2 relative">
        <div className="sticky top-32 flex flex-col gap-6">
          <div className="relative aspect-[16/9] w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-border/50 bg-muted/20 shadow-xl">
            <Image
              src="/marketing/pipeline-visual.webp"
              alt="Pipeline visual"
              fill
              className="object-cover object-center transition-all duration-700"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-2xl" />
          </div>

          <div className="relative aspect-[16/9] w-full max-w-md mx-auto overflow-hidden rounded-2xl border border-border/50 bg-muted/20 shadow-xl opacity-90 hover:opacity-100 transition-opacity">
            <Image
              src="/marketing/family-support-scene.webp"
              alt="Family support scene"
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10 rounded-2xl" />
          </div>
        </div>
      </div>
    </section>
  )
}

function FinePrint() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col md:flex-row items-start gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 md:p-8">
      <div className="flex shrink-0 size-10 items-center justify-center rounded-full bg-amber-500/10">
        <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" aria-hidden />
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="font-sans text-base font-semibold tracking-tight capitalize">
          {t('marketing.howItWorks.finePrintTitle')}
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm leading-relaxed text-muted-foreground">
          <li className="flex gap-2">
            <span aria-hidden className="text-amber-600/50 dark:text-amber-400/50">
              ·
            </span>
            <span>
              <Trans
                i18nKey="marketing.howItWorks.finePrintDraft"
                components={{ strong: <strong className="font-semibold text-foreground" /> }}
              />
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-amber-600/50 dark:text-amber-400/50">
              ·
            </span>
            <span>{t('marketing.howItWorks.finePrintEstimates')}</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-amber-600/50 dark:text-amber-400/50">
              ·
            </span>
            <span>{t('marketing.howItWorks.finePrintIndependent')}</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-amber-600/50 dark:text-amber-400/50">
              ·
            </span>
            <span>{t('marketing.howItWorks.finePrintCoverage')}</span>
          </li>
        </ul>
      </div>
    </section>
  )
}

export function HowItWorksContent() {
  return (
    <div className="flex flex-col">
      <PipelineTimeline />
      <div className="mt-8">
        <FinePrint />
      </div>
    </div>
  )
}
