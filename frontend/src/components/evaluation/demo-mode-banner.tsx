'use client'

import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function DemoModeBanner() {
  const { t } = useTranslation()
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <Sparkles className="size-4" aria-hidden />
      <AlertTitle>{t('evaluation.demo.title')}</AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        {t('evaluation.demo.description')}
      </AlertDescription>
    </Alert>
  )
}
