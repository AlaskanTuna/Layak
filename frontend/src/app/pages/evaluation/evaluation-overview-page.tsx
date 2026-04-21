import { EvaluationOverviewClient } from '@/components/evaluation/evaluation-overview-client'
import { PageHeading } from '@/components/layout/page-heading'

export function EvaluationOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="My evaluations"
        title="Your eligibility at a glance."
        description="We process your documents and calculate eligibility across federal and state schemes based on your income profile and household status."
      />
      <EvaluationOverviewClient />
    </div>
  )
}
