'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChevronDown, Download, FileText, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { authedFetch } from '@/lib/firebase'
import { notificationStore } from '@/lib/notification-store'
import { triggerDownload } from '@/lib/packet-download-utils'
import type { SchemeMatch } from '@/lib/agent-types'
import { localisedSchemeName } from '@/lib/scheme-name'

type Props = {
  evalId: string
  matches: SchemeMatch[]
}

type DraftState = {
  blobUrl: string | null
  pdfBlob: Blob | null
  loading: boolean
  error: string | null
}

const EMPTY_STATE: DraftState = { blobUrl: null, pdfBlob: null, loading: false, error: null }

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

/**
 * Inline PDF preview + bundled ZIP download for the persisted results page.
 *
 * One expandable row per qualifying scheme. Each row lazily fetches the
 * regenerated PDF via `GET /api/evaluations/{id}/packet/{scheme_id}` on
 * first expand, wraps the bytes in a blob URL, and hands it to a sandboxed
 * iframe. Blob URLs stay cached for the component lifetime so collapsing +
 * re-expanding is instant, and all are revoked on unmount.
 *
 * The card's footer carries the bulk action — "Download all drafts as ZIP"
 * — which hits `GET /api/evaluations/{id}/packet` for the regenerated
 * archive. Previously this sat in a separate "Draft Application Packet"
 * section/card below, but the two surfaces overlapped semantically and
 * read as redundant; bundling them keeps the user in one place.
 */
export function DraftPacketPreview({ evalId, matches }: Props) {
  const { t } = useTranslation()
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})
  const [openSchemeId, setOpenSchemeId] = useState<string | null>(null)
  const [zipBusy, setZipBusy] = useState(false)
  const [zipError, setZipError] = useState<string | null>(null)
  const blobUrlsRef = useRef<string[]>([])

  // Backend `_TEMPLATE_MAP` in `agents/tools/generate_packet.py` only renders
  // packets for these scheme_ids. Other qualifying schemes (BAP, BUDI95,
  // i-Suri, KWAPM, etc.) are advisory-only — eligibility cards display but no
  // separate Borang exists. Filtering here matches the backend so the preview
  // never tries to fetch a non-existent template (else: HTTP 404).
  const SCHEMES_WITH_PACKET_TEMPLATES = new Set([
    'str_2026',
    'jkm_warga_emas',
    'jkm_bkk',
    'lhdn_form_b',
    'lhdn_form_be',
    'perkeso_sksps',
    'i_saraan'
  ])
  const qualifying = matches.filter(
    (m) => m.qualifies && m.kind !== 'subsidy_credit' && SCHEMES_WITH_PACKET_TEMPLATES.has(m.scheme_id)
  )

  useEffect(() => {
    const ref = blobUrlsRef
    return () => {
      ref.current.forEach((url) => URL.revokeObjectURL(url))
      ref.current = []
    }
  }, [])

  const fetchDraft = useCallback(
    async (schemeId: string) => {
      setDrafts((prev) => ({
        ...prev,
        [schemeId]: { ...EMPTY_STATE, loading: true }
      }))
      try {
        const res = await authedFetch(`${getBackendUrl()}/api/evaluations/${evalId}/packet/${schemeId}`, {
          method: 'GET'
        })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`)
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        blobUrlsRef.current.push(url)
        setDrafts((prev) => ({
          ...prev,
          [schemeId]: { blobUrl: url, pdfBlob: blob, loading: false, error: null }
        }))
      } catch (err) {
        setDrafts((prev) => ({
          ...prev,
          [schemeId]: {
            ...EMPTY_STATE,
            error: err instanceof Error ? err.message : String(err)
          }
        }))
      }
    },
    [evalId]
  )

  const handleToggle = useCallback(
    (schemeId: string) => {
      const willOpen = openSchemeId !== schemeId
      setOpenSchemeId(willOpen ? schemeId : null)
      if (willOpen && !drafts[schemeId]?.blobUrl && !drafts[schemeId]?.loading) {
        void fetchDraft(schemeId)
      }
    },
    [openSchemeId, drafts, fetchDraft]
  )

  const handleDownloadOne = useCallback(
    (schemeId: string, filename: string) => {
      const state = drafts[schemeId]
      if (!state?.pdfBlob) return
      triggerDownload(state.pdfBlob, filename)
    },
    [drafts]
  )

  const handleDownloadZip = useCallback(async () => {
    setZipBusy(true)
    setZipError(null)
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
      setZipError(err instanceof Error ? err.message : String(err))
    } finally {
      setZipBusy(false)
    }
  }, [evalId, t])

  if (qualifying.length === 0) return null

  return (
    <section className="paper-card rounded-[14px] p-5">
      <div className="flex flex-col gap-2">
        {qualifying.map((match) => {
          const isOpen = openSchemeId === match.scheme_id
          const draft = drafts[match.scheme_id] ?? EMPTY_STATE
          const filename = `${match.scheme_id}-${evalId.slice(0, 6)}.pdf`
          return (
            <div
              key={match.scheme_id}
              className="overflow-hidden rounded-[10px] border border-foreground/10 bg-foreground/[0.02]"
            >
              <button
                type="button"
                onClick={() => handleToggle(match.scheme_id)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.04]"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <FileText className="size-4 shrink-0 text-[color:var(--hibiscus)]/80" aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {localisedSchemeName(t, match.scheme_id, match.scheme_name)}
                    </span>
                    <span className="mono-caption mt-0.5 text-foreground/55">{match.agency}</span>
                  </span>
                </span>
                <span className="draft-stamp hidden text-[8.5px] sm:inline-flex">DRAFT</span>
                <ChevronDown
                  className={`size-4 shrink-0 text-foreground/45 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {isOpen && (
                <div className="border-t border-foreground/10 bg-foreground/[0.025] p-3">
                  {draft.loading && (
                    <div className="flex items-center gap-2 px-1 py-8 mono-caption text-foreground/55">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      {t('evaluation.preview.loading')}
                    </div>
                  )}
                  {draft.error && (
                    <div className="flex items-start gap-2 rounded-md border border-[color:var(--hibiscus)]/35 bg-[color:var(--hibiscus)]/[0.06] p-3 text-xs text-[color:var(--hibiscus)]">
                      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                      <span className="flex flex-col gap-2">
                        <span>{t('evaluation.preview.error', { message: draft.error })}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="self-start"
                          onClick={() => void fetchDraft(match.scheme_id)}
                        >
                          {t('common.button.retry')}
                        </Button>
                      </span>
                    </div>
                  )}
                  {draft.blobUrl && (
                    <div className="flex flex-col gap-2">
                      <iframe
                        src={draft.blobUrl}
                        title={t('evaluation.preview.iframeTitle', {
                          name: localisedSchemeName(t, match.scheme_id, match.scheme_name)
                        })}
                        className="h-[480px] w-full rounded-md border border-foreground/10 bg-background"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => handleDownloadOne(match.scheme_id, filename)}
                        >
                          <Download className="size-3.5" aria-hidden />
                          {t('evaluation.preview.downloadOne')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div id="download" className="mt-4 flex scroll-mt-28 flex-col gap-3 lg:scroll-mt-20">
        <Button type="button" onClick={handleDownloadZip} disabled={zipBusy} size="lg" className="w-full sm:w-auto">
          {zipBusy ? (
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
        {zipError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            <span>{zipError}</span>
          </div>
        )}
      </div>
      <p className="mt-4 border-t border-foreground/10 pt-3 text-xs leading-relaxed text-foreground/65">
        {t('evaluation.preview.description')}
      </p>
    </section>
  )
}
