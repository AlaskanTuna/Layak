'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Calculator, FileSearch, FileText, Files, Network, ScanSearch, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Step = {
  id: string
  step: string
  title: string
  description: string
  highlights: string[]
  image: string
  alt: string
  icon: LucideIcon
}

const STEPS: Step[] = [
  {
    id: 'upload',
    step: '01',
    title: 'Upload the documents people already have',
    description:
      'Layak starts with a MyKad, an income proof, and a utility bill so the flow feels familiar, lightweight, and realistic for demo day.',
    highlights: ['MyKad', 'Payslip or income proof', 'Utility bill'],
    image: '/marketing/family-support-scene.webp',
    alt: 'Malaysian household gathering documents for Layak',
    icon: FileText
  },
  {
    id: 'extract',
    step: '02',
    title: 'Extract a structured profile from messy inputs',
    description:
      'The app reads the uploaded documents and turns them into the fields that matter for scheme qualification without making the user fill long forms first.',
    highlights: ['Identity details', 'Income details', 'Household context'],
    image: '/marketing/hero-civic-glow.webp',
    alt: 'Layak document understanding visual',
    icon: FileSearch
  },
  {
    id: 'classify',
    step: '03',
    title: 'Classify the household before matching anything',
    description:
      'Dependants, filer type, and per-capita income are derived up front, so the next decisions feel explainable instead of arbitrary.',
    highlights: ['Household size', 'Per-capita income', 'Children and elderly dependants'],
    image: '/marketing/pipeline-visual.webp',
    alt: 'Layak classification and matching pipeline visual',
    icon: ScanSearch
  },
  {
    id: 'match',
    step: '04',
    title: 'Match against schemes with visible reasoning',
    description:
      'Rather than showing a black-box result, Layak surfaces the schemes, the likely upside, and the rule passages that support each conclusion.',
    highlights: ['Source-cited matches', 'Visible thresholds', 'Ranked opportunity view'],
    image: '/marketing/pipeline-visual.webp',
    alt: 'Layak matching and ranking visual',
    icon: Network
  },
  {
    id: 'generate',
    step: '05',
    title: 'Generate draft packets people can actually act on',
    description:
      'The end state is not vague advice. It is a practical next step: clean draft packets the user can review and submit manually with confidence.',
    highlights: ['Computed upside', 'Draft-only PDFs', 'Manual submission preserved'],
    image: '/marketing/family-support-scene.webp',
    alt: 'Layak helping a family move toward application drafts',
    icon: Files
  }
]

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon
  const reverse = index % 2 === 1

  return (
    <article className="relative min-h-[78vh]">
      <div className="hero-sheen sticky top-24 grid gap-6 rounded-[1.9rem] p-5 sm:p-6 lg:grid-cols-[1.02fr_0.98fr] lg:p-8">
        <div className={cn('overflow-hidden rounded-[1.6rem] border border-border/70', reverse && 'lg:order-2')}>
          <div className="relative h-[20rem] sm:h-[26rem]">
            <Image src={step.image} alt={step.alt} fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/10" />
          </div>
        </div>

        <div className={cn('flex flex-col justify-center gap-5', reverse && 'lg:order-1')}>
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-border/80 bg-background/75 px-3 py-1.5 text-sm shadow-sm backdrop-blur">
            <span className="font-heading text-base font-semibold text-primary">{step.step}</span>
            <span className="text-muted-foreground">/ 05</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Sticky walkthrough</p>
          </div>

          <div className="space-y-3">
            <h3 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{step.title}</h3>
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">{step.description}</p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-3">
            {step.highlights.map(highlight => (
              <li key={highlight} className="rounded-2xl border border-border/70 bg-background/75 px-4 py-3 text-sm font-medium shadow-sm">
                {highlight}
              </li>
            ))}
          </ul>

          {step.id === 'generate' ? (
            <div className="flex">
              <Button render={<Link href="/sign-in" />} size="lg" className="rounded-full px-5">
                Try the demo
                <ArrowRight className="ml-1.5 size-4" aria-hidden />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function LandingStickyScroll() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10 md:px-6">
      <div className="section-shell px-6 py-8 sm:px-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-primary">
                <Calculator className="size-3.5" aria-hidden />
                Layak walkthrough
              </div>
              <div className="space-y-3">
                <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                  A sticky scroll that explains the product like a judge is watching.
                </h2>
                <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                  This keeps the cinematic feel you liked from the 21st Dev pattern, but rebuilt around Layak’s actual flow, tone, and trust model instead of a generic image gallery.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Docs in</p>
                  <p className="mt-2 font-heading text-lg font-semibold">3 familiar inputs</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Reasoning</p>
                  <p className="mt-2 font-heading text-lg font-semibold">5 visible stages</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Outcome</p>
                  <p className="mt-2 font-heading text-lg font-semibold">Draft packets, not black-box advice</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-10">
            {STEPS.map((step, index) => (
              <StepCard key={step.id} step={step} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
