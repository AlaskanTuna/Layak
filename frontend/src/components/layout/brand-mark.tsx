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
      <Image 
        src="/layak-logo.png" 
        alt="Layak Logo" 
        width={box} 
        height={box} 
        className="object-cover" 
      />
    </div>
  )
}
