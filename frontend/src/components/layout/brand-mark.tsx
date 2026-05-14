import Image from 'next/image'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  size?: 'sm' | 'md'
}

export function BrandMark({ className, size = 'md' }: Props) {
  const box = size === 'sm' ? 28 : 32
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md',
        size === 'sm' ? 'size-7' : 'size-8',
        className
      )}
    >
      {/* `alt` carries only the brand mark — "Layak" is universal across en/ms/zh,
          and the surrounding header link already supplies the localized
          `common.aria.layakHome` so screen readers get the localized intent. */}
      <Image src="/layak-logo.png" alt="Layak" width={box} height={box} className="object-cover" />
    </div>
  )
}
