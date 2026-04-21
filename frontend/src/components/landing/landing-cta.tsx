import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function LandingCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 py-16 sm:py-20 md:px-6">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Ready to see what you qualify for?
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Sign in with Google is one click — no account setup needed. Three uploads, a ranked list, three draft packets.
          Takes under a minute.
        </p>
        <Button render={<Link href="/sign-in" />} size="lg">
          Get Started
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
      </div>
    </section>
  )
}
