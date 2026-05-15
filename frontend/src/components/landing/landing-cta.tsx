'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

type FaqItem = {
  docCode: string
  question: string
  body: string
}

/** Hard-coded English fallback for `marketing.cta.faqs`. i18next returns
 *  this when the locale catalog hasn't loaded yet or the array key is
 *  missing — keeps the FAQ deck deterministic on a cold mount. */
const FAQS_FALLBACK: FaqItem[] = [
  {
    docCode: 'FAQ-01',
    question: 'Will Layak file my application with the agency?',
    body: 'No. Every output is a draft watermarked "DRAFT — NOT SUBMITTED." You review the packet, then lodge it yourself via LHDN, JKM, or the relevant agency portal. Layak never touches a government submission endpoint.'
  },
  {
    docCode: 'FAQ-02',
    question: 'Which schemes does Layak cover today?',
    body: 'Layak currently tracks 20 scheme entries across cash aid, welfare, education, healthcare, tax relief, retirement, subsidy credits, and required contributions. Eligibility and amounts come from deterministic rules; Vertex AI Search grounds the citations where available.'
  },
  {
    docCode: 'FAQ-03',
    question: 'What documents do I need to upload?',
    body: 'Three: a MyKad (front side), one recent payslip or income screenshot, and one utility bill for proof of address. Synthetic samples work for testing — every demo asset carries a "SYNTHETIC — FOR DEMO ONLY" watermark.'
  },
  {
    docCode: 'FAQ-04',
    question: 'How safe is my personal data?',
    body: 'Manual-entry users supply only age, income, household composition, and address — Layak collects no IC information at all. Upload-path users have their MyKad image processed transiently by Gemini in request-scope memory; no IC information is retained on the persisted profile. The structured profile we keep in Firestore drives chat handoff and packet regeneration. No raw documents in logs.'
  },
  {
    docCode: 'FAQ-05',
    question: 'How accurate are the figures Layak shows?',
    body: 'Eligibility and amount logic is deterministic. Each match carries source citations, with Vertex AI Search used for primary grounding when available and cached agency citations as fallback. The agency still makes the final call on every application.'
  },
  {
    docCode: 'FAQ-06',
    question: 'How long does the whole pipeline take?',
    body: 'Under a minute end-to-end. The six steps — extract, classify, match, strategy, compute, generate — stream live to the UI so you watch the agent reason instead of staring at a spinner.'
  }
]

export function LandingCta() {
  const { t } = useTranslation()

  return (
    <section className="relative overflow-hidden border-t border-foreground/10 bg-background py-20 lg:py-28">
      {/* Decorative editorial register marks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-px bg-foreground/10 lg:block" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-px bg-foreground/10 lg:block" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-14">
        {/* Left — copy */}
        <div className="lg:col-span-7">
          <div className="mono-caption text-[color:var(--hibiscus)]">
            {t('marketing.cta.eyebrow', '05 — Take it for a spin')}
          </div>
          <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.04] tracking-[-0.02em] sm:text-5xl lg:text-[60px]">
            {t('marketing.cta.headline', 'Ready to see what you qualify for?')}
          </h2>
          <p className="mt-6 max-w-xl text-base leading-[1.65] text-foreground/65 sm:text-[17px]">
            {t(
              'marketing.cta.description',
              'Sign in with Google is one click — no account setup needed. Upload your documents, get a ranked list with citations, walk away with watermarked draft packets. Takes under a minute.'
            )}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Button
              render={<Link href="/sign-in" />}
              size="lg"
              className="group h-12 gap-2 rounded-full bg-[color:var(--hibiscus)] px-7 text-[15px] font-medium text-[color:var(--hibiscus-foreground)] shadow-[0_18px_40px_-18px_color-mix(in_oklch,var(--hibiscus)_70%,transparent)] hover:bg-[color:var(--hibiscus)]/92"
            >
              {t('marketing.hero.getStarted', 'Get started')}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Button>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/75 underline decoration-foreground/25 decoration-2 underline-offset-[6px] transition-colors hover:text-foreground hover:decoration-[color:var(--hibiscus)]"
            >
              {t('marketing.cta.seePipeline', 'See the pipeline')}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Right — paper-shuffle FAQ deck */}
        <aside className="lg:col-span-5">
          <FaqShuffleDeck />
        </aside>
      </div>
    </section>
  )
}

