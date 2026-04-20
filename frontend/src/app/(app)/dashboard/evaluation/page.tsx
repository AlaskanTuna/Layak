import { EvaluationOverviewClient } from '@/components/evaluation/evaluation-overview-client'

export default function EvaluationOverviewPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">My Evaluations</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          We&rsquo;ve processed your documents and calculated your eligibility across federal and state schemes based
          on your income profile and household status.
        </p>
      </header>
      <EvaluationOverviewClient />
    </div>
  )
}
