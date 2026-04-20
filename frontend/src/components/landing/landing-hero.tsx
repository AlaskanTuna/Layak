import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function LandingHero() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-16 sm:py-24 md:px-6">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
        <ShieldCheck className="size-3.5" aria-hidden />
        DRAFT packets only — you stay in control
      </span>
      <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
        Know every Malaysian scheme <br className="hidden sm:inline" />
        you qualify for — in one upload.
      </h1>
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Layak reads your MyKad, payslip, and utility bill, then runs a five-step agent pipeline to match you against
        government schemes — STR, JKM Warga Emas, LHDN Form B reliefs, and more. Every number cites a source page.
        Every packet is a DRAFT you lodge yourself.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button render={<Link href="/sign-in" />} size="lg">
          Get started
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
        <Button render={<Link href="/dashboard/how-it-works" />} size="lg" variant="outline">
          How it works
        </Button>
      </div>
    </section>
  )
}
