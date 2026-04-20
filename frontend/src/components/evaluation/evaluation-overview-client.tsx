'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import { EvaluationUpsideHero } from '@/components/evaluation/evaluation-upside-hero'
import { SchemeListStacked } from '@/components/evaluation/scheme-list-stacked'
import { Button } from '@/components/ui/button'

export function EvaluationOverviewClient() {
  const { state } = useEvaluation()
  const done = state.phase === 'done'

  const qualifyingCount = state.matches.filter(m => m.qualifies).length
  const totalAnnualRm = state.upside?.total_annual_rm ?? 0

  return (
    <div className="flex flex-col gap-6">
      <EvaluationUpsideHero
        totalAnnualRm={totalAnnualRm}
        schemeCount={qualifyingCount}
        packet={state.packet}
        empty={!done}
      />
      <SchemeListStacked matches={state.matches} empty={!done} />
      {done && (
        <div className="flex">
          <Button render={<Link href="/dashboard/evaluation/results" />} variant="outline" size="sm">
            View detailed results
            <ArrowRight className="ml-1.5 size-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}
