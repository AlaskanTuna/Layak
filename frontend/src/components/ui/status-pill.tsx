import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const statusPillVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]',
  {
    variants: {
      tone: {
        processing: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
        approved: 'border-primary/30 bg-primary/10 text-primary',
        draft: 'border-border bg-muted text-muted-foreground',
        submitted: 'border-primary/20 bg-primary/5 text-primary/80',
        rejected: 'border-destructive/30 bg-destructive/10 text-destructive'
      }
    },
    defaultVariants: { tone: 'draft' }
  }
)

type Props = React.ComponentProps<'span'> & VariantProps<typeof statusPillVariants>

export function StatusPill({ className, tone, children, ...props }: Props) {
  return (
    <span className={cn(statusPillVariants({ tone }), className)} {...props}>
      {children}
    </span>
  )
}
