import { EvaluationResultsByIdClient } from '@/components/evaluation/evaluation-results-by-id-client'
import { EvaluationResultsByIdHeading } from '@/components/evaluation/evaluation-results-by-id-heading'

type RouteParams = Promise<{ id: string }>

/**
 * Dynamic results route. Hydrates from `GET /api/evaluations/{id}` first;
 * polls every 2 s while `status === "running"` to surface in-flight
 * progress on a refresh.
 *
 * Next.js 16: dynamic params in app router are passed as a Promise.
 */
export async function EvaluationResultsByIdPage({ params }: { params: RouteParams }) {
  const { id } = await params
  return (
    <div className="flex flex-col gap-6">
      <EvaluationResultsByIdHeading />
      <EvaluationResultsByIdClient evalId={id} />
    </div>
  )
}
