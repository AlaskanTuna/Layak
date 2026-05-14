'use client'

import {
  ArrowUpRight,
  Baby,
  Book,
  BookOpen,
  Briefcase,
  Coins,
  Fuel,
  GraduationCap,
  HandCoins,
  Heart,
  HeartHandshake,
  PiggyBank,
  Scale,
  School,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Stethoscope,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SchemeVerifiedBadge } from '@/components/schemes/scheme-verified-badge'

type SchemeKind = 'upside' | 'subsidy_credit' | 'required_contribution'

type SchemeGroup = 'cashWelfare' | 'education' | 'healthSafety' | 'taxRetirement'

const GROUPS: readonly SchemeGroup[] = ['cashWelfare', 'education', 'healthSafety', 'taxRetirement']

type InScopeScheme = {
  id: string
  // Backend `SchemeId` (snake_case) used to look up `verified_schemes/{id}`
  // for the per-card "Source verified" badge.
  canonicalSchemeId: string
  group: SchemeGroup
  categoryKey: string
  icon: LucideIcon
  agency: string
  name: string
  summaryKey: string
  // For `upside` schemes this reads as `Up to RM <upsideRm> / year`.
  // For `required_contribution` schemes (PERKESO SKSPS) it reads as
  // `Annual contribution: RM <upsideRm> / year`.
  // For `subsidy_credit` schemes it reads as `Indicative benefit: RM <upsideRm>`
  // when quantifiable, or "In-kind benefit" / "Info-only" when not (passed
  // as `upsideRm: '—'`). The card never misleads viewers about who pays
  // whom.
  upsideRm: string
  formLabel: string
  portalUrl: string
  kind?: SchemeKind
}

