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
        illustration="/dashboard/evaluations.webp"
        action={
          <Button
            render={<Link href="/dashboard/evaluation/upload" />}
            size="lg"
            className="rounded-full bg-[color:var(--hibiscus)] px-5 text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)] [a]:hover:bg-[color:var(--hibiscus)]"
          >
            <Plus className="mr-1 size-4" aria-hidden />
            {t('evaluation.overview.createCta')}
          </Button>
        }
      >
        <QuotaMeter className="mt-2" />
      </PageHeading>
      <EvaluationHistorySection />
    </div>
  )
}
