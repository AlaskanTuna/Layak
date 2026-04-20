import { EvaluationClient } from '@/components/evaluation/evaluation-client'

export default function EvaluationPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Evaluation</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Upload your MyKad, a recent payslip, and a utility bill. The agent extracts, classifies, matches, ranks, and
          drafts application packets. Every number cites a source page; every packet is a DRAFT you submit yourself.
        </p>
      </header>
      <EvaluationClient />
    </div>
  )
}
