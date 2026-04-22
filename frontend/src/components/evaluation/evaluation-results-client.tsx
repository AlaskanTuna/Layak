'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { CodeExecutionPanel } from '@/components/evaluation/code-execution-panel'
import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import { EvaluationUpsideHero } from '@/components/evaluation/evaluation-upside-hero'
import { PacketDownload } from '@/components/evaluation/packet-download'
import { RequiredContributionsCard } from '@/components/evaluation/required-contributions-card'
import { SchemeCardGrid } from '@/components/evaluation/scheme-card-grid'
import { Button } from '@/components/ui/button'

export function EvaluationResultsClient() {
  const router = useRouter()
  const { t } = useTranslation()
  const { state, reset, setDemoMode } = useEvaluation()

  useEffect(() => {
    if (state.phase === 'idle') {
      router.replace('/dashboard/evaluation/upload')
      return
    }
    // If we landed here directly (e.g. user visited /results without going
    // through upload first) but the pipeline is real / manual mode, hand
    // off to the persisted route.
    if (state.phase === 'done' && state.evalId) {
      router.replace(`/dashboard/evaluation/results/${state.evalId}`)
    }
  }, [state.phase, state.evalId, router])

  function handleReset() {
    setDemoMode(false)
    reset()
    router.push('/dashboard/evaluation/upload')
  }

  if (state.phase !== 'done') {
    return null
  }

  // The RM total still comes from upside-only math (`state.upside`), but the
  // supporting copy should reflect every matched scheme the user can review on
  // the results page, including required-contribution entries like SKSPS.
  const matchedCount = state.matches.filter(m => m.qualifies).length
  const totalAnnualRm = state.upside?.total_annual_rm ?? 0

  return (
    <div className="flex flex-col gap-6">
      <EvaluationUpsideHero
        totalAnnualRm={totalAnnualRm}
        matchedCount={matchedCount}
        packet={state.packet}
      />
      <SchemeCardGrid matches={state.matches} />
      <RequiredContributionsCard matches={state.matches} />
      {state.upside && <CodeExecutionPanel upside={state.upside} />}
      <PacketDownload packet={state.packet} />
      <div className="flex">
        <Button type="button" variant="outline" onClick={handleReset}>
          {t('evaluation.results.startAnother')}
        </Button>
      </div>
    </div>
  )
}
