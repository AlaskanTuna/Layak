'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EvaluationHistorySection } from '@/components/history/evaluation-history-section'
import { PageHeading } from '@/components/layout/page-heading'
import { QuotaMeter } from '@/components/dashboard/quota-meter'
import { Button } from '@/components/ui/button'

export function EvaluationOverviewPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t('evaluation.overview.eyebrow')}
        title={t('evaluation.overview.title')}
        description={t('evaluation.overview.description')}
      >
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button render={<Link href="/dashboard/evaluation/upload" />}>
            <Plus className="mr-1 size-4" aria-hidden />
            {t('evaluation.overview.createCta')}
          </Button>
          <QuotaMeter />
        </div>
      </PageHeading>
      <EvaluationHistorySection />
    </div>
  )
}
