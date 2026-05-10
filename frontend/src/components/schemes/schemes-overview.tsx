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
    <article className="paper-card group flex h-full flex-col gap-4 rounded-[16px] p-6 transition-shadow hover:shadow-[0_28px_60px_-22px_color-mix(in_oklch,var(--ink)_28%,transparent)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
          <Icon className="size-5" aria-hidden />
        </div>
        <span className="mono-caption text-[color:var(--primary)]">{t(scheme.categoryKey)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="mono-caption text-foreground/55">{scheme.agency}</p>
        <h3 className="font-heading text-xl font-semibold tracking-tight">{scheme.name}</h3>
      </div>
      <p className="text-sm leading-relaxed text-foreground/65">{t(scheme.summaryKey)}</p>
      <div
        className={`flex flex-col gap-0.5 rounded-lg border border-dashed px-4 py-3 ${
          isContribution
            ? 'border-amber-500/30 bg-amber-500/[0.06]'
            : 'border-[color:var(--hibiscus)]/30 bg-[color:var(--hibiscus)]/[0.05]'
        }`}
      >
        <p className="mono-caption text-foreground/55">
          {isContribution ? t('schemes.labels.annualContribution') : t('schemes.labels.typicalUpside')}
        </p>
        <p className="font-heading tabular-nums">
          {!isContribution && (
            <span className="text-sm font-normal text-foreground/55">{t('schemes.labels.upTo')} </span>
          )}
          {isContribution && (
            <span className="text-sm font-normal text-foreground/55">{t('schemes.labels.rm')} </span>
          )}
          <span
            className={`text-xl font-semibold ${
              isContribution ? 'text-amber-700 dark:text-amber-400' : 'text-[color:var(--hibiscus)]'
            }`}
          >
            {scheme.upsideRm}
          </span>
          <span className="ml-1 text-xs font-normal text-foreground/55">{t('schemes.labels.perYear')}</span>
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-foreground/10 pt-4">
        <span className="mono-caption text-foreground/55">{scheme.formLabel}</span>
        <a
          href={scheme.portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--hibiscus)] transition-colors hover:underline"
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

      <aside className="paper-card relative isolate flex flex-col gap-3 overflow-hidden rounded-[16px] p-6">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-6 left-0 w-[3px] rounded-r-full bg-[color:var(--primary)]/70"
        />
        <div className="flex items-center gap-2">
          <Compass className="size-4 text-[color:var(--primary)]" aria-hidden />
          <span className="mono-caption text-[color:var(--primary)]">How we pick</span>
        </div>
        <h3 className="font-heading text-[16px] font-semibold tracking-tight">{t('schemes.howWePick.title')}</h3>
        <p className="text-sm leading-relaxed text-foreground/68">{t('schemes.howWePick.description')}</p>
        <div className="mono-caption flex items-center gap-2 text-foreground/55">
          <Landmark className="size-3.5" aria-hidden />
          <span>{t('schemes.notAffiliated')}</span>
        </div>
      </aside>
    </div>
  )
}
