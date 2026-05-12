'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Download, Loader2, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CandidateStatusPill } from '@/components/admin/status-pill-status'
import { UnifiedDiff } from '@/components/admin/unified-diff'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  approveCandidate,
  rejectCandidate,
  requestChangesCandidate,
  type CandidateDetail
} from '@/lib/admin-discovery'
import { notificationStore } from '@/lib/notification-store'

type ExistingRule = {
  name: string
  agency: string
  eligibility_summary: string
  rate_summary: string
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

  async function run(action: 'approve' | 'reject' | 'changes') {
    setBusy(action)
    setError(null)
    try {
      const fn =
        action === 'approve'
          ? approveCandidate
          : action === 'reject'
            ? rejectCandidate
            : requestChangesCandidate
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

  return (
    <div className="flex flex-col gap-6">
      <section className="paper-card flex flex-col gap-4 rounded-[16px] p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mono-caption text-foreground/55">
              {matched ? t('admin.discovery.detail.headingMatched') : t('admin.discovery.detail.headingNew')}
            </p>
            <h2 className="font-heading text-2xl font-semibold tracking-tight">{candidate.name}</h2>
          </div>
          <CandidateStatusPill status={status} />
        </header>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Field label={t('admin.discovery.detail.fields.agency')} value={candidate.agency} />
          <Field
            label={t('admin.discovery.detail.fields.schemeId')}
            value={candidate.scheme_id ?? t('admin.discovery.detail.fields.schemeIdUnmatched')}
          />
          <Field
            label={t('admin.discovery.detail.fields.confidence')}
            value={`${Math.round(candidate.confidence * 100)}%`}
          />
          <Field
            label={t('admin.discovery.detail.fields.extractedAt')}
            value={new Date(candidate.extracted_at).toLocaleString()}
          />
          <Field
            label={t('admin.discovery.detail.fields.sourceUrl')}
            value={
              <a
                href={candidate.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[color:var(--primary)] hover:underline"
              >
                {candidate.source_url}
              </a>
            }
            full
          />
          <Field
            label={t('admin.discovery.detail.fields.contentHash')}
            value={<code className="font-mono text-xs">{candidate.source_content_hash.slice(0, 16)}…</code>}
            full
          />
        </dl>

        <div className="grid grid-cols-1 gap-3">
          <FieldLong
            label={t('admin.discovery.detail.fields.eligibilitySummary')}
            value={candidate.eligibility_summary}
          />
          <FieldLong label={t('admin.discovery.detail.fields.rateSummary')} value={candidate.rate_summary} />
          <FieldLong
            label={t('admin.discovery.detail.fields.citation')}
            value={candidate.citation.snippet}
            mono
          />
        </div>
      </section>

      {existingRule ? (
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
      ) : (
        <p className="rounded-[12px] border border-foreground/10 bg-card/40 p-4 text-sm text-foreground/60">
          {t('admin.discovery.detail.diffEmpty')}
        </p>
      )}

      <section className="paper-card flex flex-col gap-3 rounded-[16px] p-6">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('admin.discovery.detail.actions.notePlaceholder')}
          rows={3}
          maxLength={2000}
        />
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/70" role="status">
            <span>{t('admin.discovery.detail.manifestReady')}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={downloadManifest}
              className="gap-1.5 px-2"
            >
              <Download className="size-4" />
              {t('admin.discovery.detail.downloadManifest')}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

function Field({
  label,
  value,
  full
}: {
  label: string
  value: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <dt className="mono-caption text-foreground/55">{label}</dt>
      <dd className="mt-0.5 text-foreground/85">{value}</dd>
    </div>
  )
}

function FieldLong({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="mono-caption text-foreground/55">{label}</p>
      <p className={`whitespace-pre-wrap text-sm text-foreground/85 ${mono ? 'font-mono text-[13px]' : ''}`}>
        {value}
      </p>
    </div>
  )
}
