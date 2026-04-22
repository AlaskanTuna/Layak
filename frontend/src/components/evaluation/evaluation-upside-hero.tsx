'use client'

import Link from 'next/link'
import { ArrowRight, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const canDownloadAll = hasDownloadableDrafts(packet)
  const draftCount = packet?.drafts.length ?? 0

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {t('evaluation.upside.label')}
      </p>

      <div className="flex items-baseline gap-2 tabular-nums">
        <span className="font-heading text-3xl font-normal text-muted-foreground sm:text-4xl">{t('evaluation.upside.currency')}</span>
        <span className="font-heading text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          {empty ? '—' : formatRm(totalAnnualRm)}
        </span>
      </div>

      {empty ? (
        <>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {t('evaluation.upside.empty')}
          </p>
          <div className="flex">
            <Button render={<Link href="/dashboard/evaluation/upload" />} size="lg">
              {t('evaluation.upside.start')}
              <ArrowRight className="ml-1.5 size-4" aria-hidden />
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {t('evaluation.upside.description', {
              count: schemeCount,
              schemeLabel:
                schemeCount === 1 ? t('evaluation.upside.schemeSingular') : t('evaluation.upside.schemePlural')
            })}
          </p>
          {canDownloadAll && (
            <div className="flex">
              <Button type="button" size="lg" onClick={() => downloadAllDrafts(packet)}>
                <Download className="mr-1.5 size-4" aria-hidden />
                {draftCount > 0
                  ? t('evaluation.upside.downloadWithCount', { count: draftCount })
                  : t('evaluation.upside.download')}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
