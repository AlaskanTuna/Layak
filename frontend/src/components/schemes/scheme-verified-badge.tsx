'use client'

import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useVerifiedAt } from '@/hooks/use-verified-schemes'
import { cn } from '@/lib/utils'

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0 || Number.isNaN(ms)) return new Date(iso).toLocaleDateString()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mo ago`
  return `${Math.floor(months / 12)} y ago`
}

export function SchemeVerifiedBadge({
  schemeId,
  className
}: {
  schemeId: string | null | undefined
  className?: string
}) {
  const { t } = useTranslation()
  const verifiedAt = useVerifiedAt(schemeId)

  // Loading: render nothing to avoid layout shift jitter on the scheme cards.
  if (verifiedAt === undefined) return null

  const label = verifiedAt
    ? t('schemes.verifiedBadge.labelWithDate', { date: formatRelative(verifiedAt) })
    : t('schemes.verifiedBadge.labelNever')

  return (
    <span
      title={t('schemes.verifiedBadge.tooltip')}
      className={cn(
        'mono-caption inline-flex items-center gap-1 text-foreground/55',
        !verifiedAt && 'text-foreground/40',
        className
      )}
    >
      <ShieldCheck className="size-3" aria-hidden />
      {label}
    </span>
  )
}
