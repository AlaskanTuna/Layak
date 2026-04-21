'use client'

import { useTranslation } from 'react-i18next'

import { EvaluationResultsClient } from '@/components/evaluation/evaluation-results-client'
import { PageHeading } from '@/components/layout/page-heading'

export function EvaluationResultsPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t('evaluation.results.eyebrow')}
        title={t('evaluation.results.title')}
        description={t('evaluation.results.description')}
      />
      <EvaluationResultsClient />
    </div>
  )
}
