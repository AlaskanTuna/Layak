import Image from 'next/image'

import { cn } from '@/lib/utils'

type Props = {
  className?: string
  size?: 'sm' | 'md'
}

export function BrandMark({ className, size = 'md' }: Props) {
  const box = size === 'sm' ? 'size-7 rounded-2xl' : 'size-9 rounded-[1.35rem]'

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-foreground/10 shadow-[0_12px_24px_color-mix(in_oklch,var(--primary)_20%,transparent)]',
        box,
        className
      )}
    >
      <Image
        src="/brand/layak-logo-mark.png"
        alt=""
        fill
        sizes={size === 'sm' ? '28px' : '36px'}
        className="object-cover"
      />
    </div>
  )
}
