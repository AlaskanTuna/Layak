'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { CodeExecutionPanel } from '@/components/evaluation/code-execution-panel'
import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import { PacketDownload } from '@/components/evaluation/packet-download'
import { RankedList } from '@/components/evaluation/ranked-list'
import { Button } from '@/components/ui/button'

export function EvaluationResultsClient() {
  const router = useRouter()
  const { state, reset, setDemoMode } = useEvaluation()

  useEffect(() => {
    if (state.phase === 'idle') {
      router.replace('/dashboard/evaluation/upload')
    }
  }, [state.phase, router])

  function handleReset() {
    setDemoMode(false)
    reset()
    router.push('/dashboard/evaluation/upload')
  }

  if (state.phase !== 'done') {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <RankedList matches={state.matches} totalAnnualRm={state.upside?.total_annual_rm ?? null} />
      {state.upside && <CodeExecutionPanel upside={state.upside} />}
      <PacketDownload packet={state.packet} />
      <div className="flex">
        <Button type="button" variant="outline" onClick={handleReset}>
          Start another evaluation
        </Button>
      </div>
    </div>
  )
}
