'use client'

import Link from 'next/link'
import { ArrowRight, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { Packet } from '@/lib/agent-types'
import { downloadAllDrafts, hasDownloadableDrafts } from '@/lib/packet-download-utils'

type Props = {
  totalAnnualRm: number
  matchedCount: number
  packet: Packet | null
  empty?: boolean
}

function formatRm(value: number): string {
  return value.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function EvaluationUpsideHero({ totalAnnualRm, matchedCount, packet, empty = false }: Props) {
  const { t } = useTranslation()
  const canDownloadAll = hasDownloadableDrafts(packet)
  const draftCount = packet?.drafts.length ?? 0

  return (
    <section className="paper-card relative isolate flex flex-col gap-5 overflow-hidden rounded-[20px] p-6 sm:p-8">
      {/* Grid texture + hibiscus tab */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-6 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70 sm:inset-y-8"
      />
      <div className="relative flex flex-col gap-2">
        <p className="mono-caption text-[color:var(--hibiscus)]">{t('evaluation.upside.label')}</p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="display-numeral text-[64px] text-foreground sm:text-[80px] md:text-[96px]">
            {empty ? '—' : formatRm(totalAnnualRm)}
          </span>
          <span className="mono-caption text-foreground/55">{t('evaluation.upside.currency')}</span>
        </div>
      </div>

      {empty ? (
        <>
          <p className="relative max-w-md text-[14.5px] leading-[1.6] text-foreground/68">
            {t('evaluation.upside.empty')}
          </p>
          <div className="relative flex">
            <Button
              render={<Link href="/dashboard/evaluation/upload" />}
              size="lg"
              className="rounded-full bg-[color:var(--hibiscus)]/92 px-6 text-[color:var(--hibiscus-foreground)] backdrop-blur-md hover:bg-[color:var(--hibiscus)]"
            >
              {t('evaluation.upside.start')}
              <ArrowRight className="ml-1.5 size-4" aria-hidden />
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="relative max-w-md text-[14.5px] leading-[1.6] text-foreground/68">
            {t('evaluation.upside.description', { count: matchedCount })}
          </p>
          {canDownloadAll && (
            <div className="relative flex">
              <Button
                type="button"
                size="lg"
                onClick={() => downloadAllDrafts(packet)}
                className="rounded-full bg-[color:var(--hibiscus)]/92 px-6 text-[color:var(--hibiscus-foreground)] backdrop-blur-md hover:bg-[color:var(--hibiscus)]"
              >
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
