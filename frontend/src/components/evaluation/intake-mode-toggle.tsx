'use client'

import { FileText, KeyboardIcon, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export type IntakeMode = 'upload' | 'manual'

type Props = {
  value: IntakeMode
  onChange: (mode: IntakeMode) => void
  disabled?: boolean
}

/**
 * Newspaper-style section tabs above the intake widgets.
 *
 * Centered text + icon labels with a 2px hibiscus underline on the active
 * entry — picks up the editorial-civic identity of the rest of the app and
 * shed the chunky segmented-control chrome that competed with the page
 * heading directly above. A page-wide hairline underneath catches the
 * active rule so it reads as a tab cutting into a section line, classic
 * newspaper nav.
 */
export function IntakeModeToggle({ value, onChange, disabled = false }: Props) {
  const { t } = useTranslation()
  return (
    <div className="border-b border-foreground/10">
      <div role="radiogroup" aria-label={t('evaluation.intake.aria')} className="flex justify-center gap-10">
        <ToggleTab
          icon={FileText}
          label={t('evaluation.intake.upload')}
          active={value === 'upload'}
          disabled={disabled}
          onClick={() => onChange('upload')}
        />
        <ToggleTab
          icon={KeyboardIcon}
          label={t('evaluation.intake.manual')}
          active={value === 'manual'}
          disabled={disabled}
          onClick={() => onChange('manual')}
        />
      </div>
    </div>
  )
}

type ToggleTabProps = {
  icon: LucideIcon
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
}

function ToggleTab({ icon: Icon, label, active, disabled, onClick }: ToggleTabProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group relative inline-flex cursor-pointer items-center gap-2 py-3 text-[13.5px] font-medium tracking-tight transition-colors',
        active ? 'text-foreground' : 'text-foreground/55 hover:text-foreground',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
      {active && (
        <span
          aria-hidden
          className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full bg-[color:var(--hibiscus)]"
        />
      )}
    </button>
  )
}
