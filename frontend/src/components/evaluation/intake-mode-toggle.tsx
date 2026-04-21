'use client'

import { FileText, KeyboardIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type IntakeMode = 'upload' | 'manual'

type Props = {
  value: IntakeMode
  onChange: (mode: IntakeMode) => void
  disabled?: boolean
}

/**
 * Segmented toggle above the intake widgets (FR-21).
 *
 * Swaps between the three-document upload path (default, Gemini OCR) and the
 * privacy-first manual form (structured input, no OCR). The state is lifted to
 * the parent so the parent renders UploadWidget or ManualEntryForm.
 */
export function IntakeModeToggle({ value, onChange, disabled = false }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Intake method"
      className="inline-flex rounded-md border border-border bg-muted/30 p-1"
    >
      <ToggleButton
        icon={<FileText className="size-4" aria-hidden />}
        label="Upload documents"
        active={value === 'upload'}
        disabled={disabled}
        onClick={() => onChange('upload')}
      />
      <ToggleButton
        icon={<KeyboardIcon className="size-4" aria-hidden />}
        label="Enter manually"
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
      className={cn('gap-1.5', !active && 'text-muted-foreground hover:text-foreground')}
    >
      {icon}
      {label}
    </Button>
  )
}
