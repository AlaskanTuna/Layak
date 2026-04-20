'use client'

import { Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Packet } from '@/lib/agent-types'
import { downloadAllDrafts, hasDownloadableDrafts } from '@/lib/packet-download-utils'

type Props = {
  totalAnnualRm: number
  schemeCount: number
  packet: Packet | null
}

function formatRm(value: number): string {
  return value.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function EvaluationUpsideHero({ totalAnnualRm, schemeCount, packet }: Props) {
  const canDownloadAll = hasDownloadableDrafts(packet)
  const draftCount = packet?.drafts.length ?? 0

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-primary/20 bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-8">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Total Potential Relief
        </p>
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-2xl font-normal text-muted-foreground sm:text-3xl">RM</span>
          <span className="font-heading text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            {formatRm(totalAnnualRm)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {schemeCount} {schemeCount === 1 ? 'application' : 'applications'} ready to submit.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        onClick={() => downloadAllDrafts(packet)}
        disabled={!canDownloadAll}
        className="shrink-0"
      >
        <Download className="mr-1.5 size-4" aria-hidden />
        {canDownloadAll ? `Download all drafts${draftCount > 0 ? ` (${draftCount})` : ''}` : 'Drafts pending'}
      </Button>
    </section>
  )
}
