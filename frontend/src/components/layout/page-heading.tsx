import type { ReactNode } from 'react'

type Props = {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
}

export function PageHeading({ eyebrow, title, description, children }: Props) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:max-w-2xl">
        {eyebrow && (
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {description && (
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        )}
        {children}
      </div>
    </section>
  )
}
