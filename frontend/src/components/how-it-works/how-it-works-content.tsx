'use client'

import {
  AlertTriangle,
  BookOpen,
  Calculator,
  FileSearch,
  FileType,
  type LucideIcon,
  Network,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Timer
} from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

type PipelineStep = {
  step: string
  titleKey: string
  bodyKey: string
  icon: LucideIcon
  tools: string[]
}

// Tool names are brand / product names — intentionally left untranslated.
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

type StackTool = {
  name: string
  roleKey: string
  icon: LucideIcon
}

const STACK: StackTool[] = [
  { name: 'Gemini 2.5 Pro + Flash', roleKey: 'marketing.howItWorks.stackGeminiRole', icon: Sparkles },
  { name: 'Vertex AI Search', roleKey: 'marketing.howItWorks.stackVertexRole', icon: BookOpen },
  { name: 'Gemini Code Execution', roleKey: 'marketing.howItWorks.stackCodeExecRole', icon: Calculator },
  { name: 'WeasyPrint', roleKey: 'marketing.howItWorks.stackWeasyRole', icon: FileType }
]

function StatsRow() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        <span className="font-semibold text-foreground tabular-nums">{t('marketing.howItWorks.statsSteps')}</span>
        <span>{t('marketing.howItWorks.statsStepsLabel')}</span>
      </span>
      <span aria-hidden className="opacity-40">
        ·
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Timer className="size-3.5" aria-hidden />
        <span>{t('marketing.howItWorks.statsTiming')}</span>
      </span>
      <span aria-hidden className="opacity-40">
        ·
      </span>
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-primary" aria-hidden />
        <span>{t('marketing.howItWorks.statsDrafts')}</span>
      </span>
    </div>
  )
}

function PipelineTimeline() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.howItWorks.pipelineTitle')}</h2>
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {t('marketing.howItWorks.pipelineSubtitle')}
        </span>
      </div>
      <ol className="flex flex-col">
        {PIPELINE.map((step, index) => {
          const Icon = step.icon
          const isLast = index === PIPELINE.length - 1
          return (
            <li key={step.step} className="relative flex gap-5 pb-8 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[1.4375rem] top-14 bottom-0 w-px bg-border"
                />
              )}
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-card shadow-sm">
                <span className="font-heading text-base font-semibold tabular-nums text-primary">{step.step}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 pt-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-semibold tracking-tight">{t(step.titleKey)}</h3>
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(step.bodyKey)}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {step.tools.map(tool => (
                    <span
                      key={tool}
                      className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
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
    </section>
  )
}

function AgentStack() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('marketing.howItWorks.stackTitle')}</h2>
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {t('marketing.howItWorks.stackSubtitle')}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STACK.map(tool => {
          const Icon = tool.icon
          return (
            <li key={tool.name} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </div>
                <p className="font-heading text-sm font-semibold">{tool.name}</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{t(tool.roleKey)}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function FinePrint() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
        <h2 className="font-heading text-sm font-semibold tracking-tight">{t('marketing.howItWorks.finePrintTitle')}</h2>
      </div>
      <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
        <li className="flex gap-2">
          <span aria-hidden className="text-amber-600 dark:text-amber-400">
            ·
          </span>
          <span>
            <Trans i18nKey="marketing.howItWorks.finePrintDraft" components={{ strong: <strong /> }} />
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-amber-600 dark:text-amber-400">
            ·
          </span>
          <span>{t('marketing.howItWorks.finePrintEstimates')}</span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-amber-600 dark:text-amber-400">
            ·
          </span>
          <span>{t('marketing.howItWorks.finePrintIndependent')}</span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-amber-600 dark:text-amber-400">
            ·
          </span>
          <span>{t('marketing.howItWorks.finePrintCoverage')}</span>
        </li>
      </ul>
    </section>
  )
}

export function HowItWorksContent() {
  return (
    <div className="flex flex-col gap-8">
      <StatsRow />
      <PipelineTimeline />
      <AgentStack />
      <FinePrint />
    </div>
  )
}
