'use client'

import { CircleHelp } from 'lucide-react'

import { cn } from '@/lib/utils'

type Props = {
  content: string
  label: string
  className?: string
}

export function InfoTooltip({ content, label, className }: Props) {
  return (
    <span className={cn('group/tooltip relative inline-flex z-10 group-hover/tooltip:z-50 group-focus-within/tooltip:z-50', className)}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
      >
        <CircleHelp className="size-3.5" aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-1/2 left-full z-[60] ml-2 hidden w-56 -translate-y-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg group-hover/tooltip:block group-focus-within/tooltip:block"
      >
        {content}
      </span>
    </span>
  )
}
