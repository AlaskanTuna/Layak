'use client'

import { useState } from 'react'
import { AlertTriangle, Download, Loader2, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
 * Phase 3 Task 3 — packet download for the persisted results route.
 *
 * Packet bytes are NEVER stored in Firestore (spec §3.7). The backend
 * regenerates the three PDFs on demand and ships them as a ZIP via
 * `GET /api/evaluations/{id}/packet`. We just stream the response into
 * a download trigger.
 */
export function PersistedPacketDownload({ evalId, matches }: Props) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const qualifyingCount = matches.filter(m => m.qualifies).length

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
      notificationStore.push(
        t('evaluation.packet.notificationTitle'),
        t('evaluation.packet.notificationBody')
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-sans text-sm">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          {qualifyingCount === 1
            ? t('evaluation.packet.titleSchemeSingular', { count: qualifyingCount })
            : t('evaluation.packet.titleSchemePlural', { count: qualifyingCount })}
        </CardTitle>
        <CardDescription>
          {t('evaluation.packet.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
      </CardContent>
    </Card>
  )
}
