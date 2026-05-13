'use client'

import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const BULLET_KEYS = ['free', 'drafts', 'trilingual'] as const

export function AuthContextPane() {
  const { t } = useTranslation()
  return (
    <aside
      aria-label={t('auth.context.heading')}
      className="paper-card hidden h-full flex-col justify-center gap-6 rounded-[20px] p-8 lg:flex"
    >
      <div className="flex flex-col gap-2.5">
        <h2 className="font-heading text-[26px] font-semibold leading-[1.15] tracking-tight text-foreground">
          {t('auth.context.heading')}
        </h2>
        <p className="max-w-[38ch] text-[14px] leading-relaxed text-foreground/70">
          {t('auth.context.body')}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {BULLET_KEYS.map((key) => (
          <li key={key} className="flex items-start gap-3 text-[14px] leading-snug text-foreground/80">
            <span
              aria-hidden
              className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--hibiscus)]/14 text-[color:var(--hibiscus)]"
            >
              <Check className="size-3" strokeWidth={2.5} />
            </span>
            <span>{t(`auth.context.bullets.${key}`)}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
