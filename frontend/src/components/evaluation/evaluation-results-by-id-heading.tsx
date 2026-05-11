'use client'

import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/components/layout/page-heading'

export function EvaluationResultsByIdHeading() {
  const { t } = useTranslation()
  return (
    <PageHeading
      eyebrow={t('evaluation.results.byIdEyebrow')}
      title={t('evaluation.results.byIdTitle')}
      description={t('evaluation.results.byIdDescription')}
      illustration="/dashboard/evaluations.webp"
      illustrationClassName="sm:bottom-0 lg:-bottom-2"
    />
  )
}
