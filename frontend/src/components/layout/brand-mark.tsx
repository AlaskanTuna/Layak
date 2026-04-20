import { Hexagon } from 'lucide-react'

import { cn } from '@/lib/utils'

type Props = {
  className?: string
  size?: 'sm' | 'md'
}

export function BrandMark({ className, size = 'md' }: Props) {
  const box = size === 'sm' ? 'size-7' : 'size-8'
  const icon = size === 'sm' ? 'size-3.5' : 'size-4'
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground',
        box,
        className
      )}
    >
      <Hexagon className={icon} fill="currentColor" aria-hidden />
    </div>
  )
}
