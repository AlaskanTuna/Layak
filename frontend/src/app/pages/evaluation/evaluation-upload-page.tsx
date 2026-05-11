'use client'

import { Suspense } from 'react'

import { EvaluationUploadClient } from '@/components/evaluation/evaluation-upload-client'

export function EvaluationUploadPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* `EvaluationUploadClient` owns its own PageHeading so it can render
          the sample-data dropdown in the action slot when on the Upload tab.
          `useSearchParams()` inside the client requires a Suspense boundary
          in Next.js 16. The breadcrumb in the topbar handles the back-nav. */}
      <Suspense fallback={null}>
        <EvaluationUploadClient />
      </Suspense>
    </div>
  )
}
