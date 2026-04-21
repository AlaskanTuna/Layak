'use client'

import { AlertTriangle, ListChecks, RotateCcw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  message: string
  onUseSamples: () => void
  onReset: () => void
  /** Surface a "Switch to Manual Entry" CTA — wired by the upload client.
   * When omitted the card falls back to the legacy two-button layout. */
  onSwitchToManual?: () => void
}

/**
 * Pattern-match the backend's `humanize_error_message` output.
 * The quota-exhausted copy is the only one that explicitly suggests Manual
 * Entry as remediation, so we surface a dedicated CTA that takes the user
 * straight there instead of asking them to click another upload button.
 */
function isQuotaExhausted(message: string): boolean {
  return message.includes('Manual Entry') && message.toLowerCase().includes('quota')
}

export function ErrorRecoveryCard({ message, onUseSamples, onReset, onSwitchToManual }: Props) {
  const { t } = useTranslation()
  const quotaExhausted = isQuotaExhausted(message)

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" aria-hidden />
          {t('evaluation.error.title')}
        </CardTitle>
        <CardDescription className="text-destructive/90">{message}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!quotaExhausted && (
          <p className="text-sm text-muted-foreground">{t('evaluation.error.recoveryIntro')}</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {quotaExhausted && onSwitchToManual ? (
            <Button type="button" onClick={onSwitchToManual} className="flex-1">
              <ListChecks className="mr-2 size-4" aria-hidden />
              {t('evaluation.error.switchToManual')}
            </Button>
          ) : (
            <Button type="button" onClick={onUseSamples} className="flex-1">
              <Sparkles className="mr-2 size-4" aria-hidden />
              {t('evaluation.error.trySamples')}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onReset} className="flex-1">
            <RotateCcw className="mr-2 size-4" aria-hidden />
            {t('common.button.startOver')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
