import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'

type Props = {
  name?: string
}

export function DashboardHero({ name }: Props) {
  const greeting = name ? `Welcome back, ${name}.` : 'Welcome back.'
  return (
    <section className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent p-6 sm:p-8">
      <div className="flex flex-col gap-3 sm:max-w-2xl">
        <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
          <ShieldCheck className="size-3.5" aria-hidden />
          Dashboard
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{greeting}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your civic profile is up to date. Layak reviews your current situation against the latest 2026 government
          schemes — STR, JKM Warga Emas, LHDN Form B reliefs. Takes about 4 minutes.
        </p>
        <div className="mt-1 flex">
          <Button render={<Link href="/dashboard/evaluation/upload" />} size="lg">
            Start evaluation
            <ArrowRight className="ml-1.5 size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  )
}
