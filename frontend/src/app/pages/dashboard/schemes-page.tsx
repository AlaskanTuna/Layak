'use client'

import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/components/layout/page-heading'
import { SchemesOverview } from '@/components/schemes/schemes-overview'

export function SchemesPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        eyebrow={t('schemes.pageEyebrow')}
        title={t('schemes.pageTitle')}
        description={t('schemes.pageDescription')}
      />
      <SchemesOverview />
    </div>
  )
}
