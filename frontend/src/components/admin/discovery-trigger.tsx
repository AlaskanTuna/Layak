'use client'

import { useState } from 'react'
import { Loader2, Radar } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { triggerDiscovery, type DiscoveryRunSummary } from '@/lib/admin-discovery'

type Phase = 'idle' | 'running' | 'done' | 'error'

export function DiscoveryTrigger({ onCompleted }: { onCompleted: () => void }) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('idle')
  const [summary, setSummary] = useState<DiscoveryRunSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setPhase('running')
    setError(null)
    setSummary(null)
    try {
      const res = await triggerDiscovery()
      setSummary(res)
      setPhase('done')
      onCompleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }

  const busy = phase === 'running'

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" onClick={handleClick} disabled={busy} className="gap-2">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Radar className="size-4" aria-hidden />}
        {busy ? t('admin.discovery.triggerRunning') : t('admin.discovery.triggerButton')}
      </Button>
      {phase === 'done' && summary && (
        <p className="mono-caption text-foreground/60" role="status">
          {t('admin.discovery.triggerSuccess', {
            checked: summary.sources_checked,
            changed: summary.sources_changed,
            extracted: summary.candidates_extracted
          })}
        </p>
      )}
      {phase === 'error' && error && (
        <p className="mono-caption text-destructive" role="alert">
          {t('admin.discovery.triggerError', { message: error })}
        </p>
      )}
    </div>
  )
}
