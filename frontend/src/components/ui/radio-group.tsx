'use client'

import * as React from 'react'
import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'

import { cn } from '@/lib/utils'

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        'group/radio inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-background shadow-xs transition-colors outline-none',
        'hover:border-primary/50',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40',
        'data-[checked]:border-primary',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="size-2 rounded-full bg-primary opacity-0 transition-opacity group-data-[checked]/radio:opacity-100" />
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
