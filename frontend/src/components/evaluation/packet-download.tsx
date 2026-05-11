'use client'

import { Download, FileDown, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { Packet, PacketDraft } from '@/lib/agent-types'
import { notificationStore } from '@/lib/notification-store'
import { base64ToBlob, triggerDownload } from '@/lib/packet-download-utils'

type Props = {
  packet: Packet | null
}

function DraftRow({ draft }: { draft: PacketDraft }) {
  const { t } = useTranslation()
  const canDownload = draft.blob_bytes_b64 != null

  function handleClick() {
    if (!draft.blob_bytes_b64) return
    const blob = base64ToBlob(draft.blob_bytes_b64)
    triggerDownload(blob, draft.filename)
    notificationStore.notify({
      title: t('common.notifications.events.packetDownloaded.title'),
      description: t('common.notifications.events.packetDownloaded.body'),
      severity: 'success',
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <FileDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{draft.filename}</span>
          <span className="text-xs text-muted-foreground">
            {t('evaluation.packet.scheme', { id: draft.scheme_id })}
          </span>
        </div>
      </div>
      <Button
        type="button"
        variant={canDownload ? 'default' : 'outline'}
        size="sm"
        disabled={!canDownload}
        onClick={handleClick}
        className="shrink-0"
      >
        <Download className="mr-1.5 size-3.5" aria-hidden />
        {canDownload ? t('evaluation.packet.download') : t('evaluation.packet.pending')}
      </Button>
    </div>
  )
}

export function PacketDownload({ packet }: Props) {
  const { t } = useTranslation()
  if (!packet || packet.drafts.length === 0) return null

  const anyDownloadable = packet.drafts.some((d) => d.blob_bytes_b64 != null)
  const count = packet.drafts.length

  return (
    <section className="paper-card flex flex-col gap-3 rounded-[14px] p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <h2 className="font-heading text-base font-semibold leading-snug tracking-tight">
            {count === 1
              ? t('evaluation.packet.titleSingular', { count })
              : t('evaluation.packet.titlePlural', { count })}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('evaluation.packet.description')}</p>
      </div>
      <div className="flex flex-col gap-2">
        {packet.drafts.map((draft) => (
          <DraftRow key={`${draft.scheme_id}-${draft.filename}`} draft={draft} />
        ))}
        {!anyDownloadable && (
          <p className="text-xs italic text-muted-foreground">{t('evaluation.packet.placeholderNotice')}</p>
        )}
      </div>
    </section>
  )
}
