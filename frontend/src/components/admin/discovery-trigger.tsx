'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { triggerDiscovery, type DiscoveryRunSummary } from '@/lib/admin-discovery'
import { notificationStore } from '@/lib/notification-store'

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
      notificationStore.notify({
        title: t('admin.discovery.triggerSuccessTitle'),
        description: t('admin.discovery.triggerSuccess', {
          checked: res.sources_checked,
          changed: res.sources_changed,
          extracted: res.candidates_extracted
        }),
        severity: 'success',
        toast: true,
        groupKey: 'admin-discovery-trigger'
      })
      onCompleted()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setPhase('error')
      notificationStore.notify({
        title: t('admin.discovery.triggerErrorTitle'),
        description: t('admin.discovery.triggerError', { message }),
        severity: 'error',
        toast: true,
        groupKey: 'admin-discovery-trigger'
      })
    }
  }

  const busy = phase === 'running'

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" onClick={handleClick} disabled={busy} className="gap-2">
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
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
