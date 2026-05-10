'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'

import { EvaluationUploadClient } from '@/components/evaluation/evaluation-upload-client'

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
      {/* `EvaluationUploadClient` owns its own PageHeading so it can render
          the sample-data dropdown in the action slot when on the Upload tab.
          `useSearchParams()` inside the client requires a Suspense boundary
          in Next.js 16. */}
      <Suspense fallback={null}>
        <EvaluationUploadClient />
      </Suspense>
    </div>
  )
}
