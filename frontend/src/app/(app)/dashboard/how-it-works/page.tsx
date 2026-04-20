import { HowItWorksContent } from '@/components/how-it-works/how-it-works-content'

export default function HowItWorksPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">How it works</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          From three uploads to a ready-to-lodge packet, in about a minute.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Layak is an agentic AI concierge. Five steps — extract, classify, match, compute, generate — stream live to
          your screen, each backed by a cited rule passage. The final packet is a draft you lodge yourself.
        </p>
      </header>
      <HowItWorksContent />
    </div>
  )
}
