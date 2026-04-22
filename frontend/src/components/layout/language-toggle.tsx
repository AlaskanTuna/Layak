'use client'

import { Check, Languages } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Mirrors `user-menu.tsx`'s manual-dropdown pattern (no shadcn DropdownMenu
// component installed). Button sizing matches `theme-toggle.tsx` so the
// two controls sit flush in the header.
export function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const activeLang = (i18n.language.split('-')[0] as SupportedLanguage) ?? 'en'

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  function handleSelect(code: SupportedLanguage) {
    void i18n.changeLanguage(code)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('common.aria.languageSelector')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(v => !v)}
        className="size-8"
      >
        <Languages className="size-4" aria-hidden />
        <span className="sr-only">{t('common.aria.languageSelector')}</span>
      </Button>
      <div
        role="menu"
        aria-hidden={!isOpen}
        className={cn(
          'absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl',
          'origin-top-right transition-all duration-200',
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        )}
      >
        <div className="p-1">
          {SUPPORTED_LANGUAGES.map(code => {
            const isActive = activeLang === code
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => handleSelect(code)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-card-foreground transition-colors hover:bg-accent/60',
                  isActive && 'font-medium'
                )}
              >
                <span>{LANGUAGE_LABELS[code]}</span>
                {isActive && <Check className="size-4 text-primary" aria-hidden />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
