'use client'

import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/components/layout/page-heading'
import { SchemesHowMatchingWorks } from '@/components/schemes/schemes-how-matching-works'
import { SchemesOverview } from '@/components/schemes/schemes-overview'
import { SchemesStatsStrip } from '@/components/schemes/schemes-stats-strip'

export function SchemesPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t('schemes.pageEyebrow')}
        title={t('schemes.pageTitle')}
        description={t('schemes.pageDescription')}
        illustration="/dashboard/schemes.webp"
      />
      <SchemesStatsStrip />
      <SchemesOverview />
      <SchemesHowMatchingWorks />
    </div>
  )
}
