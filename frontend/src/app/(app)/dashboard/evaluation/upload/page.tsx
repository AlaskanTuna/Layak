import { EvaluationUploadClient } from '@/components/evaluation/evaluation-upload-client'

export default function EvaluationUploadPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Step · Upload</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Upload documents</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Provide your MyKad, a recent payslip, and a utility bill. Ensure all text is clear and readable. The agent
          will extract, classify, match, rank, and draft application packets.
        </p>
      </header>
      <EvaluationUploadClient />
    </div>
  )
}
