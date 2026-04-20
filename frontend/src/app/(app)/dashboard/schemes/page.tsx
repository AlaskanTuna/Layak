import { SchemesOverview } from '@/components/schemes/schemes-overview'

export default function SchemesPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">Scheme library</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Every Malaysian scheme Layak reasons over.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Three federal schemes are live in this build. Five more land in v2 as we wire each one&rsquo;s rules,
          thresholds, and application form into the engine.
        </p>
      </header>
      <SchemesOverview />
    </div>
  )
}
