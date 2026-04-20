'use client'

import Link from 'next/link'
import { ArrowRight, FileSearch } from 'lucide-react'

import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import { EvaluationUpsideHero } from '@/components/evaluation/evaluation-upside-hero'
import { SchemeListStacked } from '@/components/evaluation/scheme-list-stacked'
import { Button } from '@/components/ui/button'

export function EvaluationOverviewClient() {
  const { state } = useEvaluation()
  const done = state.phase === 'done'

  if (!done) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border bg-card/40 p-8 text-left">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileSearch className="size-5" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold tracking-tight">No evaluations yet.</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Start your first evaluation to see scheme matches and draft application packets. Upload your MyKad, a
            recent payslip, and a utility bill — the agent does the rest in about a minute.
          </p>
        </div>
        <Button render={<Link href="/dashboard/evaluation/upload" />} size="lg">
          Start evaluation
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
      </section>
    )
  }

  const qualifyingCount = state.matches.filter(m => m.qualifies).length
  const totalAnnualRm = state.upside?.total_annual_rm ?? 0

  return (
    <div className="flex flex-col gap-6">
      <EvaluationUpsideHero
        totalAnnualRm={totalAnnualRm}
        schemeCount={qualifyingCount}
        packet={state.packet}
      />
      <SchemeListStacked matches={state.matches} />
      <div className="flex">
        <Button render={<Link href="/dashboard/evaluation/results" />} variant="outline" size="sm">
          View detailed results
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
