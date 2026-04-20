import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Scheme = {
  id: string
  name: string
  agency: string
  status: 'live' | 'v2'
  summary: string
}

const SCHEMES: Scheme[] = [
  {
    id: 'str-2026',
    name: 'STR 2026 — Sumbangan Tunai Rahmah',
    agency: 'Treasury Malaysia',
    status: 'live',
    summary: 'Household and individual tiers based on per-capita income and household size.'
  },
  {
    id: 'jkm-warga-emas',
    name: 'JKM18 — Warga Emas',
    agency: 'JKM',
    status: 'live',
    summary: 'Monthly RM600 payment for elderly dependants aged 60+ in qualifying households.'
  },
  {
    id: 'lhdn-form-b',
    name: 'LHDN Form B — YA2025 reliefs',
    agency: 'LHDN',
    status: 'live',
    summary: 'Five self-employed reliefs: individual, spouse, children, medical, lifestyle.'
  },
  { id: 'i-saraan', name: 'i-Saraan', agency: 'EPF', status: 'v2', summary: 'Self-employed EPF matching contribution.' },
  { id: 'perkeso-skspss', name: 'PERKESO SKSPS', agency: 'PERKESO', status: 'v2', summary: 'Self-employed social security scheme.' },
  { id: 'mykasih', name: 'MyKasih', agency: 'MyKasih Foundation', status: 'v2', summary: 'Cashless food aid programme.' },
  { id: 'ekasih', name: 'eKasih', agency: 'ICU JPM', status: 'v2', summary: 'National poor-household registry.' },
  { id: 'sara-claim', name: 'SARA claim flow', agency: 'LHDN', status: 'v2', summary: 'Alternate tax relief pathway.' }
]

export function SchemesList() {
  return (
    <div className="flex flex-col gap-3">
      {SCHEMES.map(scheme => (
        <Card key={scheme.id} className={scheme.status === 'v2' ? 'opacity-60' : undefined}>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle className="text-base">{scheme.name}</CardTitle>
                <CardDescription>{scheme.agency}</CardDescription>
              </div>
              <Badge variant={scheme.status === 'live' ? 'default' : 'outline'} className="shrink-0">
                {scheme.status === 'live' ? 'In scope' : 'v2'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{scheme.summary}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
