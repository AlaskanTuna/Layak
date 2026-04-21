'use client'

import { Download, FileDown, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Packet, PacketDraft } from '@/lib/agent-types'
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
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2.5">
        <FileDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{draft.filename}</span>
          <span className="text-xs text-muted-foreground">{t('evaluation.packet.scheme', { id: draft.scheme_id })}</span>
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

  const anyDownloadable = packet.drafts.some(d => d.blob_bytes_b64 != null)
  const count = packet.drafts.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          {count === 1
            ? t('evaluation.packet.titleSingular', { count })
            : t('evaluation.packet.titlePlural', { count })}
        </CardTitle>
        <CardDescription>
          {t('evaluation.packet.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {packet.drafts.map(draft => (
          <DraftRow key={`${draft.scheme_id}-${draft.filename}`} draft={draft} />
        ))}
        {!anyDownloadable && (
          <p className="text-xs italic text-muted-foreground">
            {t('evaluation.packet.placeholderNotice')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
