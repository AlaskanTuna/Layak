'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { FileCheck2, ShieldCheck, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function LandingHero() {
  const { t } = useTranslation()
  const heroImageRef = useRef<HTMLImageElement>(null)

  // Scroll-driven zoom + blur on the hero photograph (SolarSim mechanic).
  // rAF-batched, with a small delta gate so we don't thrash style writes.
  useEffect(() => {
    let raf = 0
    let lastBlur = -1

    const update = () => {
      raf = 0
      const image = heroImageRef.current
      if (!image) return
      const nextBlur = Math.min(14, window.scrollY / 40)
      if (Math.abs(nextBlur - lastBlur) < 0.1) return
      lastBlur = nextBlur
      image.style.filter = `blur(${nextBlur.toFixed(1)}px)`
      image.style.transform = nextBlur > 0 ? `scale(${(1 + nextBlur * 0.006).toFixed(3)})` : 'scale(1)'
    }

    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background">
      {/* Background photograph — pinned right, masked on left */}
      <div className="pointer-events-none absolute inset-0">
        <Image
          ref={heroImageRef}
          src="/marketing/hero-civic-glow.webp"
          alt=""
          aria-hidden
          fill
          priority
          className="object-cover object-[72%_center] will-change-[filter,transform] transition-none lg:object-[68%_center]"
          style={{ filter: 'blur(0px)', transform: 'scale(1)', transformOrigin: 'center' }}
        />
        <div className="absolute inset-0 hero-mask-light" />
        <div className="absolute inset-x-0 bottom-0 h-40 hero-bottom-fade" />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-4 pb-16 pt-[calc(var(--topbar-height)+3rem)] sm:px-6 md:gap-14 md:pt-[calc(var(--topbar-height)+4rem)] lg:grid-cols-12 lg:pb-20 lg:pt-[calc(var(--topbar-height)+4rem)]">
        {/* ── Left column: glass editorial card ─────────────────────────── */}
        <div className="lg:col-span-7 xl:col-span-7">
          <div className="fade-rise glass-card-paper relative rounded-[28px] p-7 sm:p-9 md:p-11">
            <h1 className="font-heading text-[42px] font-semibold leading-[1.02] tracking-[-0.02em] text-balance text-foreground sm:text-[54px] md:text-[64px] lg:text-[68px]">
              {t('marketing.hero.headlinePart1', 'Know every Malaysian scheme')}{' '}
              <span className="relative inline-block whitespace-nowrap text-[color:var(--hibiscus)]">
                you qualify for
                <svg
                  aria-hidden
                  viewBox="0 0 320 12"
                  preserveAspectRatio="none"
                  className="absolute -bottom-2 left-0 h-2 w-full text-[color:var(--hibiscus)]/45"
                >
                  <path
                    d="M2 8 C 70 2, 140 11, 210 5 S 300 9, 318 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <br />
              <span className="text-foreground/70">in three uploads.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-[1.65] text-foreground/72 sm:text-[17px]">
              {t(
                'marketing.hero.description',
                'Layak reads your MyKad, payslip, and utility bill, then runs a five-step agent pipeline to match you against government schemes — STR, JKM Warga Emas, LHDN Form B reliefs, and more. Every number cites a source page.'
              )}
            </p>

            {/* Meta row — green-dot quick proof */}
            <div className="mt-9 grid grid-cols-1 gap-3 border-t border-foreground/10 pt-6 sm:grid-cols-3">
              <MetaItem
                icon={<Sparkles className="size-3.5" aria-hidden />}
                label={t('marketing.hero.metaFree', 'Free · 5 evals / day')}
              />
              <MetaItem
                icon={<FileCheck2 className="size-3.5" aria-hidden />}
                label={t('marketing.hero.metaDrafts', 'Drafts only · you submit')}
              />
              <MetaItem
                icon={<ShieldCheck className="size-3.5" aria-hidden />}
                label={t('marketing.hero.metaPdpa', 'PDPA-compliant · IC redacted')}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MetaItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex size-5 items-center justify-center rounded-full bg-[color:var(--forest)]/12 text-[color:var(--forest)]">
        {icon}
      </span>
      <span className="mono-caption text-[10.5px] text-foreground/65">{label}</span>
    </div>
  )
}

