'use client'

import Link from 'next/link'
import { ArrowRight, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Packet } from '@/lib/agent-types'
import { downloadAllDrafts, hasDownloadableDrafts } from '@/lib/packet-download-utils'

type Props = {
  totalAnnualRm: number
  schemeCount: number
  packet: Packet | null
  empty?: boolean
}

function formatRm(value: number): string {
  return value.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function EvaluationUpsideHero({ totalAnnualRm, schemeCount, packet, empty = false }: Props) {
  const canDownloadAll = hasDownloadableDrafts(packet)
  const draftCount = packet?.drafts.length ?? 0

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Total Potential Relief
      </p>

      <div className="flex items-baseline gap-2 tabular-nums">
        <span className="font-heading text-3xl font-normal text-muted-foreground sm:text-4xl">RM</span>
        <span className="font-heading text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          {empty ? '—' : formatRm(totalAnnualRm)}
        </span>
      </div>

      {empty ? (
        <>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Run your first evaluation to see your total potential annual relief across federal and state schemes.
          </p>
          <div className="flex">
            <Button render={<Link href="/dashboard/evaluation/upload" />} size="lg">
              Start evaluation
              <ArrowRight className="ml-1.5 size-4" aria-hidden />
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Across {schemeCount} {schemeCount === 1 ? 'scheme' : 'schemes'} and reliefs. Based on your income profile
            and household status.
          </p>
          <div className="flex">
            <Button
              type="button"
              size="lg"
              onClick={() => downloadAllDrafts(packet)}
              disabled={!canDownloadAll}
            >
              <Download className="mr-1.5 size-4" aria-hidden />
              {canDownloadAll ? `Download all drafts${draftCount > 0 ? ` (${draftCount})` : ''}` : 'Drafts pending'}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
