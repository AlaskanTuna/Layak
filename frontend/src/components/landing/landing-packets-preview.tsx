'use client'

import { useTranslation } from 'react-i18next'

const PACKETS = [
  {
    code: 'BK-01',
    title: 'STR 2026 application',
    body: 'Pre-filled household tier · 2 children, 1 elderly',
    upside: 'RM 1,200',
    period: '/ year',
    rotate: -7
  },
  {
    code: 'JKM18',
    title: 'Bantuan Warga Emas',
    body: 'Filed on behalf of dependent father · age 70',
    upside: 'RM 6,000',
    period: '/ year',
    rotate: 0
  },
  {
    code: 'LHDN-B',
    title: 'Form B relief summary',
    body: '5 reliefs identified · YA2025 schedule mapped',
    upside: 'RM 5,108',
    period: '/ year',
    rotate: 7
  }
]

export function LandingPacketsPreview() {
  const { t } = useTranslation()
  return (
    <section
      id="output"
      className="relative overflow-hidden bg-[color:color-mix(in_oklch,var(--ink)_94%,transparent)] py-20 text-[color:color-mix(in_oklch,var(--paper)_94%,transparent)] lg:py-28"
    >
      {/* Subtle grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '36px 36px'
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16">
        {/* Left — copy */}
        <div className="lg:col-span-5">
          <div className="mono-caption text-[color:var(--hibiscus)]">
            {t('marketing.packetsPreview.eyebrow', '03 — What you get')}
          </div>
          <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.04] tracking-[-0.02em] sm:text-5xl lg:text-[52px]">
            {t('marketing.packetsPreview.headlineLine1', 'Watermarked')}
            <br />
            <span className="text-[color:color-mix(in_oklch,var(--paper)_55%,transparent)]">
              {t('marketing.packetsPreview.headlineLine2', 'draft packets,')}
            </span>
            <br />
            {t('marketing.packetsPreview.headlineLine3', 'ready to lodge.')}
          </h2>
          <p className="mt-6 max-w-md text-[15.5px] leading-[1.65] text-[color:color-mix(in_oklch,var(--paper)_72%,transparent)]">
            {t(
              'marketing.packetsPreview.description',
              'Layak never submits on your behalf. You walk away with pre-filled, citation-rich PDFs — review them, then lodge each one yourself via the agency portal.'
            )}
          </p>

          {/* Number callout */}
          <div className="mt-10 border-l-2 border-[color:var(--hibiscus)] pl-5">
            <div className="mono-caption text-[color:color-mix(in_oklch,var(--paper)_60%,transparent)]">
              Sample Match · Aisyah · annual upside
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="display-numeral text-[88px] text-[color:var(--paper)]">12,308</span>
              <div>
                <div className="mono-caption text-[color:color-mix(in_oklch,var(--paper)_70%,transparent)]">
                  MYR
                </div>
                <div className="mono-caption text-[color:var(--forest)]">+ matched schemes</div>
              </div>
            </div>
            <div className="mt-3 mono-caption text-[10px] text-[color:color-mix(in_oklch,var(--paper)_55%,transparent)]">
              Worked end-to-end in 60 seconds.
            </div>
          </div>
        </div>

        {/* Right — packet stack */}
        <div className="relative flex items-center justify-center lg:col-span-7">
          <div className="relative grid w-full max-w-2xl grid-cols-3 gap-4 sm:gap-6">
            {PACKETS.map((p, i) => (
              <PacketCard key={p.code} {...p} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PacketCard({
  code,
  title,
  body,
  upside,
  period,
  rotate,
  index
}: (typeof PACKETS)[number] & { index: number }) {
  return (
    <article
      className="paper-card fade-rise relative aspect-[3/4] rounded-[14px] p-4 text-[color:var(--ink)]"
      style={{
        background: 'var(--paper)',
        transform: `rotate(${rotate}deg) translateY(${index === 1 ? '-12px' : '0'})`,
        animationDelay: `${index * 140}ms`
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[color:var(--ink)]/10 pb-2">
        <span className="mono-caption text-[9px] text-[color:var(--ink)]/55">PACKET · {code}</span>
        <span className="size-1.5 rounded-full bg-[color:var(--hibiscus)]" />
      </div>

      {/* Title */}
      <div className="mt-3 font-heading text-[15px] font-semibold leading-tight text-[color:var(--ink)]">
        {title}
      </div>
      <div className="mt-1.5 text-[11px] leading-[1.4] text-[color:var(--ink)]/60">{body}</div>

      {/* Faux content blocks */}
      <div className="mt-4 space-y-1.5">
        <span className="block h-1.5 rounded-full bg-[color:var(--ink)]/10" />
        <span className="block h-1.5 w-[78%] rounded-full bg-[color:var(--ink)]/10" />
        <span className="block h-1.5 w-[58%] rounded-full bg-[color:var(--ink)]/10" />
        <span className="block h-1.5 w-[88%] rounded-full bg-[color:var(--ink)]/10" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <span className="h-9 rounded-md bg-[color:var(--ink)]/[0.06]" />
        <span className="h-9 rounded-md bg-[color:var(--ink)]/[0.06]" />
      </div>

      {/* Footer numerics */}
      <div className="absolute inset-x-4 bottom-3 flex items-end justify-between">
        <div>
          <div className="mono-caption text-[8.5px] text-[color:var(--ink)]/55">Annual upside</div>
          <div className="font-heading text-[14px] font-bold text-[color:var(--forest)]">
            {upside}
            <span className="ml-1 text-[10px] font-normal text-[color:var(--ink)]/55">{period}</span>
          </div>
        </div>
        <span
          className="rotate-[-6deg] rounded border-2 px-1.5 py-0.5 mono-caption text-[8.5px]"
          style={{ borderColor: 'var(--hibiscus)', color: 'var(--hibiscus)' }}
        >
          DRAFT
        </span>
      </div>
    </article>
  )
}
