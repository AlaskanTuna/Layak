'use client'

import { useState } from 'react'
import { Check, Crown, Loader2, Sparkles } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth-context'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional context — when opened off a 429, surface the reset time. */
  context?: {
    kind: 'rate_limit'
    resetAt: string
    limit: number
    windowHours: number
  }
}

function formatResetTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short'
    })
  } catch {
    return iso
  }
}

/**
 * Phase 3 Task 4 — pre-Firestore stub. The modal opens off the 429 quota
 * gate and from any future "Pro upsell" CTAs. Phase 4 Task 5 wires the
 * confirm button to a `waitlist/{autoId}` Firestore write; until then we
 * show a confirmation receipt without any backend write.
 */
export function UpgradeWaitlistModal({ open, onOpenChange, context }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  function handleClose() {
    onOpenChange(false)
    // Defer reset so the success state lingers during fade-out.
    setTimeout(() => setSubmitted(false), 250)
  }

  async function handleConfirm() {
    setBusy(true)
    // Phase 4 Task 5 will replace this with a real Firestore write.
    // For now, the receipt is purely client-side so the UX is testable.
    await new Promise(resolve => setTimeout(resolve, 350))
    setBusy(false)
    setSubmitted(true)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="size-4 text-primary" aria-hidden />
            {t('settings.upgrade.title')}
          </DialogTitle>
          <DialogDescription>
            {context?.kind === 'rate_limit'
              ? t('settings.upgrade.descriptionRateLimit', {
                  limit: context.limit,
                  hours: context.windowHours
                })
              : t('settings.upgrade.descriptionDefault')}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="size-5" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-heading text-base font-semibold tracking-tight">
                {t('settings.upgrade.successTitle')}
              </p>
              <p className="text-sm text-muted-foreground">
                <Trans
                  i18nKey="settings.upgrade.successMessage"
                  values={{ email: user?.email ?? t('settings.upgrade.emailFallback') }}
                  components={{ strong: <span className="font-medium text-foreground" /> }}
                />
              </p>
            </div>
            {context?.kind === 'rate_limit' && (
              <p className="text-xs text-muted-foreground">
                {t('settings.upgrade.resetInfo', { time: formatResetTime(context.resetAt) })}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <span>{t('settings.upgrade.feature1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <span>{t('settings.upgrade.feature2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <span>{t('settings.upgrade.feature3')}</span>
              </li>
            </ul>
            {context?.kind === 'rate_limit' && (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {t('settings.upgrade.resetInfo', { time: formatResetTime(context.resetAt) })}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {submitted ? (
            <Button type="button" onClick={handleClose}>
              {t('common.button.done')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
                {t('common.button.maybeLater')}
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={busy || !user}>
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                    {t('settings.upgrade.joining')}
                  </>
                ) : (
                  t('settings.upgrade.joinWaitlist')
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
