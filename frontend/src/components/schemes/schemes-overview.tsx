'use client'

import {
  ArrowUpRight,
  Baby,
  Coins,
  Compass,
  HeartHandshake,
  Landmark,
  PiggyBank,
  Scale,
  ShieldCheck,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

type SchemeKind = 'upside' | 'required_contribution'

type InScopeScheme = {
  id: string
  categoryKey: string
  icon: LucideIcon
  agency: string
  name: string
  summaryKey: string
  // For `upside` schemes this reads as `Up to RM <upsideRm> / year`. For
  // `required_contribution` schemes (PERKESO SKSPS) it reads as
  // `Annual contribution: RM <upsideRm> / year` so the catalogue card never
  // misleads viewers into thinking they receive the contribution amount.
  upsideRm: string
  formLabel: string
  portalUrl: string
  kind?: SchemeKind
}

// Scheme names, agency names, form IDs, and portal URLs are proper nouns and
// MUST stay source-language — they identify government documents.
const IN_SCOPE: InScopeScheme[] = [
  {
    id: 'str-2026',
    categoryKey: 'schemes.labels.cashTransfer',
    icon: Coins,
    agency: 'Treasury Malaysia',
    name: 'STR 2026',
    summaryKey: 'schemes.str.summary',
    upsideRm: '2,500.00',
    formLabel: 'Form BK-01',
    portalUrl: 'https://bantuantunai.hasil.gov.my'
  },
  {
    id: 'jkm-warga-emas',
    categoryKey: 'schemes.labels.welfare',
    icon: HeartHandshake,
    agency: 'JKM',
    name: 'JKM18 · Warga Emas',
    summaryKey: 'schemes.jkm.summary',
    upsideRm: '7,200.00',
    formLabel: 'Form JKM18',
    portalUrl: 'https://www.jkm.gov.my'
  },
  {
    id: 'jkm-bkk',
    categoryKey: 'schemes.labels.welfare',
    icon: Baby,
    agency: 'JKM',
    name: 'JKM · Bantuan Kanak-Kanak',
    summaryKey: 'schemes.jkmBkk.summary',
    upsideRm: '12,000.00',
    formLabel: 'Form JKM10',
    portalUrl: 'https://www.jkm.gov.my'
  },
  {
    id: 'lhdn-form-b-be',
    categoryKey: 'schemes.labels.taxRelief',
    icon: Scale,
    agency: 'LHDN',
    name: 'LHDN Form B / BE · YA2025 reliefs',
    summaryKey: 'schemes.lhdn.summary',
    upsideRm: '4,500.00',
    formLabel: 'Form B / BE',
    portalUrl: 'https://mytax.hasil.gov.my'
  },
  {
    id: 'i-saraan',
    categoryKey: 'schemes.labels.retirement',
    icon: PiggyBank,
    agency: 'KWSP',
    name: 'EPF i-Saraan',
    summaryKey: 'schemes.iSaraan.summary',
    upsideRm: '500.00',
    formLabel: 'KWSP i-Saraan registration',
    portalUrl: 'https://www.kwsp.gov.my/en/member/contribution/i-saraan'
  },
  {
    id: 'perkeso-sksps',
    categoryKey: 'schemes.labels.socialSecurity',
    icon: ShieldCheck,
    agency: 'PERKESO',
    name: 'PERKESO SKSPS',
    summaryKey: 'schemes.perkesoSksps.summary',
    upsideRm: '232.80–596.40',
    formLabel: 'Form SKSPS-1',
    portalUrl: 'https://www.perkeso.gov.my',
    kind: 'required_contribution'
  }
]

function InScopeCard({ scheme }: { scheme: InScopeScheme }) {
  const { t } = useTranslation()
  const Icon = scheme.icon
  const isContribution = scheme.kind === 'required_contribution'
  return (
    <article className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/35">
      <div className="flex items-center justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary">
          {t(scheme.categoryKey)}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{scheme.agency}</p>
        <h3 className="font-heading text-xl font-semibold tracking-tight">{scheme.name}</h3>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{t(scheme.summaryKey)}</p>
      <div
        className={`flex flex-col gap-0.5 rounded-lg border border-dashed px-4 py-3 ${
          isContribution ? 'border-amber-500/30 bg-amber-500/5' : 'border-primary/25 bg-primary/5'
        }`}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {isContribution ? t('schemes.labels.annualContribution') : t('schemes.labels.typicalUpside')}
        </p>
        <p className="font-heading tabular-nums">
          {!isContribution && (
            <span className="text-sm font-normal text-muted-foreground">{t('schemes.labels.upTo')} </span>
          )}
          {isContribution && (
            <span className="text-sm font-normal text-muted-foreground">{t('schemes.labels.rm')} </span>
          )}
          <span
            className={`text-xl font-semibold ${isContribution ? 'text-amber-700 dark:text-amber-500' : 'text-primary'}`}
          >
            {scheme.upsideRm}
          </span>
          <span className="ml-1 text-xs font-normal text-muted-foreground">{t('schemes.labels.perYear')}</span>
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
          {t('schemes.labels.agencyPortal')}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </article>
  )
}

export function SchemesOverview() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {IN_SCOPE.map((scheme) => (
            <li key={scheme.id} className="h-full">
              <InScopeCard scheme={scheme} />
            </li>
          ))}
        </ul>
      </section>

      <aside className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-6">
        <div className="flex items-center gap-2">
          <Compass className="size-4 text-primary" aria-hidden />
          <h3 className="font-sans text-sm font-semibold tracking-tight">{t('schemes.howWePick.title')}</h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('schemes.howWePick.description')}</p>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <Landmark className="size-3.5" aria-hidden />
          <span>{t('schemes.notAffiliated')}</span>
        </div>
      </aside>
    </div>
  )
}
