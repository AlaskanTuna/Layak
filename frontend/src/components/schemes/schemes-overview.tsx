'use client'

import { ArrowUpRight, Baby, Coins, HeartHandshake, PiggyBank, Scale, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SchemeVerifiedBadge } from '@/components/schemes/scheme-verified-badge'

type SchemeKind = 'upside' | 'required_contribution'

type SchemeGroup = 'cashWelfare' | 'taxRetirement' | 'socialSecurity'

const GROUPS: readonly SchemeGroup[] = ['cashWelfare', 'taxRetirement', 'socialSecurity']

type InScopeScheme = {
  id: string
  // Backend `SchemeId` (snake_case) used to look up `verified_schemes/{id}`
  // for the per-card "Source verified" badge. `lhdn-form-b-be` is bundled
  // for layperson copy; the badge maps it to the canonical `lhdn_form_b`
  // since that's the source of truth the discovery agent watches.
  canonicalSchemeId: string
  group: SchemeGroup
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
    canonicalSchemeId: 'str_2026',
    group: 'cashWelfare',
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
    canonicalSchemeId: 'jkm_warga_emas',
    group: 'cashWelfare',
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
    canonicalSchemeId: 'jkm_bkk',
    group: 'cashWelfare',
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
    canonicalSchemeId: 'lhdn_form_b',
    group: 'taxRetirement',
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
    canonicalSchemeId: 'i_saraan',
    group: 'taxRetirement',
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
    canonicalSchemeId: 'perkeso_sksps',
    group: 'socialSecurity',
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
        <div className="flex size-9 items-center justify-center rounded-md bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
          <Icon className="size-4" aria-hidden />
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
          {isContribution && <span className="text-sm font-normal text-foreground/55">{t('schemes.labels.rm')} </span>}
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
      <div className="mt-auto flex flex-col gap-2 border-t border-foreground/10 pt-4">
        <SchemeVerifiedBadge schemeId={scheme.canonicalSchemeId} />
        <div className="flex items-center justify-between gap-3">
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
      </div>
    </article>
  )
}

export function SchemesOverview() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-10">
      {GROUPS.map((group) => {
        const groupSchemes = IN_SCOPE.filter((s) => s.group === group)
        if (groupSchemes.length === 0) return null
        return (
          <section key={group} className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-xl font-semibold tracking-tight">
                {t(`schemes.groups.${group}.title`)}
              </h2>
              <span className="mono-caption text-foreground/55">
                {groupSchemes.length === 1
                  ? t('schemes.groups.countSingular', { count: groupSchemes.length })
                  : t('schemes.groups.countPlural', { count: groupSchemes.length })}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupSchemes.map((scheme) => (
                <li key={scheme.id} className="h-full">
                  <InScopeCard scheme={scheme} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
