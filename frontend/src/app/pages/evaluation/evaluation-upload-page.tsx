'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { EvaluationUploadClient } from '@/components/evaluation/evaluation-upload-client'
import { PageHeading } from '@/components/layout/page-heading'

export function EvaluationUploadPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/evaluation"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {t('evaluation.results.backToEvaluations')}
      </Link>
      <PageHeading
        eyebrow={t('evaluation.upload.eyebrow')}
        title={t('evaluation.upload.pageTitle')}
        description={t('evaluation.upload.pageDescription')}
      />
      {/* `EvaluationUploadClient` reads `useSearchParams()` (for ?mode=manual) —
          Next.js 16 static generation bails out unless that's wrapped in Suspense. */}
      <Suspense fallback={null}>
        <EvaluationUploadClient />
      </Suspense>
    </div>
  )
}
