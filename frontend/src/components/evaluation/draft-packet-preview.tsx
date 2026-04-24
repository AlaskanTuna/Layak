'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ChevronDown, Download, Eye, FileText, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authedFetch } from '@/lib/firebase'
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
 * Inline PDF preview for the persisted results page.
 *
 * Renders one expandable row per qualifying scheme. Each row lazily fetches
 * the regenerated PDF via `GET /api/evaluations/{id}/packet/{scheme_id}` on
 * first expand, wraps the bytes in a blob URL, and hands it to a sandboxed
 * iframe. The blob URL stays cached for the component lifetime so collapsing
 * + re-expanding the same row is instant; all blob URLs are revoked on
 * unmount to keep memory bounded.
 *
 * The download CTA on each row pipes the same blob through the existing
 * `triggerDownload` helper — no second network round-trip needed once the
 * preview has loaded.
 *
 * Sits ABOVE the existing ZIP download CTA. The two are additive — preview
 * is for trust ("can I see what Layak drafted before downloading?"); the ZIP
 * is for keeping a copy.
 */
export function DraftPacketPreview({ evalId, matches }: Props) {
  const { t } = useTranslation()
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({})
  const [openSchemeId, setOpenSchemeId] = useState<string | null>(null)
  const blobUrlsRef = useRef<string[]>([])

  const qualifying = matches.filter(m => m.qualifies && (m.kind ?? 'upside') === 'upside')

  useEffect(() => {
    const ref = blobUrlsRef
    return () => {
      ref.current.forEach(url => URL.revokeObjectURL(url))
      ref.current = []
    }
  }, [])

  const fetchDraft = useCallback(
    async (schemeId: string) => {
      setDrafts(prev => ({
        ...prev,
        [schemeId]: { ...EMPTY_STATE, loading: true }
      }))
      try {
        const res = await authedFetch(
          `${getBackendUrl()}/api/evaluations/${evalId}/packet/${schemeId}`,
          { method: 'GET' }
        )
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`)
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        blobUrlsRef.current.push(url)
        setDrafts(prev => ({
          ...prev,
          [schemeId]: { blobUrl: url, pdfBlob: blob, loading: false, error: null }
        }))
      } catch (err) {
        setDrafts(prev => ({
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

  if (qualifying.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="size-4 text-primary" aria-hidden />
          {t('evaluation.preview.title', { count: qualifying.length })}
        </CardTitle>
        <CardDescription>{t('evaluation.preview.description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {qualifying.map(match => {
          const isOpen = openSchemeId === match.scheme_id
          const draft = drafts[match.scheme_id] ?? EMPTY_STATE
          const filename = `${match.scheme_id}-${evalId.slice(0, 6)}.pdf`
          return (
            <div
              key={match.scheme_id}
              className="overflow-hidden rounded-lg border border-border bg-card"
            >
              <button
                type="button"
                onClick={() => handleToggle(match.scheme_id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2.5">
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {localisedSchemeName(t, match.scheme_id, match.scheme_name)}
                    </span>
                    <span className="text-xs text-muted-foreground">{match.agency}</span>
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>

              {isOpen && (
                <div className="border-t border-border bg-muted/20 p-3">
                  {draft.loading && (
                    <div className="flex items-center gap-2 px-1 py-8 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      {t('evaluation.preview.loading')}
                    </div>
                  )}
                  {draft.error && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
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
                        className="h-[480px] w-full rounded-md border border-border bg-background"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
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
      </CardContent>
    </Card>
  )
}
