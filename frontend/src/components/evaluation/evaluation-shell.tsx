'use client'

import { DemoModeBanner } from '@/components/evaluation/demo-mode-banner'
import { useEvaluation } from '@/components/evaluation/evaluation-provider'

export function EvaluationShell({ children }: { children: React.ReactNode }) {
  const { isDemoMode } = useEvaluation()

  return (
    <div className="flex flex-col gap-4">
      {isDemoMode && <DemoModeBanner />}
      {children}
    </div>
  )
}
