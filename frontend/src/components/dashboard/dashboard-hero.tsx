'use client'

import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/components/layout/page-heading'

type Props = {
  name?: string
}

export function DashboardHero({ name }: Props) {
  const { t } = useTranslation()
  const greeting = name ? t('dashboard.hero.greetingWithName', { name }) : t('dashboard.hero.greeting')
  return (
    <PageHeading
      eyebrow={t('dashboard.hero.eyebrow')}
      title={greeting}
      description={t('dashboard.hero.description')}
    />
  )
}
