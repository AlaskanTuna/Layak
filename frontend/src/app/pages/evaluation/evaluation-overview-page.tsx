'use client'

import { useTranslation } from 'react-i18next'

import { EvaluationHistorySection } from '@/components/history/evaluation-history-section'
import { PageHeading } from '@/components/layout/page-heading'
import { QuotaMeter } from '@/components/dashboard/quota-meter'

export function EvaluationOverviewPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t('evaluation.overview.eyebrow')}
        title={t('evaluation.overview.title')}
        description={t('evaluation.overview.description')}
      >
        <div className="mt-2">
          <QuotaMeter />
        </div>
      </PageHeading>
      <EvaluationHistorySection />
    </div>
  )
}
