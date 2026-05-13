'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, Check, Copy, Download, Loader2, Quote, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CandidateStatusPill } from '@/components/admin/status-pill-status'
import { ConfidenceMeter } from '@/components/admin/confidence-meter'
import { UnifiedDiff } from '@/components/admin/unified-diff'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { approveCandidate, rejectCandidate, requestChangesCandidate, type CandidateDetail } from '@/lib/admin-discovery'
import { notificationStore } from '@/lib/notification-store'

type ExistingRule = {
  name: string
  agency: string
  eligibility_summary: string
  rate_summary: string
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return ''
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  const months = Math.floor(days / 30)
  return `${months} mo ago`
}

export function CandidateDetailCard({
  detail,
  existingRule
}: {
  detail: CandidateDetail
  existingRule: ExistingRule | null
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'approve' | 'reject' | 'changes' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState(detail.status)
  const [manifestYaml, setManifestYaml] = useState<string | null>(null)

  const candidate = detail.candidate
  const matched = Boolean(candidate.scheme_id)
  const relative = formatRelative(candidate.extracted_at)
  const metaLine = matched
    ? t('admin.discovery.detail.metaLine', {
        agency: candidate.agency,
        scheme: candidate.scheme_id,
        extracted: relative
      })
    : t('admin.discovery.detail.metaLineUnmatched', {
        agency: candidate.agency,
        extracted: relative
      })

  async function run(action: 'approve' | 'reject' | 'changes') {
    setBusy(action)
    setError(null)
    try {
      const fn =
        action === 'approve' ? approveCandidate : action === 'reject' ? rejectCandidate : requestChangesCandidate
      const res = await fn(candidate.candidate_id, note || undefined)
      setStatus(res.status)
      if (res.manifest_yaml) {
        setManifestYaml(res.manifest_yaml)
      }
      const notifyKey = action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'changes'
      const severity = action === 'approve' ? 'success' : action === 'reject' ? 'error' : 'info'
      notificationStore.notify({
        title: t(`admin.discovery.notify.${notifyKey}.title`),
        description: t(`admin.discovery.notify.${notifyKey}.body`, { name: candidate.name }),
        severity,
        toast: true
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  function downloadManifest() {
    if (!manifestYaml) return
    const filename = `${candidate.scheme_id || candidate.candidate_id.slice(0, 8)}-manifest.yaml`
    const blob = new Blob([manifestYaml], { type: 'text/yaml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(candidate.source_content_hash)
      notificationStore.notify({
        title: t('admin.discovery.detail.copyHashSuccess'),
        description: candidate.source_content_hash.slice(0, 16) + '…',
        severity: 'info',
        toast: true,
        groupKey: 'discovery-copy-hash'
      })
    } catch {
      /* clipboard denied — silent fail */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="paper-card flex flex-wrap items-start justify-between gap-4 rounded-[16px] p-6">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="mono-caption text-foreground/55">
            {matched ? t('admin.discovery.detail.headingMatched') : t('admin.discovery.detail.headingNew')}
          </p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">{candidate.name}</h2>
          <p className="mono-caption text-foreground/55">{metaLine}</p>
        </div>
        <CandidateStatusPill status={status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <SectionBlock label={t('admin.discovery.detail.fields.eligibilitySummary')}>
            <p className="whitespace-pre-wrap text-sm leading-[1.65] text-foreground/85">
              {candidate.eligibility_summary}
            </p>
          </SectionBlock>

          <SectionBlock label={t('admin.discovery.detail.fields.rateSummary')}>
            <p className="whitespace-pre-wrap text-sm leading-[1.65] text-foreground/85">{candidate.rate_summary}</p>
          </SectionBlock>

          <SectionBlock label={t('admin.discovery.detail.fields.citation')}>
            <blockquote className="relative rounded-[10px] border-l-[3px] border-[color:var(--hibiscus)]/70 bg-card/40 pl-4 pr-3 py-3 font-mono text-[13px] leading-[1.6] text-foreground/85">
              <Quote className="absolute right-3 top-3 size-3.5 text-foreground/25" aria-hidden />
              <span className="whitespace-pre-wrap">{candidate.citation.snippet}</span>
            </blockquote>
          </SectionBlock>
        </div>

        <aside className="paper-card flex h-fit flex-col gap-5 rounded-[16px] p-5 lg:sticky lg:top-24">
          <div className="flex flex-col gap-1.5">
            <p className="mono-caption text-foreground/55">{t('admin.discovery.detail.fields.confidence')}</p>
            <ConfidenceMeter confidence={candidate.confidence} showLabel />
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="mono-caption text-foreground/55">{t('admin.discovery.detail.fields.sourceUrl')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              render={<a href={candidate.source_url} target="_blank" rel="noopener noreferrer" />}
              className="justify-between gap-2 rounded-full"
            >
              <span className="truncate text-left">{candidate.source_url.replace(/^https?:\/\//, '')}</span>
              <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="mono-caption text-foreground/55">{t('admin.discovery.detail.fields.contentHash')}</p>
            <button
              type="button"
              onClick={copyHash}
              aria-label={t('admin.discovery.detail.copyHashAria')}
              className="group flex cursor-pointer items-center justify-between gap-2 rounded-[8px] border border-foreground/10 bg-card/40 px-3 py-2 font-mono text-[12px] text-foreground/75 transition-colors hover:border-foreground/20 hover:text-foreground"
            >
              <span className="truncate">{candidate.source_content_hash.slice(0, 24)}…</span>
              <Copy className="size-3.5 shrink-0 opacity-50 group-hover:opacity-100" aria-hidden />
            </button>
          </div>

          {!existingRule && (
            <div className="border-t border-foreground/10 pt-4">
              <p className="mono-caption text-[color:var(--hibiscus)]">{t('admin.discovery.detail.newScheme.title')}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground/70">
                {t('admin.discovery.detail.newScheme.body')}
              </p>
            </div>
          )}
        </aside>
      </div>

      {existingRule && (
        <UnifiedDiff
          fields={[
            { label: t('admin.discovery.detail.fields.name'), current: existingRule.name, proposed: candidate.name },
            {
              label: t('admin.discovery.detail.fields.agency'),
              current: existingRule.agency,
              proposed: candidate.agency
            },
            {
              label: t('admin.discovery.detail.fields.eligibilitySummary'),
              current: existingRule.eligibility_summary,
              proposed: candidate.eligibility_summary
            },
            {
              label: t('admin.discovery.detail.fields.rateSummary'),
              current: existingRule.rate_summary,
              proposed: candidate.rate_summary
            }
          ]}
        />
      )}

      <section className="paper-card flex flex-col gap-4 rounded-[16px] p-6">
        <div className="flex flex-col gap-2">
          <p className="mono-caption text-foreground/55">{t('admin.discovery.detail.note')}</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('admin.discovery.detail.actions.notePlaceholder')}
            rows={3}
            maxLength={2000}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-foreground/10 pt-4">
          <Button type="button" onClick={() => run('approve')} disabled={busy !== null} className="gap-2">
            {busy === 'approve' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {t('admin.discovery.detail.actions.approve')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => run('changes')}
            disabled={busy !== null}
            className="gap-2"
          >
            {busy === 'changes' ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {t('admin.discovery.detail.actions.requestChanges')}
          </Button>
          <span className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            onClick={() => run('reject')}
            disabled={busy !== null}
            className="gap-2 text-destructive hover:text-destructive"
          >
            {busy === 'reject' ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            {t('admin.discovery.detail.actions.reject')}
          </Button>
        </div>
        {error && (
          <p className="rounded-md bg-destructive/15 p-2 text-sm text-destructive" role="alert">
            {t('admin.discovery.detail.actionError', { message: error })}
          </p>
        )}
        {manifestYaml && (
          <div
            className="flex flex-wrap items-center gap-2 rounded-[10px] border border-foreground/10 bg-card/40 px-3 py-2 text-sm text-foreground/70"
            role="status"
          >
            <span>{t('admin.discovery.detail.manifestReady')}</span>
            <Button type="button" variant="ghost" size="sm" onClick={downloadManifest} className="gap-1.5 px-2">
              <Download className="size-4" />
              {t('admin.discovery.detail.downloadManifest')}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

function SectionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="paper-card flex flex-col gap-2.5 rounded-[14px] p-5">
      <p className="mono-caption text-foreground/55">{label}</p>
      {children}
    </section>
  )
}
