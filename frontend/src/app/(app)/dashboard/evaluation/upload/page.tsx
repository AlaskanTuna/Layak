import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { EvaluationUploadClient } from '@/components/evaluation/evaluation-upload-client'

export default function EvaluationUploadPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard/evaluation"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to evaluations
      </Link>
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Step · Upload</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Upload documents</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Provide the documents below to verify your eligibility for the scheme corpus. Ensure all text is clear and
          readable — the agent will extract, classify, match, rank, and draft application packets.
        </p>
      </header>
      <EvaluationUploadClient />
    </div>
  )
}
