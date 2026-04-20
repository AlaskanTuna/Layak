import { Footer } from '@/components/layout/footer'
import { MarketingHeader } from '@/components/layout/marketing-header'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="min-h-[calc(100svh-var(--topbar-height))] flex-1">{children}</main>
      <Footer />
    </div>
  )
}
