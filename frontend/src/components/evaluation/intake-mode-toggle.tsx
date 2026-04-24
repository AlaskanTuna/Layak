'use client'

import { FileText, KeyboardIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type IntakeMode = 'upload' | 'manual'

type Props = {
  value: IntakeMode
  onChange: (mode: IntakeMode) => void
  disabled?: boolean
}

/**
 * Segmented toggle above the intake widgets.
 *
 * Swaps between the three-document upload path (default, Gemini OCR) and the
 * privacy-first manual form (structured input, no OCR). The state is lifted to
 * the parent so the parent renders UploadWidget or ManualEntryForm.
 */
export function IntakeModeToggle({ value, onChange, disabled = false }: Props) {
  const { t } = useTranslation()
  return (
    <div
      role="radiogroup"
      aria-label={t('evaluation.intake.aria')}
      className="grid w-full grid-cols-2 gap-1 rounded-md border border-border bg-muted/30 p-1"
    >
      <ToggleButton
        icon={<FileText className="size-4" aria-hidden />}
        label={t('evaluation.intake.upload')}
        active={value === 'upload'}
        disabled={disabled}
        onClick={() => onChange('upload')}
      />
      <ToggleButton
        icon={<KeyboardIcon className="size-4" aria-hidden />}
        label={t('evaluation.intake.manual')}
        active={value === 'manual'}
        disabled={disabled}
        onClick={() => onChange('manual')}
      />
    </div>
  )
}

function ToggleButton({
  icon,
  label,
  active,
  disabled,
  onClick
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      role="radio"
      aria-checked={active}
      variant={active ? 'default' : 'ghost'}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn('w-full gap-1.5', !active && 'text-muted-foreground hover:text-foreground')}
    >
      {icon}
      {label}
    </Button>
  )
}
