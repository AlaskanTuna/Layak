import { GreetingCard } from '@/components/dashboard/greeting-card'
import { QuickAccessCards } from '@/components/dashboard/quick-access-cards'

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <GreetingCard />
      <QuickAccessCards />
    </div>
  )
}
