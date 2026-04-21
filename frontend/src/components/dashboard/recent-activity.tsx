'use client'

import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function RecentActivity() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-tight">
        {t('dashboard.recentActivity.title')}
      </h2>
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/40 px-6 py-10 text-center">
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Clock className="size-5" aria-hidden />
        </div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {t('dashboard.recentActivity.empty')}
        </p>
        <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
          {t('dashboard.recentActivity.emptyDescription')}
        </p>
      </div>
    </section>
  )
}
