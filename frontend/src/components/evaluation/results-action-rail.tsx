'use client'

import { ArrowRight, FileText, ListChecks, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

type Props = {
  canReviewMatches: boolean
  canReviewPacket: boolean
  onStartAnother: () => void
}

export function ResultsActionRail({ canReviewMatches, canReviewPacket, onStartAnother }: Props) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="mono-caption text-[color:var(--hibiscus)]">{t('evaluation.results.actions.eyebrow')}</p>
        <h2 className="font-heading text-xl font-semibold tracking-tight">{t('evaluation.results.actions.title')}</h2>
        <p className="text-sm leading-relaxed text-foreground/65">{t('evaluation.results.actions.description')}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ActionCard
          icon={<ListChecks className="size-4" aria-hidden />}
          title={t('evaluation.results.actions.reviewMatchesTitle')}
          description={t('evaluation.results.actions.reviewMatchesBody')}
          action={
            canReviewMatches ? (
              <Button render={<a href="#matched-schemes" />} variant="outline" className="rounded-full">
                {t('evaluation.results.actions.reviewMatchesCta')}
              </Button>
            ) : (
              <p className="mono-caption text-foreground/55">{t('evaluation.results.actions.reviewMatchesEmpty')}</p>
            )
          }
        />
        <ActionCard
          icon={<FileText className="size-4" aria-hidden />}
          title={t('evaluation.results.actions.reviewPacketTitle')}
          description={t('evaluation.results.actions.reviewPacketBody')}
          emphasized
          action={
            canReviewPacket ? (
              <Button
                render={<a href="#draft-packet" />}
                className="rounded-full bg-[color:var(--hibiscus)] text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
              >
                {t('evaluation.results.actions.reviewPacketCta')}
              </Button>
            ) : (
              <p className="mono-caption text-foreground/55">{t('evaluation.results.actions.reviewPacketEmpty')}</p>
            )
          }
        />
        <ActionCard
          icon={<ArrowRight className="size-4" aria-hidden />}
          title={t('evaluation.results.actions.startAnotherTitle')}
          description={t('evaluation.results.actions.startAnotherBody')}
          action={
            <Button type="button" variant="outline" onClick={onStartAnother} className="rounded-full">
              {t('evaluation.results.actions.startAnotherCta')}
            </Button>
          }
        />
      </div>

      <div className="paper-card relative isolate overflow-hidden rounded-[14px] p-5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-[color:var(--forest)]/70"
        />
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[color:var(--forest)]" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="mono-caption text-[color:var(--forest)]">Deadline</p>
            <p className="font-heading text-[15px] font-semibold text-foreground">
              {t('evaluation.results.deadlineTitle')}
            </p>
            <p className="text-[13.5px] leading-[1.55] text-foreground/68">
              {t('evaluation.results.deadlineBody')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ActionCard({
  icon,
  title,
  description,
  action,
  emphasized = false
}: {
  icon: React.ReactNode
  title: string
  description: string
  action: React.ReactNode
  emphasized?: boolean
}) {
  const accentColor = emphasized ? 'var(--hibiscus)' : 'var(--primary)'
  return (
    <article className="paper-card relative isolate flex flex-col gap-4 overflow-hidden rounded-[14px] p-5">
      {emphasized && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-5 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70"
        />
      )}
      <div
        className="flex size-9 items-center justify-center rounded-md"
        style={{
          background: `color-mix(in oklch, ${accentColor} 12%, transparent)`,
          color: accentColor
        }}
      >
        {icon}
      </div>
      <h3 className="font-heading text-[15px] font-semibold tracking-tight">{title}</h3>
      <p className="text-sm leading-relaxed text-foreground/65">{description}</p>
      <div className="mt-auto flex">{action}</div>
    </article>
  )
}
