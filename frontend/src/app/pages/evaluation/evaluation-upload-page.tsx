import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { EvaluationUploadClient } from '@/components/evaluation/evaluation-upload-client'
import { PageHeading } from '@/components/layout/page-heading'

export function EvaluationUploadPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/evaluation"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to evaluations
      </Link>
      <PageHeading
        eyebrow="Step · Upload"
        title="Upload documents."
        description="Provide the documents below to verify your eligibility for the scheme corpus. Ensure all text is clear and readable — the agent will extract, classify, match, rank, and draft application packets."
      />
      <EvaluationUploadClient />
    </div>
  )
}
