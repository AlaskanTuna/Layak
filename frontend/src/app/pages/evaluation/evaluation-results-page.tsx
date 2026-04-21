import { EvaluationResultsClient } from '@/components/evaluation/evaluation-results-client'
import { PageHeading } from '@/components/layout/page-heading'

export function EvaluationResultsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Assessment complete"
        title="Based on your documents, you qualify for multiple relief schemes."
        description="Every number cites a source page; every packet is a DRAFT you submit yourself."
      />
      <EvaluationResultsClient />
    </div>
  )
}
