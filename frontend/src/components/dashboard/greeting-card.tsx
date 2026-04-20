'use client'

import { useSyncExternalStore } from 'react'
import { Sparkles } from 'lucide-react'

function timeGreeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function subscribe() {
  return () => {}
}

function getSnapshot(): string {
  return timeGreeting(new Date().getHours())
}

function getServerSnapshot(): string {
  return 'Hello'
}

export function GreetingCard({ name = 'guest' }: { name?: string }) {
  const greeting = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
        <Sparkles className="size-3.5" aria-hidden />
        Today
      </div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        {greeting}, {name}.
      </h1>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Start a new evaluation to see every Malaysian scheme you qualify for, with cited rule provenance and draft
        application packets ready to lodge.
      </p>
    </section>
  )
}