// Scheme names, agency names, form IDs, and portal URLs are proper nouns and
// MUST stay source-language — they identify government documents.
const IN_SCOPE: InScopeScheme[] = [
  // ---------------- Cash & Welfare ----------------
  {
    id: 'str-2026',
    canonicalSchemeId: 'str_2026',
    group: 'cashWelfare',
    categoryKey: 'schemes.labels.cashTransfer',
    icon: Coins,
    agency: 'MOF · Treasury Malaysia',
    name: 'STR 2026',
    summaryKey: 'schemes.str.summary',
    upsideRm: '2,500.00',
    formLabel: 'Form BK-01',
    portalUrl: 'https://bantuantunai.hasil.gov.my'
  },
  {
    id: 'sara',
    canonicalSchemeId: 'sara',
    group: 'cashWelfare',
    categoryKey: 'schemes.labels.cashTransfer',
    icon: Wallet,
    agency: 'MOF · Treasury Malaysia',
    name: 'SARA · Sumbangan Asas Rahmah',
    summaryKey: 'schemes.sara.summary',
    upsideRm: '2,400.00',
    formLabel: 'Auto MyKad credit',
    portalUrl: 'https://sara.gov.my/en/home.html',
    kind: 'subsidy_credit'
  },
  {
    id: 'mykasih',
    canonicalSchemeId: 'mykasih',
    group: 'cashWelfare',
    categoryKey: 'schemes.labels.cashTransfer',
    icon: HandCoins,
    agency: 'MOF · Treasury Malaysia',
    name: 'MyKasih SARA RM100',
    summaryKey: 'schemes.mykasih.summary',
    upsideRm: '100.00',
    formLabel: 'Auto MyKad credit (one-off)',
    portalUrl: 'https://www.mykasih.com.my',
    kind: 'subsidy_credit'
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
    id: 'bantuan-elektrik',
    canonicalSchemeId: 'bantuan_elektrik',
    group: 'cashWelfare',
    categoryKey: 'schemes.labels.welfare',
    icon: Zap,
    agency: 'TNB + PETRA',
    name: 'Bantuan Elektrik · KIR Miskin Tegar',
    summaryKey: 'schemes.bantuanElektrik.summary',
    upsideRm: '480.00',
    formLabel: 'Auto bill rebate',
    portalUrl: 'https://ihsanmadani.gov.my/inisiatif/utiliti/program-rebat-bil-elektrik-rm40'
  },
  {
    id: 'perkeso-sip',
    canonicalSchemeId: 'perkeso_sip',
    group: 'healthSafety',
    categoryKey: 'schemes.labels.socialSecurity',
    icon: ShieldCheck,
    agency: 'PERKESO',
    name: 'PERKESO SIP · Employment Insurance',
    summaryKey: 'schemes.perkesoSip.summary',
    upsideRm: '4,000.00',
    formLabel: 'Auto via employer EIS',
    portalUrl: 'https://eis.perkeso.gov.my',
    kind: 'subsidy_credit'
  },
  {
    id: 'budi95',
    canonicalSchemeId: 'budi95',
    group: 'cashWelfare',
    categoryKey: 'schemes.labels.fuelSubsidy',
    icon: Fuel,
    agency: 'MOF · Treasury Malaysia',
    name: 'BUDI95',
    summaryKey: 'schemes.budi95.summary',
    upsideRm: '—',
    formLabel: 'MyKad scan at pump',
    portalUrl: 'https://www.budi95.gov.my/',
    kind: 'subsidy_credit'
  },
  // ---------------- Education ----------------
  {
    id: 'bap',
    canonicalSchemeId: 'bap',
    group: 'education',
    categoryKey: 'schemes.labels.education',
    icon: BookOpen,
    agency: 'KPM (Ministry of Education)',
    name: 'BAP · Bantuan Awal Persekolahan',
    summaryKey: 'schemes.bap.summary',
    upsideRm: '150.00 / child',
    formLabel: 'Auto via school',
    portalUrl: 'https://www.moe.gov.my/bantuan-awal-persekolahan'
  },
  {
    id: 'rmt',
    canonicalSchemeId: 'rmt',
    group: 'education',
    categoryKey: 'schemes.labels.education',
    icon: Utensils,
    agency: 'KPM (Ministry of Education)',
    name: 'RMT · Rancangan Makanan Tambahan',
    summaryKey: 'schemes.rmt.summary',
    upsideRm: '—',
    formLabel: 'School RMT committee',
    portalUrl: 'https://www.moe.gov.my/rancangan-makanan-tambahan',
    kind: 'subsidy_credit'
  },
  {
    id: 'spbt',
    canonicalSchemeId: 'spbt',
    group: 'education',
    categoryKey: 'schemes.labels.education',
    icon: Book,
    agency: 'KPM (Ministry of Education)',
    name: 'SPBT · Skim Pinjaman Buku Teks',
    summaryKey: 'schemes.spbt.summary',
    upsideRm: '250.00 / child',
    formLabel: 'Auto via school',
    portalUrl: 'https://www.moe.gov.my/index.php/en/bantuan-pembelajaran-menu/skim-pinjaman-buku-teks-spbt',
    kind: 'subsidy_credit'
  },
  {
    id: 'kwapm',
    canonicalSchemeId: 'kwapm',
    group: 'education',
    categoryKey: 'schemes.labels.education',
    icon: School,
    agency: 'KPM (Ministry of Education)',
    name: 'KWAPM · Pelajar Miskin',
    summaryKey: 'schemes.kwapm.summary',
    upsideRm: '200.00 / child',
    formLabel: 'School KWAPM committee',
    portalUrl: 'https://www.moe.gov.my/bantuan-kumpulan-wang-amanah-pelajar-miskin-kwapm'
  },
  {
    id: 'taska-permata',
    canonicalSchemeId: 'taska_permata',
    group: 'education',
    categoryKey: 'schemes.labels.education',
    icon: Sparkles,
    agency: 'KPWKM · Jabatan Permata',
    name: 'TASKA / TADIKA Permata',
    summaryKey: 'schemes.taskaPermata.summary',
    upsideRm: '1,980.00',
    formLabel: 'Apply at centre',
    portalUrl: 'https://permata.gov.my'
  },
  // ---------------- Health & Safety ----------------
  {
    id: 'peka-b40',
    canonicalSchemeId: 'peka_b40',
    group: 'healthSafety',
    categoryKey: 'schemes.labels.healthcare',
    icon: Stethoscope,
    agency: 'MOH · ProtectHealth',
    name: 'PeKa B40',
    summaryKey: 'schemes.pekaB40.summary',
    upsideRm: '—',
    formLabel: 'ProtectHealth registration',
    portalUrl: 'https://protecthealth.com.my/peka-b40/',
    kind: 'subsidy_credit'
  },
  {
    id: 'mysalam',
    canonicalSchemeId: 'mysalam',
    group: 'healthSafety',
    categoryKey: 'schemes.labels.healthcare',
    icon: ShieldPlus,
    agency: 'MOF · Treasury Malaysia',
    name: 'MySalam',
    summaryKey: 'schemes.mysalam.summary',
    upsideRm: '8,000.00',
    formLabel: 'Auto via STR enrolment',
    portalUrl: 'https://www.mysalam.com.my/',
    kind: 'subsidy_credit'
  },
  {
    id: 'perkeso-sksps',
    canonicalSchemeId: 'perkeso_sksps',
    group: 'healthSafety',
    categoryKey: 'schemes.labels.socialSecurity',
    icon: ShieldCheck,
    agency: 'PERKESO',
    name: 'PERKESO SKSPS',
    summaryKey: 'schemes.perkesoSksps.summary',
    upsideRm: '232.80–596.40',
    formLabel: 'Form SKSPS-1',
    portalUrl: 'https://www.perkeso.gov.my',
    kind: 'required_contribution'
  },
  // ---------------- Tax & Retirement ----------------
  {
    id: 'lhdn-form-b',
    canonicalSchemeId: 'lhdn_form_b',
    group: 'taxRetirement',
    categoryKey: 'schemes.labels.taxRelief',
    icon: Scale,
    agency: 'LHDN',
    name: 'LHDN Form B (self-employed)',
    summaryKey: 'schemes.lhdnB.summary',
    upsideRm: '4,500.00',
    formLabel: 'Form B',
    portalUrl: 'https://mytax.hasil.gov.my'
  },
  {
    id: 'lhdn-form-be',
    canonicalSchemeId: 'lhdn_form_be',
    group: 'taxRetirement',
    categoryKey: 'schemes.labels.taxRelief',
    icon: Briefcase,
    agency: 'LHDN',
    name: 'LHDN Form BE (salaried)',
    summaryKey: 'schemes.lhdnBE.summary',
    upsideRm: '4,500.00',
    formLabel: 'Form BE',
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
    id: 'i-suri',
    canonicalSchemeId: 'i_suri',
    group: 'taxRetirement',
    categoryKey: 'schemes.labels.retirement',
    icon: Heart,
    agency: 'KWSP',
    name: 'KWSP i-Suri',
    summaryKey: 'schemes.iSuri.summary',
    upsideRm: '300.00',
    formLabel: 'KWSP i-Suri registration',
    portalUrl: 'https://www.kwsp.gov.my/en/member/savings/i-suri'
  }
]

