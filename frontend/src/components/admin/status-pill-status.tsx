'use client'

import { useTranslation } from 'react-i18next'

import { StatusPill } from '@/components/ui/status-pill'
import type { CandidateStatus } from '@/lib/admin-discovery'

const TONES = {
  pending: 'processing',
  approved: 'approved',
  rejected: 'rejected',
  changes_requested: 'submitted'
} as const

export function CandidateStatusPill({ status }: { status: CandidateStatus }) {
  const { t } = useTranslation()
  return <StatusPill tone={TONES[status]}>{t(`admin.discovery.filters.${status}`)}</StatusPill>
}
