import { HowItWorksContent } from '@/components/how-it-works/how-it-works-content'

export default function HowItWorksPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          The five-step pipeline behind every evaluation, plus the disclaimers you should know before you lodge a
          packet.
        </p>
      </header>
      <HowItWorksContent />
    </div>
  )
}
