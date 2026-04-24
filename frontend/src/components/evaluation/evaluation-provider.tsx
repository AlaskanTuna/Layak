'use client'

import { createContext, useCallback, useContext, useState } from 'react'

import { useAgentPipeline } from '@/hooks/use-agent-pipeline'

type PipelineApi = ReturnType<typeof useAgentPipeline>

// Demo mode carries a persona id so DemoModeBanner can render the right
// copy ("gig driver Aisyah" vs "salaried teacher Farhan"). `null` means
// demo mode is off. Callers that don't care about the persona can still
// call `setDemoMode(false)` to disable; `isDemoMode` stays as the boolean
// derivation for call sites that only need on/off.
export type DemoPersona = 'aisyah' | 'farhan'

type EvaluationContextValue = PipelineApi & {
  isDemoMode: boolean
  demoPersona: DemoPersona | null
  setDemoMode: (value: DemoPersona | false) => void
}

const EvaluationContext = createContext<EvaluationContextValue | null>(null)

export function EvaluationProvider({ children }: { children: React.ReactNode }) {
  const pipeline = useAgentPipeline()
  const [demoPersona, setDemoPersona] = useState<DemoPersona | null>(null)
  const setDemoMode = useCallback((value: DemoPersona | false) => setDemoPersona(value === false ? null : value), [])

  return (
    <EvaluationContext.Provider value={{ ...pipeline, isDemoMode: demoPersona !== null, demoPersona, setDemoMode }}>
      {children}
    </EvaluationContext.Provider>
  )
}

export function useEvaluation(): EvaluationContextValue {
  const ctx = useContext(EvaluationContext)
  if (!ctx) throw new Error('useEvaluation must be used within <EvaluationProvider>')
  return ctx
}
