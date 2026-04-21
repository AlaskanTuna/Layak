import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

import { QuotaMeter } from '@/components/dashboard/quota-meter'
import { PageHeading } from '@/components/layout/page-heading'
import { Button } from '@/components/ui/button'

type Props = {
  name?: string
}

export function DashboardHero({ name }: Props) {
  const greeting = name ? `Welcome back, ${name}.` : 'Welcome back.'
  return (
    <PageHeading
      eyebrow={
        <>
          <ShieldCheck className="size-3.5" aria-hidden />
          Dashboard
        </>
      }
      title={greeting}
      description="Your civic profile is up to date. Layak reviews your current situation against the latest 2026 government schemes — STR, JKM Warga Emas, LHDN Form B reliefs. Takes about 4 minutes."
    >
      <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button render={<Link href="/dashboard/evaluation/upload" />} size="lg">
          Start evaluation
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
        <QuotaMeter />
      </div>
    </PageHeading>
  )
}
