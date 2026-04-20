import { ActiveApplications } from '@/components/evaluation/active-applications'
import { EvaluationHeroCard } from '@/components/evaluation/evaluation-hero-card'
import { RecentActivity } from '@/components/evaluation/recent-activity'
import { PERSISTENCE_ENABLED } from '@/lib/feature-flags'

export default function EvaluationSummaryPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <EvaluationHeroCard name={PERSISTENCE_ENABLED ? 'Aisyah' : undefined} />
      {PERSISTENCE_ENABLED && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
          <ActiveApplications />
          <RecentActivity />
        </div>
      )}
    </div>
  )
}
