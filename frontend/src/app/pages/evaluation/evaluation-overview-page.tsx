import { EvaluationHistorySection } from '@/components/history/evaluation-history-section'
import { PageHeading } from '@/components/layout/page-heading'
import { QuotaMeter } from '@/components/dashboard/quota-meter'

export function EvaluationOverviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="My evaluations"
        title="Your eligibility at a glance."
        description="Lifetime relief identified across every run, plus a paginated history of past evaluations."
      >
        <div className="mt-2">
          <QuotaMeter />
        </div>
      </PageHeading>
      <EvaluationHistorySection />
    </div>
  )
}
