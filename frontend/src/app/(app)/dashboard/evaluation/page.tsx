import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function EvaluationSummaryPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Evaluation</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Upload your MyKad, a recent payslip, and a utility bill. The agent extracts, classifies, matches, ranks, and
          drafts application packets. Every number cites a source page; every packet is a DRAFT you submit yourself.
        </p>
      </header>
      <div className="flex">
        <Button render={<Link href="/dashboard/evaluation/upload" />} size="lg">
          Start evaluation
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
