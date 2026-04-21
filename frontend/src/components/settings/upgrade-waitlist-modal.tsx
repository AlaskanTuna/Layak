'use client'

import { useState } from 'react'
import { Check, Crown, Loader2, Sparkles } from 'lucide-react'

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
            Get Layak Pro
          </DialogTitle>
          <DialogDescription>
            {context?.kind === 'rate_limit'
              ? `You've hit the free tier cap of ${context.limit} evaluations every ${context.windowHours} hours. Pro removes the cap and keeps history forever.`
              : 'Upgrade to remove the free-tier cap and keep your evaluation history forever.'}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="size-5" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-heading text-base font-semibold tracking-tight">
                You&rsquo;re on the waitlist.
              </p>
              <p className="text-sm text-muted-foreground">
                We&rsquo;ll email <span className="font-medium text-foreground">{user?.email ?? 'you'}</span>{' '}
                when Layak Pro is available.
              </p>
            </div>
            {context?.kind === 'rate_limit' && (
              <p className="text-xs text-muted-foreground">
                Your free quota resets at{' '}
                <span className="font-medium text-foreground">{formatResetTime(context.resetAt)}</span>.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <span>Unlimited evaluations &mdash; no rolling cap.</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <span>History persists indefinitely (free tier auto-prunes after 30 days).</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <span>Priority access to new schemes as they&rsquo;re added.</span>
              </li>
            </ul>
            {context?.kind === 'rate_limit' && (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Free quota resets at{' '}
                <span className="font-medium text-foreground">{formatResetTime(context.resetAt)}</span>.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {submitted ? (
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
                Maybe later
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={busy || !user}>
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
                    Adding…
                  </>
                ) : (
                  'Join waitlist'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
