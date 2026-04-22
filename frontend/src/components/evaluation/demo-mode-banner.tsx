'use client'

import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useEvaluation } from '@/components/evaluation/evaluation-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/**
 * Persona-aware demo banner. Reads `demoPersona` from the evaluation
 * provider so the copy matches whichever sample-load button the user
 * clicked ("gig driver Aisyah" vs "salaried teacher Farhan"). Falls back
 * to the Aisyah description on legacy call sites that set `isDemoMode`
 * without naming a persona — kept for safety, shouldn't fire in practice.
 */
export function DemoModeBanner() {
  const { t } = useTranslation()
  const { demoPersona } = useEvaluation()
  const persona = demoPersona ?? 'aisyah'
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <Sparkles className="size-4" aria-hidden />
      <AlertTitle>{t('evaluation.demo.title')}</AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        {t(`evaluation.demo.description_${persona}`)}
      </AlertDescription>
    </Alert>
  )
}
