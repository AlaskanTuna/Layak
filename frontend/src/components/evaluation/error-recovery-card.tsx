'use client'

import { AlertTriangle, RotateCcw, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  message: string
  onUseSamples: () => void
  onReset: () => void
}

export function ErrorRecoveryCard({ message, onUseSamples, onReset }: Props) {
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
        <p className="text-sm text-muted-foreground">
          Something broke mid-pipeline. You can run the full flow against synthetic Aisyah documents — useful
          for confirming the rest of the UI is healthy — or start over with fresh uploads.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={onUseSamples} className="flex-1">
            <Sparkles className="mr-2 size-4" aria-hidden />
            Try with sample documents
          </Button>
          <Button type="button" variant="outline" onClick={onReset} className="flex-1">
            <RotateCcw className="mr-2 size-4" aria-hidden />
            Start over
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
