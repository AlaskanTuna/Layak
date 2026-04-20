import { Clock } from 'lucide-react'

export function RecentActivity() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-tight">Recent Activity</h2>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-10 text-center">
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Clock className="size-5" aria-hidden />
        </div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">None</p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          Uploads, evaluations, and submissions will stream here as they happen.
        </p>
      </div>
    </section>
  )
}
