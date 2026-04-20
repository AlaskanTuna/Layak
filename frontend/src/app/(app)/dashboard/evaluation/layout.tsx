import { EvaluationProvider } from '@/components/evaluation/evaluation-provider'
import { EvaluationShell } from '@/components/evaluation/evaluation-shell'

export default function EvaluationLayout({ children }: { children: React.ReactNode }) {
  return (
    <EvaluationProvider>
      <EvaluationShell>{children}</EvaluationShell>
    </EvaluationProvider>
  )
}
