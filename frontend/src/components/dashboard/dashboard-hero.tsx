'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeading } from '@/components/layout/page-heading'

type Props = {
  name?: string
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening'

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

export function DashboardHero({ name }: Props) {
  const { t } = useTranslation()
  // Default 'morning' on first render so SSR + initial client render agree;
  // useEffect re-syncs to the user's actual local time after hydration.
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeOfDay(getTimeOfDay())
  }, [])

  const greeting = name ? t(`dashboard.hero.${timeOfDay}WithName`, { name }) : t(`dashboard.hero.${timeOfDay}`)
  const subtitle = t(`dashboard.hero.subtitle.${timeOfDay}`)

  return <PageHeading eyebrow={t('dashboard.hero.eyebrow')} title={greeting} description={subtitle} />
}
