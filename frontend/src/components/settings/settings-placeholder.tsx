'use client'

import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPlaceholder() {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Construction className="size-4 text-muted-foreground" aria-hidden />
          {t('settings.placeholderTitle')}
        </CardTitle>
        <CardDescription>
          {t('settings.placeholderDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  )
}