function FaqShuffleDeck() {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)
  // i18next returns the array shape when `returnObjects: true`. If the
  // catalog hasn't loaded yet (e.g. first paint), the typed default kicks
  // in so the deck never renders empty. Cast guards against the runtime
  // contract that t() returns string by default — the override is safe
  // because the i18n catalog has been hand-validated to carry an array.
  const faqs =
    (t('marketing.cta.faqs', {
      returnObjects: true,
      defaultValue: FAQS_FALLBACK
    }) as FaqItem[]) || FAQS_FALLBACK
  const total = faqs.length

  const next = () => setActive((i) => (i + 1) % total)
  const prev = () => setActive((i) => (i - 1 + total) % total)

  return (
    <div className="relative">
      {/* Header strip */}
      <div className="mb-3 flex items-center justify-between">
        <span className="mono-caption text-foreground/55">
          {t('marketing.cta.faqHeader', 'Common questions')} · {String(active + 1).padStart(2, '0')} /{' '}
          {String(total).padStart(2, '0')}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prev}
            aria-label={t('common.aria.previousQuestion', 'Previous question')}
            className="grid size-8 cursor-pointer place-items-center rounded-full border border-foreground/15 bg-background text-foreground/70 transition-colors hover:border-foreground/35 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={t('common.aria.nextQuestion', 'Next question')}
            className="grid size-8 cursor-pointer place-items-center rounded-full border border-foreground/15 bg-background text-foreground/70 transition-colors hover:border-foreground/35 hover:text-foreground"
          >
            <ArrowRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Card stack */}
      <div className="relative h-[320px] pt-4 sm:h-[300px]">
        {faqs.map((faq, i) => {
          // offset = how many shuffles back from the top this card is
          const offset = (i - active + total) % total
          const isTop = offset === 0
          // Cards beyond the visible 3-deep stack hide behind
          const visible = offset < 3
          // Back cards translate UP and scale down — top edges peek above
          // the front card while their bottoms stay hidden under it.
          const ty = -offset * 7
          const scale = 1 - offset * 0.035
          // Alternate small left/right tilt so the deck feels hand-stacked
          const rot = offset === 0 ? 0 : offset === 1 ? -1.6 : 1.4
          const opacity = visible ? 1 - offset * 0.22 : 0

          return (
            <button
              key={faq.docCode}
              type="button"
              onClick={isTop ? next : undefined}
              tabIndex={isTop ? 0 : -1}
              aria-hidden={!isTop}
              className={`paper-card absolute inset-x-0 left-0 right-0 top-0 cursor-pointer rounded-[18px] p-6 text-left transition-all duration-500 ease-[cubic-bezier(0.2,0.7,0.1,1)] ${
                isTop
                  ? 'hover:shadow-[0_36px_80px_-30px_color-mix(in_oklch,var(--ink)_36%,transparent)]'
                  : 'pointer-events-none'
              }`}
              style={{
                background: 'var(--paper)',
                transform: `translateY(${ty}px) rotate(${rot}deg) scale(${scale})`,
                opacity,
                zIndex: total - offset,
                transformOrigin: '50% 100%'
              }}
            >
              {/* Doc-style header */}
              <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                <span className="mono-caption text-foreground/55">{faq.docCode}</span>
                <span className="mono-caption text-[color:var(--hibiscus)]">FAQ</span>
              </div>

              {/* Question */}
              <h3 className="mt-4 font-heading text-[19px] font-semibold leading-[1.25] tracking-[-0.005em] text-foreground sm:text-[20px]">
                {faq.question}
              </h3>

              {/* Body */}
              <p className="mt-3 text-[13.5px] leading-[1.6] text-foreground/70">{faq.body}</p>

              {/* Footer */}
              <div className="absolute inset-x-6 bottom-4 flex items-center justify-end">
                <span className="draft-stamp text-[9px]">FILED</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Index dots */}
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {faqs.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={t('common.aria.goToQuestion', 'Go to question {{n}}', { n: i + 1 })}
            className={`h-1 cursor-pointer rounded-full transition-all duration-300 ${
              i === active ? 'w-8 bg-[color:var(--hibiscus)]' : 'w-3 bg-foreground/20 hover:bg-foreground/35'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
