'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth-context'
import type { QuotaResponse } from '@/lib/agent-types'
import { authedFetch } from '@/lib/firebase'
import { cn } from '@/lib/utils'

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

function formatResetIn(resetAt: string): string {
  const ms = new Date(resetAt).getTime() - Date.now()
  if (ms <= 0) return 'now'
  const totalMinutes = Math.floor(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h <= 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

type QuotaMeterProps = {
  /** Bumped by parent after a real intake completes — triggers a re-fetch. */
  refreshKey?: number | string
  className?: string
}

/**
 * Visual meter for the rolling 24h evaluation cap.
 *
 * Free tier: shows used/limit with a usage bar and a reset countdown.
 * Pro tier: shows a "Pro" badge with no meter (limit is the unlimited
 * sentinel from the backend, `-1`).
 *
 * Reads `GET /api/quota` on mount and whenever `refreshKey` changes — so
 * the parent route bumps the key after the agent pipeline finishes.
 */
export function QuotaMeter({ refreshKey, className }: QuotaMeterProps) {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const [quota, setQuota] = useState<QuotaResponse | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')

  const fetchQuota = useCallback(async () => {
    try {
      const res = await authedFetch(`${getBackendUrl()}/api/quota`, { method: 'GET' })
      if (!res.ok) {
        setPhase('error')
        return
      }
      const next = (await res.json()) as QuotaResponse
      setQuota(next)
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }, [])

  // setState lands inside `fetchQuota` AFTER the await; the lint's strict
  // reading covers a synchronous-setState-in-effect pattern this code never
  // hits, but the rule still trips on the call graph — silenced inline.
  useEffect(() => {
    if (authLoading || !user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchQuota()
  }, [authLoading, user, fetchQuota, refreshKey])

  if (authLoading || phase === 'loading') {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {t('dashboard.quota.checking')}
      </div>
    )
  }

  if (phase === 'error' || !quota) {
    return (
      <div className={cn('text-xs text-muted-foreground', className)}>
        {t('dashboard.quota.unavailable')}
      </div>
    )
  }

  if (quota.tier === 'pro') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant="default" className="gap-1">
          <Sparkles className="size-3" aria-hidden />
          {t('dashboard.quota.tierPro')}
        </Badge>
      </div>
    )
  }

  const pct = Math.min(100, Math.round((quota.used / quota.limit) * 100))
  const exhausted = quota.remaining === 0
  const nearCap = quota.remaining <= 1 && !exhausted

  return (
    <div
      className={cn(
        'flex w-full max-w-sm flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Zap className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {t('dashboard.quota.tierFree')}
          </span>
        </div>
        <span
          className={cn(
            'tabular-nums text-xs font-medium',
            exhausted ? 'text-destructive' : nearCap ? 'text-amber-600' : 'text-foreground'
          )}
        >
          {quota.used} / {quota.limit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          role="progressbar"
          aria-valuenow={quota.used}
          aria-valuemin={0}
          aria-valuemax={quota.limit}
          aria-label={t('dashboard.quota.aria', { used: quota.used, limit: quota.limit })}
          style={{ width: `${pct}%` }}
          className={cn(
            'h-full transition-all',
            exhausted ? 'bg-destructive' : nearCap ? 'bg-amber-500' : 'bg-primary'
          )}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {exhausted
          ? t('dashboard.quota.exhausted', { time: formatResetIn(quota.resetAt) })
          : t('dashboard.quota.remaining', {
              remaining: quota.remaining,
              time: formatResetIn(quota.resetAt)
            })}
      </p>
    </div>
  )
}