function InScopeCard({ scheme }: { scheme: InScopeScheme }) {
  const { t } = useTranslation()
  const Icon = scheme.icon
  const isContribution = scheme.kind === 'required_contribution'
  const isSubsidy = scheme.kind === 'subsidy_credit'
  const isInKind = scheme.upsideRm === '—'
  const accentBorder = isContribution
    ? 'border-amber-500/30 bg-amber-500/[0.06]'
    : isSubsidy
      ? 'border-slate-400/30 bg-slate-400/[0.06]'
      : 'border-[color:var(--hibiscus)]/30 bg-[color:var(--hibiscus)]/[0.05]'
  const accentText = isContribution
    ? 'text-amber-700 dark:text-amber-400'
    : isSubsidy
      ? 'text-slate-700 dark:text-slate-300'
      : 'text-[color:var(--hibiscus)]'
  const valueLabel = isContribution
    ? t('schemes.labels.annualContribution')
    : isSubsidy
      ? t('schemes.labels.indicativeBenefit')
      : t('schemes.labels.typicalUpside')
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
      <div className={`flex flex-col gap-0.5 rounded-lg border border-dashed px-4 py-3 ${accentBorder}`}>
        <p className="mono-caption text-foreground/55">{valueLabel}</p>
        <p className="font-heading tabular-nums">
          {isInKind ? (
            <span className={`text-base font-semibold ${accentText}`}>{t('schemes.labels.inKindBenefit')}</span>
          ) : (
            <>
              <span className="text-sm font-normal text-foreground/55">
                {/* `Up to RM` reads as a ceiling — correct for `upside` matches
                 * where the figure is the per-rule annual max. For both
                 * `subsidy_credit` (indicative benefit you receive) and
                 * `required_contribution` (amount you pay) we drop "Up to"
                 * because they're not maxima.*/}
                {!isContribution && !isSubsidy ? t('schemes.labels.upTo') : t('schemes.labels.rm')}{' '}
              </span>
              <span className={`text-xl font-semibold ${accentText}`}>{scheme.upsideRm}</span>
              <span className="ml-1 text-xs font-normal text-foreground/55">{t('schemes.labels.perYear')}</span>
            </>
          )}
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
