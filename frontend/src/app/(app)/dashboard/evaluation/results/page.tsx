import { EvaluationResultsClient } from '@/components/evaluation/evaluation-results-client'

export default function EvaluationResultsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Assessment complete</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Based on your documents, you qualify for multiple relief schemes.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Every number cites a source page; every packet is a DRAFT you submit yourself.
        </p>
      </header>
      <EvaluationResultsClient />
    </div>
  )
}
