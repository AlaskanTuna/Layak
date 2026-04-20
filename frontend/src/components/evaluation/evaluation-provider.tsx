'use client'

import { createContext, useCallback, useContext, useState } from 'react'

import { useAgentPipeline } from '@/hooks/use-agent-pipeline'

type PipelineApi = ReturnType<typeof useAgentPipeline>

type EvaluationContextValue = PipelineApi & {
  isDemoMode: boolean
  setDemoMode: (value: boolean) => void
}

const EvaluationContext = createContext<EvaluationContextValue | null>(null)

export function EvaluationProvider({ children }: { children: React.ReactNode }) {
  const pipeline = useAgentPipeline()
  const [isDemoMode, setIsDemoMode] = useState(false)
  const setDemoMode = useCallback((value: boolean) => setIsDemoMode(value), [])

  return (
    <EvaluationContext.Provider value={{ ...pipeline, isDemoMode, setDemoMode }}>{children}</EvaluationContext.Provider>
  )
}

export function useEvaluation(): EvaluationContextValue {
  const ctx = useContext(EvaluationContext)
  if (!ctx) throw new Error('useEvaluation must be used within <EvaluationProvider>')
  return ctx
}
