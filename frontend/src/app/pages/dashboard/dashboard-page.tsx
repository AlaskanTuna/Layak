import { ActiveApplications } from '@/components/dashboard/active-applications'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'
import { RecentActivity } from '@/components/dashboard/recent-activity'

export function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <DashboardHero />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_22rem]">
        <ActiveApplications />
        <RecentActivity />
      </div>
    </div>
  )
}