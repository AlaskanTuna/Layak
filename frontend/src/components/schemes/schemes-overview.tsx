import { ArrowUpRight, Coins, Compass, HeartHandshake, Landmark, Scale, type LucideIcon } from 'lucide-react'

type InScopeScheme = {
  id: string
  category: string
  icon: LucideIcon
  agency: string
  name: string
  summary: string
  upsideRm: string
  formLabel: string
  portalUrl: string
}

const IN_SCOPE: InScopeScheme[] = [
  {
    id: 'str-2026',
    category: 'Cash Transfer',
    icon: Coins,
    agency: 'Treasury Malaysia',
    name: 'STR 2026',
    summary:
      'Sumbangan Tunai Rahmah — household and individual tiers based on per-capita income and household size.',
    upsideRm: '2,500.00',
    formLabel: 'Form BK-01',
    portalUrl: 'https://bantuantunai.hasil.gov.my'
  },
  {
    id: 'jkm-warga-emas',
    category: 'Welfare',
    icon: HeartHandshake,
    agency: 'JKM',
    name: 'JKM18 · Warga Emas',
    summary:
      'Monthly RM 600 payment for a qualifying elderly dependant (aged 60+) in low-income households.',
    upsideRm: '7,200.00',
    formLabel: 'Form JKM18',
    portalUrl: 'https://www.jkm.gov.my'
  },
  {
    id: 'lhdn-form-b',
    category: 'Tax Relief',
    icon: Scale,
    agency: 'LHDN',
    name: 'LHDN Form B · YA2025 reliefs',
    summary:
      'Five self-employed reliefs: individual, spouse exemption, per-child, medical, and lifestyle.',
    upsideRm: '4,500.00',
    formLabel: 'Form B',
    portalUrl: 'https://mytax.hasil.gov.my'
  }
]

type ComingScheme = {
  name: string
  agency: string
  summary: string
}

const COMING_V2: ComingScheme[] = [
  { name: 'i-Saraan', agency: 'EPF', summary: 'Self-employed EPF matching contribution.' },
  { name: 'PERKESO SKSPS', agency: 'PERKESO', summary: 'Self-employed social security scheme.' },
  { name: 'MyKasih', agency: 'MyKasih Foundation', summary: 'Cashless food aid programme.' },
  { name: 'eKasih', agency: 'ICU JPM', summary: 'National poor-household registry.' },
  { name: 'SARA claim', agency: 'LHDN', summary: 'Alternate tax-relief pathway.' }
]

function StatsRow({ inScope, coming }: { inScope: number; coming: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        <span className="font-semibold text-foreground tabular-nums">{inScope}</span>
        <span>in scope</span>
      </span>
      <span aria-hidden className="opacity-40">
        ·
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/40" />
        <span className="font-semibold text-foreground tabular-nums">{coming}</span>
        <span>coming in v2</span>
      </span>
    </div>
  )
}

function InScopeCard({ scheme }: { scheme: InScopeScheme }) {
  const Icon = scheme.icon
  return (
    <article className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/35">
      <div className="flex items-center justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary">{scheme.category}</span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{scheme.agency}</p>
        <h3 className="font-heading text-xl font-semibold tracking-tight">{scheme.name}</h3>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{scheme.summary}</p>
      <div className="flex flex-col gap-0.5 rounded-lg border border-dashed border-primary/25 bg-primary/5 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Typical upside</p>
        <p className="font-heading tabular-nums">
          <span className="text-sm font-normal text-muted-foreground">Up to RM</span>{' '}
          <span className="text-xl font-semibold text-primary">{scheme.upsideRm}</span>
          <span className="ml-1 text-xs font-normal text-muted-foreground">/ year</span>
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {scheme.formLabel}
        </span>
        <a
          href={scheme.portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
        >
          Agency portal
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </article>
  )
}

function ComingCard({ scheme }: { scheme: ComingScheme }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-dashed border-border bg-card/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading text-sm font-semibold">{scheme.name}</p>
        <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{scheme.agency}</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{scheme.summary}</p>
    </div>
  )
}

export function SchemesOverview() {
  return (
    <div className="flex flex-col gap-8">
      <StatsRow inScope={IN_SCOPE.length} coming={COMING_V2.length} />

      <section className="flex flex-col gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">In scope · this build</p>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {IN_SCOPE.map(scheme => (
            <li key={scheme.id} className="h-full">
              <InScopeCard scheme={scheme} />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Coming in v2</p>
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/70">
            <span className="font-semibold text-foreground tabular-nums">{COMING_V2.length}</span> schemes
          </span>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {COMING_V2.map(scheme => (
            <li key={scheme.name}>
              <ComingCard scheme={scheme} />
            </li>
          ))}
        </ul>
      </section>

      <aside className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-6">
        <div className="flex items-center gap-2">
          <Compass className="size-4 text-primary" aria-hidden />
          <h3 className="font-heading text-sm font-semibold tracking-tight">How we pick what to support</h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Layak prioritises schemes with publicly-documented thresholds, open application portals, and high real-world
          upside for low-to-middle-income Malaysians. Each rule we support is backed by a citable source — either a
          government PR document, gazetted form, or scheme brochure — so every RM figure in your evaluation traces back
          to a specific page.
        </p>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <Landmark className="size-3.5" aria-hidden />
          <span>Not affiliated with LHDN, JKM, Treasury, or any other Malaysian government body.</span>
        </div>
      </aside>
    </div>
  )
}
