import { PageHeading } from '@/components/layout/page-heading'
import { SchemesOverview } from '@/components/schemes/schemes-overview'

export function SchemesPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeading
        eyebrow="Scheme library"
        title="Every Malaysian scheme Layak reasons over."
        description="Three federal schemes are live in this build. Five more land in v2 as we wire each one's rules, thresholds, and application form into the engine."
      />
      <SchemesOverview />
    </div>
  )
}