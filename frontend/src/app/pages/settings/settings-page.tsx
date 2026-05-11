'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Crown,
  Download,
  Loader2,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Sun,
  Trash2,
  Zap
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/components/layout/page-heading'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import type { QuotaResponse } from '@/lib/agent-types'
import { GUEST_UID, authedFetch, signOutCurrentUser } from '@/lib/firebase'
import { cn } from '@/lib/utils'

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
        illustration="/dashboard/settings.webp"
      />

      {actionError && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t('settings.actionErrorTitle')}</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SettingsCard
          eyebrow="01 — Profile"
          title={t('settings.profile.title')}
          description={t('settings.profile.description')}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-sm font-medium text-[color:var(--primary)]">
              {(user?.displayName || user?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium">{user?.displayName ?? t('settings.profile.unknownName')}</p>
              <p className="mono-caption mt-1 flex items-center gap-1.5 text-foreground/55">
                <Mail className="size-3" aria-hidden />
                {user?.email ?? '—'}
              </p>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          eyebrow="02 — Subscription tier"
          title={
            <span className="flex items-center gap-2">
              <Crown className="size-4 text-[color:var(--primary)]" aria-hidden />
              {t('settings.tier.title')}
            </span>
          }
          description={t('settings.tier.description')}
        >
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
                  <span className="font-heading text-[15px] font-semibold tabular-nums text-foreground">
                    {quota.used}
                    <span className="ml-0.5 text-foreground/45 font-normal">/ {quota.limit}</span>
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-foreground/65">{t('settings.tier.freeHint')}</p>
            </>
          )}
        </SettingsCard>

        <SettingsCard
          eyebrow="03 — Appearance"
          title={t('settings.appearance.title')}
          description={t('settings.appearance.description')}
        >
          <ThemePicker />
        </SettingsCard>
      </div>

      <SettingsCard
        eyebrow="04 — Data & account"
        accent="hibiscus"
        title={
          <span className="flex items-center gap-2 text-[color:var(--hibiscus)]">
            <AlertTriangle className="size-4" aria-hidden />
            {t('settings.danger.title')}
          </span>
        }
        description={t('settings.danger.description')}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border bg-background/60 px-3 py-2.5 backdrop-blur-md">
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
              className="bg-background/60 backdrop-blur-md hover:bg-background/80"
            >
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="size-3.5" aria-hidden />
              )}
              {t('settings.danger.exportCta')}
            </Button>
          </div>

          {user?.uid === GUEST_UID ? (
            <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 px-3 py-2.5 backdrop-blur-md">
              <p className="text-sm font-medium">{t('settings.danger.guestLockedTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('settings.danger.guestLockedDescription')}</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/[0.08] px-3 py-2.5 backdrop-blur-md">
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
          )}

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
        </div>
      </SettingsCard>
    </div>
  )
}

function SettingsCard({
  eyebrow,
  title,
  description,
  accent = 'primary',
  children
}: {
  eyebrow: string
  title: React.ReactNode
  description: React.ReactNode
  accent?: 'primary' | 'hibiscus'
  children: React.ReactNode
}) {
  const accentColor = accent === 'hibiscus' ? 'var(--hibiscus)' : 'var(--primary)'
  return (
    <section className="paper-card relative isolate flex h-full flex-col overflow-hidden rounded-[18px] p-6 sm:p-7">
      {/* Civic-handbook grid texture — matches other accent-strip cards */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />
      {/* Hibiscus / primary tab on the left edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-6 left-0 w-[3px] rounded-r-full sm:inset-y-7"
        style={{ background: `color-mix(in oklch, ${accentColor} 70%, transparent)` }}
      />
      <header className="relative mb-5 border-b border-foreground/10 pb-4">
        <p className="mono-caption" style={{ color: accentColor }}>
          {eyebrow}
        </p>
        <h2 className="mt-2 font-heading text-[19px] font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-foreground/65">{description}</p>
      </header>
      <div className="relative flex flex-1 flex-col gap-3">{children}</div>
    </section>
  )
}

const THEME_OPTIONS = [
  { value: 'system', icon: Monitor, i18nKey: 'system' },
  { value: 'light', icon: Sun, i18nKey: 'light' },
  { value: 'dark', icon: Moon, i18nKey: 'dark' }
] as const

function ThemePicker() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const current = mounted ? theme ?? 'system' : 'system'

  return (
    <div role="radiogroup" aria-label={t('settings.appearance.title')} className="grid grid-cols-3 gap-2">
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon
        const active = current === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left backdrop-blur-md transition-colors',
              active
                ? 'border-[color:var(--hibiscus)] bg-[color:var(--hibiscus)]/[0.10]'
                : 'border-border bg-background/60 hover:border-foreground/30 hover:bg-background/80'
            )}
          >
            <Icon
              className={cn(
                'size-4 transition-colors',
                active ? 'text-[color:var(--hibiscus)]' : 'text-foreground/55'
              )}
              aria-hidden
            />
            <p
              className={cn(
                'text-sm font-medium transition-colors',
                active ? 'text-foreground' : 'text-foreground/75'
              )}
            >
              {t(`settings.appearance.${option.i18nKey}.label`)}
            </p>
            <p className="mono-caption text-foreground/55">{t(`settings.appearance.${option.i18nKey}.hint`)}</p>
          </button>
        )
      })}
    </div>
  )
}
