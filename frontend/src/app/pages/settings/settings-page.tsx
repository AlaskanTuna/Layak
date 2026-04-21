'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Crown, Download, Loader2, LogOut, Mail, Trash2, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/components/layout/page-heading'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import type { QuotaResponse } from '@/lib/agent-types'
import { authedFetch, signOutCurrentUser } from '@/lib/firebase'

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

export function SettingsPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [quota, setQuota] = useState<QuotaResponse | null>(null)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchQuota = useCallback(async () => {
    try {
      const res = await authedFetch(`${getBackendUrl()}/api/quota`, { method: 'GET' })
      if (!res.ok) return
      setQuota((await res.json()) as QuotaResponse)
    } catch {
      // Tier card falls back to a hint; not fatal for the page.
    }
  }, [])

  useEffect(() => {
    if (authLoading || !user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchQuota()
  }, [authLoading, user, fetchQuota])

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    setActionError(null)
    try {
      const res = await authedFetch(`${getBackendUrl()}/api/user/export`, { method: 'GET' })
      if (!res.ok) throw new Error(`Export failed: ${res.status} ${res.statusText}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `layak-export-${user?.uid ?? 'me'}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    if (!window.confirm(t('settings.danger.deleteConfirm'))) return
    setDeleting(true)
    setActionError(null)
    try {
      const res = await authedFetch(`${getBackendUrl()}/api/user`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed: ${res.status} ${res.statusText}`)
      }
      await signOutCurrentUser().catch(() => undefined)
      router.replace('/sign-in')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        description={t('settings.description')}
      />

      {actionError && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t('settings.actionErrorTitle')}</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile.title')}</CardTitle>
          <CardDescription>{t('settings.profile.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
              {(user?.displayName || user?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium">{user?.displayName ?? t('settings.profile.unknownName')}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="size-3" aria-hidden />
                {user?.email ?? '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="size-4 text-primary" aria-hidden />
            {t('settings.tier.title')}
          </CardTitle>
          <CardDescription>{t('settings.tier.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {quota?.tier === 'pro' ? (
            <Badge variant="default" className="w-fit gap-1">
              <Crown className="size-3" aria-hidden />
              {t('settings.tier.proLabel')}
            </Badge>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="gap-1">
                  <Zap className="size-3" aria-hidden />
                  {t('settings.tier.freeLabel')}
                </Badge>
                {quota && (
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {t('settings.tier.usage', { used: quota.used, limit: quota.limit })}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.tier.freeHint')}</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" aria-hidden />
            {t('settings.danger.title')}
          </CardTitle>
          <CardDescription>{t('settings.danger.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5">
            <div className="flex flex-col">
              <p className="text-sm font-medium">{t('settings.danger.exportTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.danger.exportDescription')}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={exporting || deleting}
            >
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="size-3.5" aria-hidden />
              )}
              {t('settings.danger.exportCta')}
            </Button>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-destructive">{t('settings.danger.deleteTitle')}</p>
              <p className="text-xs text-destructive/80">{t('settings.danger.deleteDescription')}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={exporting || deleting}
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
              {t('settings.danger.deleteCta')}
            </Button>
          </div>

          <div className="flex">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                await signOutCurrentUser().catch(() => undefined)
                router.replace('/sign-in')
              }}
            >
              <LogOut className="size-3.5" aria-hidden />
              {t('common.button.signOut')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
