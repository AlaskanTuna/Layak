import { SchemeCard } from '@/components/evaluation/scheme-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SchemeMatch } from '@/lib/agent-types'

type Props = {
  matches: SchemeMatch[]
  totalAnnualRm: number | null
}

// Mirrored verbatim from docs/prd.md FR-6 AC and §6.2.
const OUT_OF_SCOPE_SCHEMES: { name: string; agency: string }[] = [
  { name: 'i-Saraan', agency: 'EPF' },
  { name: 'PERKESO SKSPS', agency: 'PERKESO' },
  { name: 'MyKasih', agency: 'MyKasih Foundation' },
  { name: 'eKasih', agency: 'ICU JPM' },
  { name: 'PADU sync', agency: 'ICU JPM' },
  { name: 'State-level aid (Kita Selangor, Penang elderly)', agency: 'State government' },
  { name: 'SARA claim flow', agency: 'LHDN' },
  { name: 'Appeal workflow (BK-02 / BK-05 / JKM20)', agency: 'LHDN / JKM' }
]

function formatRm(value: number): string {
  return `RM${value.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
}

export function RankedList({ matches, totalAnnualRm }: Props) {
  const qualifying = matches.filter(m => m.qualifies).sort((a, b) => b.annual_rm - a.annual_rm)
  const displayTotal = totalAnnualRm ?? qualifying.reduce((acc, m) => acc + m.annual_rm, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Total annual upside</p>
        <p className="font-heading text-2xl font-semibold text-foreground">{formatRm(displayTotal)}</p>
        <p className="text-xs text-muted-foreground">
          Across {qualifying.length} scheme{qualifying.length === 1 ? '' : 's'}. Figures are estimates — the agency
          makes the final determination on application.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {qualifying.map(match => (
          <SchemeCard key={match.scheme_id} match={match} />
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Checking… (v2) — out of scope for this prototype
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {OUT_OF_SCOPE_SCHEMES.map(scheme => (
            <Card key={scheme.name} className="opacity-60">
              <CardHeader>
                <CardTitle className="text-sm">{scheme.name}</CardTitle>
                <CardDescription className="text-xs">{scheme.agency}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs italic text-muted-foreground">Checking… (v2)</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
