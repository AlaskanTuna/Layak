'use client'

import { Crown, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

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
 * Quota-exhaustion modal. The "Pro" tier is a placeholder narrative in v2 —
 * there is no real subscription product or waitlist signup, so this dialog
 * is purely informational: it shows the cap that was hit, the reset time,
 * and what Pro would unlock. The single action is a Close button.
 */
export function UpgradeWaitlistModal({ open, onOpenChange, context }: Props) {
  const { t } = useTranslation()

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

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('common.button.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
