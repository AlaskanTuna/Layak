import { DashboardDataSection } from '@/components/dashboard/dashboard-data-section'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <DashboardHero />
      <DashboardDataSection />
    </div>
  )
}
