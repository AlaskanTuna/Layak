'use client'

import { useState } from 'react'
import { AlertTriangle, Download, Loader2, ShieldCheck } from 'lucide-react'
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
      notificationStore.push(t('evaluation.packet.notificationTitle'), t('evaluation.packet.notificationBody'))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="paper-card flex flex-col gap-3 rounded-[14px] p-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <h2 className="font-heading text-base font-semibold leading-snug tracking-tight">
            {qualifyingCount === 1
              ? t('evaluation.packet.titleSchemeSingular', { count: qualifyingCount })
              : t('evaluation.packet.titleSchemePlural', { count: qualifyingCount })}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">{t('evaluation.packet.description')}</p>
      </div>
      <Button type="button" onClick={handleDownload} disabled={busy} size="lg">
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
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
    </section>
  )
}
