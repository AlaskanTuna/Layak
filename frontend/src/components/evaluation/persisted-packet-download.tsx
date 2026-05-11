'use client'

import { useState } from 'react'
import { AlertTriangle, Download, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { notificationStore } from '@/lib/notification-store'
import { triggerDownload } from '@/lib/packet-download-utils'
import { authedFetch } from '@/lib/firebase'
import type { SchemeMatch } from '@/lib/agent-types'

type Props = {
  evalId: string
  matches: SchemeMatch[]
}

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

/**
 * Packet download for the persisted results route.
 *
 * Packet bytes are NEVER stored in Firestore. The backend regenerates the
 * three PDFs on demand and ships them as a ZIP via
 * `GET /api/evaluations/{id}/packet`. We just stream the response into a
 * download trigger.
 */
export function PersistedPacketDownload({ evalId, matches }: Props) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const qualifyingCount = matches.filter((m) => m.qualifies).length

  if (qualifyingCount === 0) return null

  async function handleDownload() {
    setBusy(true)
    setError(null)
    try {
      const res = await authedFetch(`${getBackendUrl()}/api/evaluations/${evalId}/packet`, {
        method: 'GET'
      })
      if (!res.ok) {
        throw new Error(t('evaluation.results.backendReturned', { status: res.status, statusText: res.statusText }))
      }
      const blob = await res.blob()
      triggerDownload(blob, `layak-packet-${evalId}.zip`)
      notificationStore.notify({
        title: t('common.notifications.events.packetDownloaded.title'),
        description: t('common.notifications.events.packetDownloaded.body'),
        severity: 'success',
        toast: true
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="paper-card rounded-[14px] p-5">
      <Button type="button" onClick={handleDownload} disabled={busy} size="lg" className="w-full sm:w-auto">
        {busy ? (
          <>
            <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
            {t('evaluation.packet.generatingZip')}
          </>
        ) : (
          <>
            <Download className="mr-1.5 size-4" aria-hidden />
            {t('evaluation.packet.downloadZip')}
          </>
        )}
      </Button>
      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      <p className="mt-4 border-t border-foreground/10 pt-3 text-xs leading-relaxed text-foreground/65">
        {t('evaluation.packet.description')}
      </p>
    </section>
  )
}
