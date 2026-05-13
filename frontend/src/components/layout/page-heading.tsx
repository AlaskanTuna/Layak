import type { ReactNode } from 'react'

type Props = {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
  illustration?: string
  /** Extra Tailwind classes applied to the optional illustration `<img>`.
   * Useful for page-specific offsets without forking the whole layout. */
  illustrationClassName?: string
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  children,
  illustration,
  illustrationClassName
}: Props) {
  return (
    <section className="paper-card relative isolate overflow-hidden rounded-[20px] p-6 sm:p-8">
      {/* Subtle grid texture — civic-document flair */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />
      {/* Hibiscus tab — left-edge editorial register mark */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-6 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70 sm:inset-y-8"
      />
      {/* Optional decorative illustration — sits in the bottom-right corner.
          No fade overlay by design; the topcard is wide enough that the title
          column never reaches into the illustration. Hidden on the smallest
          screens where it would crowd the content. */}
      {illustration && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={illustration}
          alt=""
          aria-hidden
          className={`pointer-events-none absolute -right-2 -bottom-2 hidden size-28 select-none opacity-95 sm:right-4 sm:bottom-4 sm:block sm:size-36 lg:size-44 ${
            illustrationClassName ?? ''
          }`}
          loading="lazy"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
      )}

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:max-w-2xl">
          {eyebrow && <p className="mono-caption flex items-center gap-1.5 text-foreground/55">{eyebrow}</p>}
          <h1 className="font-heading text-3xl font-semibold leading-[1.05] tracking-[-0.015em] text-balance sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="text-[14.5px] leading-[1.6] text-foreground/68 sm:text-[15.5px]">{description}</p>
          )}
          {children}
        </div>
        {action && <div className="z-10 flex shrink-0 self-start">{action}</div>}
      </div>
    </section>
  )
}
