'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t('common.aria.toggleTheme')}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="size-8"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" aria-hidden />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" aria-hidden />
      <span className="sr-only">{t('common.aria.toggleTheme')}</span>
    </Button>
  )
}
