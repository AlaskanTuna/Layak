'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { fetchSchemeHealth, type SchemeHealthRow } from '@/lib/admin-discovery'

function formatRelative(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0 || Number.isNaN(ms)) return ''
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

export function SchemeHealthCard({ refreshKey }: { refreshKey: number }) {
  const { t } = useTranslation()
  const [rows, setRows] = useState<SchemeHealthRow[]>([])
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(async (signal: { cancelled: boolean }) => {
    setPhase('loading')
    try {
      const res = await fetchSchemeHealth()
      if (signal.cancelled) return
      setRows(res.items)
      setPhase('ready')
    } catch {
      if (signal.cancelled) return
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(signal)
    return () => {
      signal.cancelled = true
    }
  }, [refreshKey, load])

  return (
    <section className="paper-card flex flex-col gap-4 rounded-[16px] p-6">
      <header className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-[color:var(--primary)]" aria-hidden />
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            {t('admin.discovery.health.title')}
          </h2>
          <p className="mono-caption text-foreground/55">{t('admin.discovery.health.subtitle')}</p>
        </div>
      </header>
      {phase === 'ready' && rows.length === 0 && (
        <p className="text-sm text-foreground/60">{t('admin.discovery.health.empty')}</p>
      )}
      {phase === 'ready' && rows.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <li
              key={row.scheme_id}
              className="flex items-baseline justify-between gap-3 border-b border-foreground/5 py-2 last:border-b-0"
            >
              <span className="font-medium text-foreground/85">{row.scheme_id}</span>
              <span className="mono-caption text-foreground/55">
                {row.verified_at
                  ? `${t('admin.discovery.health.verifiedPrefix')}${formatRelative(row.verified_at)}`
                  : t('admin.discovery.health.neverVerified')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
