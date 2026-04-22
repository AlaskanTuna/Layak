'use client'

import Link from 'next/link'
import { ArrowRight, FileText, ListChecks, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  canReviewMatches: boolean
  canReviewPacket: boolean
}

export function ResultsActionRail({ canReviewMatches, canReviewPacket }: Props) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          {t('evaluation.results.actions.eyebrow')}
        </p>
        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {t('evaluation.results.actions.title')}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('evaluation.results.actions.description')}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ActionCard
          icon={<ListChecks className="size-4" aria-hidden />}
          title={t('evaluation.results.actions.reviewMatchesTitle')}
          description={t('evaluation.results.actions.reviewMatchesBody')}
          action={
            canReviewMatches ? (
              <Button render={<a href="#matched-schemes" />} variant="outline">
                {t('evaluation.results.actions.reviewMatchesCta')}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">{t('evaluation.results.actions.reviewMatchesEmpty')}</p>
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
              <Button render={<a href="#draft-packet" />}>
                {t('evaluation.results.actions.reviewPacketCta')}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">{t('evaluation.results.actions.reviewPacketEmpty')}</p>
            )
          }
        />
        <ActionCard
          icon={<ArrowRight className="size-4" aria-hidden />}
          title={t('evaluation.results.actions.startAnotherTitle')}
          description={t('evaluation.results.actions.startAnotherBody')}
          action={
            <Button render={<Link href="/dashboard/evaluation/upload" />} variant="outline">
              {t('evaluation.results.actions.startAnotherCta')}
            </Button>
          }
        />
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        <AlertTitle>{t('evaluation.results.deadlineTitle')}</AlertTitle>
        <AlertDescription>{t('evaluation.results.deadlineBody')}</AlertDescription>
      </Alert>
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
  return (
    <Card className={emphasized ? 'border-primary/25 bg-primary/5' : undefined}>
      <CardHeader className="gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="flex">{action}</div>
      </CardContent>
    </Card>
  )
}
