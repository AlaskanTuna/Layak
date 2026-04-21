'use client'

import { AlertTriangle, ListChecks, RotateCcw, Sparkles } from 'lucide-react'

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
  const quotaExhausted = isQuotaExhausted(message)

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" aria-hidden />
          Pipeline error
        </CardTitle>
        <CardDescription className="text-destructive/90">{message}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!quotaExhausted && (
          <p className="text-sm text-muted-foreground">
            Something broke mid-pipeline. You can run the full flow against synthetic Aisyah documents — useful
            for confirming the rest of the UI is healthy — or start over with fresh uploads.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {quotaExhausted && onSwitchToManual ? (
            <Button type="button" onClick={onSwitchToManual} className="flex-1">
              <ListChecks className="mr-2 size-4" aria-hidden />
              Switch to Manual Entry
            </Button>
          ) : (
            <Button type="button" onClick={onUseSamples} className="flex-1">
              <Sparkles className="mr-2 size-4" aria-hidden />
              Try with sample documents
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onReset} className="flex-1">
            <RotateCcw className="mr-2 size-4" aria-hidden />
            Start over
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
