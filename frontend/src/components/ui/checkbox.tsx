'use client'

import * as React from 'react'
import { Check, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'

type CheckboxState = boolean | 'indeterminate'

type Props = Omit<React.ComponentProps<'button'>, 'onChange'> & {
  checked?: CheckboxState
  onCheckedChange?: (checked: boolean) => void
}

export function Checkbox({
  checked = false,
  onCheckedChange,
  className,
  disabled,
  ...props
}: Props) {
  const isIndeterminate = checked === 'indeterminate'
  const isChecked = checked === true

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isIndeterminate ? 'mixed' : isChecked}
      data-state={isIndeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked'}
      disabled={disabled}
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-background text-primary-foreground shadow-xs transition-colors outline-none',
        'hover:border-primary/50 hover:bg-muted/70',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      onClick={() => onCheckedChange?.(!isChecked)}
      {...props}
    >
      {isIndeterminate ? <Minus className="size-3" aria-hidden /> : isChecked ? <Check className="size-3" aria-hidden /> : null}
    </button>
  )
}
