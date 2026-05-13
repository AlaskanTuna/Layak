'use client'

import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type Band = 'high' | 'mid' | 'low'

function bandFor(confidence: number): Band {
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.6) return 'mid'
  return 'low'
}

const SEGMENT_COLOR: Record<Band, string> = {
  high: 'bg-[color:var(--hibiscus)]',
  mid: 'bg-[color:var(--warning)]',
  low: 'bg-destructive'
}

/**
 * Four-segment meter + percent (+ optional band label) used by the discovery
 * moderation queue and detail view. Bands: ≥0.85 high, ≥0.6 mid, <0.6 low.
 */
export function ConfidenceMeter({
  confidence,
  showLabel = false,
  className
}: {
  confidence: number
  showLabel?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const band = bandFor(confidence)
  const filled = Math.max(1, Math.min(4, Math.ceil(confidence * 4)))
  const pct = Math.round(confidence * 100)
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="meter"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t(`admin.discovery.confidence.band.${band}`)}
    >
      <div className="flex gap-0.5" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <span
            key={i}
            className={cn('h-1.5 w-3 rounded-sm', i < filled ? SEGMENT_COLOR[band] : 'bg-foreground/10')}
          />
        ))}
      </div>
      <span className="font-mono text-[12px] tabular-nums text-foreground/80">{pct}%</span>
      {showLabel && (
        <span className="mono-caption text-foreground/55">{t(`admin.discovery.confidence.band.${band}`)}</span>
      )}
    </div>
  )
}
