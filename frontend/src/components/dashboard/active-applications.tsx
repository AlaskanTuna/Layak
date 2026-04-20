import { FileCheck } from 'lucide-react'

export function ActiveApplications() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-xl font-semibold tracking-tight">Active Applications</h2>
        <span
          aria-disabled
          className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/60"
        >
          View all
        </span>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-10 text-center">
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FileCheck className="size-5" aria-hidden />
        </div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">None</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          Submitted applications will appear here with their disbursement status.
        </p>
      </div>
    </section>
  )
}
