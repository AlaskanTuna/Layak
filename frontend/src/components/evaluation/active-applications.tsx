import Link from 'next/link'

import { StatusPill } from '@/components/ui/status-pill'

type Application = {
  id: string
  schemeName: string
  subtitle: string
  status: 'processing' | 'approved' | 'draft' | 'submitted' | 'rejected'
  statusLabel: string
  detailLabel: string
  detailValue: string
  progress?: number
}

const MOCK_APPLICATIONS: Application[] = [
  {
    id: 'str-2026-p2',
    schemeName: 'Sumbangan Tunai Rahmah (STR) 2026',
    subtitle: 'Phase 2 Disbursement',
    status: 'processing',
    statusLabel: 'Processing',
    detailLabel: 'Est. Deposit',
    detailValue: 'Late Nov',
    progress: 62
  },
  {
    id: 'emadani-claim',
    schemeName: 'e-Madani Claim',
    subtitle: 'Digital Wallet Credit',
    status: 'approved',
    statusLabel: 'Approved',
    detailLabel: 'Claimed',
    detailValue: '04 Dec 2025 · Credit Received'
  }
]

export function ActiveApplications() {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Active Applications</h2>
        <Link href="/dashboard/evaluation" className="text-xs text-primary underline-offset-2 hover:underline">
          View all
        </Link>
      </div>
      <ul className="flex flex-col gap-3">
        {MOCK_APPLICATIONS.map(app => (
          <li
            key={app.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col">
                <p className="font-heading text-sm font-semibold">{app.schemeName}</p>
                <p className="text-xs text-muted-foreground">{app.subtitle}</p>
              </div>
              <StatusPill tone={app.status} className="shrink-0">
                {app.statusLabel}
              </StatusPill>
            </div>
            {app.progress != null && (
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${app.progress}%` }} />
              </div>
            )}
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="text-foreground/70">{app.detailLabel}:</span> {app.detailValue}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
