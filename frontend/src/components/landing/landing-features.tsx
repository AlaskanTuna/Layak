import { BookOpen, FileSearch, Files, ListOrdered, Sigma } from 'lucide-react'

const STEPS = [
  {
    icon: FileSearch,
    title: 'Extract',
    description: 'Gemini Vision reads your three documents and pulls structured profile fields.'
  },
  {
    icon: BookOpen,
    title: 'Classify',
    description: 'Household size, per-capita income, filer category, dependants are derived.'
  },
  {
    icon: ListOrdered,
    title: 'Match',
    description: 'Rule engine checks every profile against scheme thresholds with full citations.'
  },
  {
    icon: Sigma,
    title: 'Compute',
    description: 'Gemini Code Execution sums annual upside across qualifying schemes on stage.'
  },
  {
    icon: Files,
    title: 'Generate',
    description: 'WeasyPrint drafts three watermarked PDF packets — ready to review and submit.'
  }
]

export function LandingFeatures() {
  return (
    <section className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20 md:px-6">
        <div className="mb-10 flex flex-col gap-2">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">How the agent works</h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Five steps. Every step streams to the UI in real time so you can see the reasoning as it happens.
          </p>
        </div>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            return (
              <li
                key={step.title}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <span className="text-xs text-muted-foreground">0{idx + 1}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-heading text-sm font-semibold">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
