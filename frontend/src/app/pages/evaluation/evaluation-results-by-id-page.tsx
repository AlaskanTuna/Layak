import { EvaluationResultsByIdClient } from '@/components/evaluation/evaluation-results-by-id-client'
import { PageHeading } from '@/components/layout/page-heading'

type RouteParams = Promise<{ id: string }>

/**
 * Phase 3 Task 3 — dynamic results route. Hydrates from
 * `GET /api/evaluations/{id}` first; polls every 2 s while
 * `status === "running"` to surface in-flight progress on a refresh.
 *
 * Next.js 16: dynamic params in app router are passed as a Promise.
 */
export async function EvaluationResultsByIdPage({ params }: { params: RouteParams }) {
  const { id } = await params
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Evaluation"
        title="Your eligibility results."
        description="Hydrated from your saved evaluation. Numbers cite the rule and source page; every packet is a DRAFT you submit yourself."
      />
      <EvaluationResultsByIdClient evalId={id} />
    </div>
  )
}
