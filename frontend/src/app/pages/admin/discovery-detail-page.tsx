'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AuthGuard } from '@/components/auth/auth-guard'
import { CandidateDetailCard } from '@/components/admin/candidate-detail-card'
import { fetchCandidate, type CandidateDetail } from '@/lib/admin-discovery'
import { baselineFor } from '@/lib/scheme-baselines'

function DiscoveryDetailInner({ candidateId }: { candidateId: string }) {
  const { t } = useTranslation()
  const [detail, setDetail] = useState<CandidateDetail | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (id: string, signal: { cancelled: boolean }) => {
    setPhase('loading')
    try {
      const res = await fetchCandidate(id)
      if (signal.cancelled) return
      setDetail(res)
      setPhase('ready')
    } catch (err: unknown) {
      if (signal.cancelled) return
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(candidateId, signal)
    return () => {
      signal.cancelled = true
    }
  }, [candidateId, load])

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/discovery"
        className="mono-caption inline-flex w-fit items-center gap-1.5 text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t('admin.discovery.detail.backToQueue')}
      </Link>

      {phase === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-foreground/60">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t('admin.discovery.queue.loading')}
        </div>
      )}
      {phase === 'error' && error && (
        <p className="rounded-md bg-destructive/15 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {phase === 'ready' && detail && (
        <CandidateDetailCard detail={detail} existingRule={baselineFor(detail.candidate.scheme_id)} />
      )}
    </div>
  )
}

export function DiscoveryDetailPage({ candidateId }: { candidateId: string }) {
  return (
    <AuthGuard requireRole="admin">
      <DiscoveryDetailInner candidateId={candidateId} />
    </AuthGuard>
  )
}
