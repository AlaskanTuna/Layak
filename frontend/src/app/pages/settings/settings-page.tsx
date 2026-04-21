'use client'

import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/components/layout/page-heading'
import { SettingsPlaceholder } from '@/components/settings/settings-placeholder'

export function SettingsPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        description={t('settings.description')}
      />
      <SettingsPlaceholder />
    </div>
  )
}
