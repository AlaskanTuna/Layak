import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { SchemeMatch } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

type Props = {
  matches: SchemeMatch[]
}

function formatRm(value: number): string {
  return `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function categoryFor(match: SchemeMatch): string {
  const agency = match.agency.toLowerCase()
  const id = match.scheme_id.toLowerCase()
  if (id.includes('str') || agency.includes('treasury')) return 'Cash Transfer'
  if (agency.includes('lhdn')) return 'Tax Relief'
  if (agency.includes('jkm')) return 'Welfare'
  return 'Assistance'
}

export function SchemeCardGrid({ matches }: Props) {
  const qualifying = matches.filter(m => m.qualifies).sort((a, b) => b.annual_rm - a.annual_rm)

  if (qualifying.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No qualifying schemes found for your profile in this build.
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Eligible Schemes</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {qualifying.length} {qualifying.length === 1 ? 'match' : 'matches'}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {qualifying.map((match, index) => {
          const isTop = index === 0
          const category = categoryFor(match)
          return (
            <li
              key={match.scheme_id}
              className={cn(
                'flex flex-col gap-4 rounded-xl border p-5 transition-colors',
                isTop ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
              )}
            >
              <header className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">{category}</span>
                <h3 className="font-heading text-base font-semibold tracking-tight">{match.scheme_name}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{match.summary}</p>
              </header>

              <div className="flex flex-1 flex-col gap-1 rounded-md border border-border/60 bg-background/60 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Why you qualify
                </p>
                <p className="text-xs leading-relaxed">{match.why_qualify}</p>
              </div>

              <footer className="flex items-end justify-between gap-3">
                <div className="flex flex-col">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Est. Value</p>
                  <p className="font-heading text-sm font-semibold">{formatRm(match.annual_rm)}</p>
                </div>
                <Button
                  render={<a href={match.portal_url} target="_blank" rel="noopener noreferrer" />}
                  size="sm"
                  variant={isTop ? 'default' : 'outline'}
                >
                  Start app
                  <ArrowRight className="ml-1 size-3.5" aria-hidden />
                </Button>
              </footer>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
