import { HowItWorksContent } from '@/components/how-it-works/how-it-works-content'
import { PageHeading } from '@/components/layout/page-heading'

export function HowItWorksPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeading
        eyebrow="How it works"
        title="From three uploads to a ready-to-lodge packet, in about a minute."
        description="Layak is an agentic AI concierge. Five steps — extract, classify, match, compute, generate — stream live to your screen, each backed by a cited rule passage. The final packet is a draft you lodge yourself."
      />
      <HowItWorksContent />
    </div>
  )
}