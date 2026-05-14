'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calculator, FileSearch, FileType, Network, ScanSearch, type LucideIcon } from 'lucide-react'

type Step = {
  num: string
  label: string
  title: string
  body: string
  tools: string[]
  icon: LucideIcon
  mock: () => React.ReactNode
}

type StepCopy = { label: string; title: string; body: string }

/** English fallback used when the locale catalog isn't loaded yet OR a key
 *  is missing. Tool names + icons + mock components stay in code because
 *  they're product proper nouns (Gemini, Pydantic, WeasyPrint) and React
 *  references, not translatable copy. */
const STEPS_FALLBACK: StepCopy[] = [
  {
    label: 'Extract',
    title: 'Read three documents,\npull a structured profile.',
    body: 'Gemini Vision opens your MyKad, payslip, and utility bill in one pass. Last four IC digits surface; the rest are redacted in-memory and never logged.'
  },
  {
    label: 'Classify',
    title: 'Derive household, filer,\nand dependant counts.',
    body: 'Per-capita monthly income, Form B vs BE, children under 18, elderly dependants 60+. The classifier is a Pydantic schema you can audit, not a black box.'
  },
  {
    label: 'Match',
    title: 'Run deterministic rules\nacross the scheme corpus.',
    body: 'The rule engine checks the structured profile against STR, JKM, LHDN, PERKESO, education, and subsidy rules. Citations point back to cached agency sources; the model does not invent eligibility.'
  },
  {
    label: 'Compute',
    title: 'Sum the annual upside.\nShow the working.',
    body: "Gemini writes a Python snippet, runs it in Google's sandbox, and streams both the source and stdout to the UI. Verifiable arithmetic, not a final number."
  },
  {
    label: 'Generate',
    title: 'Watermarked draft packets,\nready to lodge.',
    body: 'WeasyPrint renders one packet per qualifying scheme — BK-01 for STR, JKM18 for Warga Emas, an LHDN Form B relief summary, and so on. Every page reads "DRAFT — NOT SUBMITTED."'
  }
]

const STEP_TOOLS: string[][] = [
  ['Gemini 3.1 Flash', 'Vision OCR'],
  ['Python rules', 'Pydantic v2'],
  ['Rule engine', 'Source citations'],
  ['Gemini Code Execution', 'Python sandbox'],
  ['WeasyPrint', 'Jinja2']
]

const STEP_ICONS: LucideIcon[] = [FileSearch, ScanSearch, Network, Calculator, FileType]
const STEP_MOCKS: Array<() => React.ReactNode> = [ExtractMock, ClassifyMock, MatchMock, ComputeMock, GenerateMock]

export function LandingPipeline() {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)
  const stepRefs = useRef<(HTMLElement | null)[]>([])

  // Steps come from the i18n catalog; tool labels / icons / mock components
  // stay in code because they're product proper nouns + React references.
  const localisedSteps =
    (t('marketing.pipeline.steps', {
      returnObjects: true,
      defaultValue: STEPS_FALLBACK
    }) as StepCopy[]) || STEPS_FALLBACK
  const STEPS: Step[] = localisedSteps.map((s, i) => ({
    num: String(i + 1).padStart(2, '0'),
    label: s.label,
    title: s.title,
    body: s.body,
    tools: STEP_TOOLS[i] ?? [],
    icon: STEP_ICONS[i] ?? FileSearch,
    mock: STEP_MOCKS[i] ?? ExtractMock
  }))

  useEffect(() => {
    const update = () => {
      const trigger = window.innerHeight * 0.42
      let idx = 0
      stepRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= trigger) idx = i
      })
      setActive(idx)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <section id="how-it-works" className="relative bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-14 max-w-2xl lg:mb-20">
          <div className="mono-caption text-[color:var(--primary)]">
            {t('marketing.pipeline.eyebrow', '02 — How it works')}
          </div>
          <h2 className="mt-4 font-heading text-4xl font-semibold leading-[1.04] tracking-[-0.02em] sm:text-5xl lg:text-[56px]">
            {t('marketing.pipeline.headlineLead', 'Five steps, streamed live —')}
            <br />
            <span className="text-foreground/55">
              {t('marketing.pipeline.headlineTail', 'so you watch the agent reason.')}
            </span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-[1.65] text-foreground/65 sm:text-[17px]">
            {t(
              'marketing.pipeline.description',
              'Layak is not a black box. Every step writes its working back to your screen — the extracted profile, the matched rules, the Python that does the math, the PDF that comes out the other side.'
            )}
          </p>
        </div>

        {/* Two-column scroll-stick layout */}
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Steps list */}
          <div className="lg:col-span-6">
            <ol className="space-y-2">
              {STEPS.map((step, i) => {
                const isActive = i === active
                const Icon = step.icon
                return (
                  <li key={step.num}>
                    <article
                      ref={(el) => {
                        stepRefs.current[i] = el
                      }}
                      className={`group border-t py-9 transition-colors duration-300 ${
                        isActive ? 'border-[color:var(--hibiscus)]/45' : 'border-foreground/12'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`mono-caption transition-colors duration-300 ${
                            isActive ? 'text-[color:var(--hibiscus)]' : 'text-foreground/45'
                          }`}
                        >
                          {step.num} — {step.label}
                        </span>
                        <Icon
                          className={`size-3.5 transition-colors duration-300 ${
                            isActive ? 'text-[color:var(--hibiscus)]' : 'text-foreground/35'
                          }`}
                          aria-hidden
                        />
                      </div>
                      <h3
                        className={`mt-4 max-w-md whitespace-pre-line font-heading text-[26px] font-semibold leading-[1.12] tracking-[-0.01em] transition-colors duration-300 sm:text-[30px] md:text-[34px] ${
                          isActive ? 'text-foreground' : 'text-foreground/55'
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-4 max-w-md text-[15px] leading-[1.65] text-foreground/65">{step.body}</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {step.tools.map((tool) => (
                          <span
                            key={tool}
                            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/[0.03] px-2.5 py-1 mono-caption text-[10px] text-foreground/65"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </article>
                  </li>
                )
              })}
            </ol>
          </div>

          {/* Sticky mock viewer */}
          <div className="hidden lg:col-span-6 lg:block">
            <div className="sticky top-[calc(var(--topbar-height)+3rem)]">
              <div className="relative h-[520px]">
                {STEPS.map((step, i) => {
                  const Mock = step.mock
                  return (
                    <div
                      key={step.num}
                      className={`absolute inset-0 transition-opacity duration-500 ${
                        i === active ? 'opacity-100' : 'pointer-events-none opacity-0'
                      }`}
                    >
                      <MockFrame label={`${step.num} — ${step.label.toUpperCase()}`}>
                        <Mock />
                      </MockFrame>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === active ? 'w-10 bg-[color:var(--hibiscus)]' : 'w-5 bg-foreground/15'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MockFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mock-chrome h-full w-full">
      <div className="flex h-9 items-center gap-2 border-b border-[color:color-mix(in_oklch,var(--paper)_18%,transparent)]/40 px-3.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 mono-caption text-[10px] text-[color:color-mix(in_oklch,var(--paper)_60%,transparent)]">
          layak.tech / {label}
        </span>
      </div>
      <div className="h-[calc(100%-2.25rem)] overflow-hidden">{children}</div>
    </div>
  )
}

/* ── Step mocks ──────────────────────────────────────────────── */

function ExtractMock() {
  return (
    <div className="grid h-full grid-cols-2 gap-3 bg-[color:color-mix(in_oklch,var(--ink)_92%,transparent)] p-4 text-[color:color-mix(in_oklch,var(--paper)_94%,transparent)]">
      {/* MyKad mock */}
      <div className="flex flex-col rounded-lg bg-gradient-to-br from-[#1d4d8f] via-[#246db8] to-[#0c2d52] p-3 text-white shadow-inner">
        <div className="flex items-start justify-between">
          <span className="mono-caption text-[9px] text-white/80">MyKad · Synthetic</span>
          <span className="mono-caption rounded bg-white/12 px-1.5 py-0.5 text-[8px] text-white/85">DEMO</span>
        </div>
        <div className="mt-2 grid grid-cols-[44px_1fr] gap-2">
          <div className="size-11 rounded bg-white/15" />
          <div>
            <div className="text-[11px] font-semibold leading-tight">AISYAH BINTI ABDULLAH</div>
            <div className="mt-1 mono-caption text-[8px] text-white/75">●●●●●●●●-●●-3417</div>
            <div className="mono-caption mt-0.5 text-[8px] text-white/65">KUANTAN · PHG</div>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between text-[9px] text-white/70">
          <span>ISLAM · F</span>
          <span>14 / 04 / 1992</span>
        </div>
      </div>

      {/* Extracted JSON */}
      <div className="flex flex-col rounded-lg bg-[color:color-mix(in_oklch,var(--paper)_8%,transparent)] p-3 ring-1 ring-[color:color-mix(in_oklch,var(--paper)_14%,transparent)]/40">
        <div className="mono-caption text-[9px] text-[color:color-mix(in_oklch,var(--paper)_60%,transparent)]">
          extracted.json
        </div>
        <pre className="mt-2 overflow-hidden font-mono text-[10.5px] leading-[1.55] text-[color:color-mix(in_oklch,var(--paper)_90%,transparent)]">
          <span className="text-[#7fc7a3]">{'{'}</span>
          {'\n  '}
          <span className="text-[#e6b380]">name</span>: <span className="text-[#a8d4f5]">{'"Aisyah …"'}</span>,{'\n  '}
          <span className="text-[#e6b380]">age</span>: <span className="text-[#f5c98c]">34</span>,{'\n  '}
          <span className="text-[#e6b380]">state</span>: <span className="text-[#a8d4f5]">{'"PHG"'}</span>,{'\n  '}
          <span className="text-[#e6b380]">income_my</span>: <span className="text-[#f5c98c]">2840</span>,{'\n  '}
          <span className="text-[#e6b380]">household</span>: <span className="text-[#f5c98c]">4</span>,{'\n  '}
          <span className="text-[#e6b380]">filer</span>: <span className="text-[#a8d4f5]">{'"B"'}</span>
          {'\n'}
          <span className="text-[#7fc7a3]">{'}'}</span>
        </pre>
        <div className="mt-auto flex items-center gap-2 border-t border-[color:color-mix(in_oklch,var(--paper)_12%,transparent)]/40 pt-2">
          <span className="size-1.5 rounded-full bg-[color:var(--forest)]" />
          <span className="mono-caption text-[9px] text-[color:color-mix(in_oklch,var(--paper)_70%,transparent)]">
            Verified · 7 / 7 fields
          </span>
        </div>
      </div>

      {/* Two extra documents below as thumbnails */}
      <div className="col-span-2 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-md bg-[color:color-mix(in_oklch,var(--paper)_6%,transparent)] p-2.5">
          <div className="grid size-8 place-items-center rounded bg-[color:color-mix(in_oklch,var(--paper)_12%,transparent)] text-[10px] font-semibold">
            P
          </div>
          <div className="min-w-0">
            <div className="mono-caption text-[9px] text-[color:color-mix(in_oklch,var(--paper)_60%,transparent)]">
              Payslip · MAR
            </div>
            <div className="truncate text-[11px] font-medium">RM 2,840 net</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-md bg-[color:color-mix(in_oklch,var(--paper)_6%,transparent)] p-2.5">
          <div className="grid size-8 place-items-center rounded bg-[color:color-mix(in_oklch,var(--paper)_12%,transparent)] text-[10px] font-semibold">
            U
          </div>
          <div className="min-w-0">
            <div className="mono-caption text-[9px] text-[color:color-mix(in_oklch,var(--paper)_60%,transparent)]">
              TNB bill
            </div>
            <div className="truncate text-[11px] font-medium">Kuantan · 26900</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ClassifyMock() {
  const rows: { k: string; v: string; tone?: 'forest' | 'hibiscus' }[] = [
    { k: 'household_size', v: '4' },
    { k: 'per_capita_income_my', v: 'RM 710', tone: 'forest' },
    { k: 'filer_category', v: 'Form B (self-employed)' },
    { k: 'children_under_18', v: '2', tone: 'forest' },
    { k: 'dependants_60_plus', v: '1', tone: 'forest' },
    { k: 'b40_band', v: 'B1', tone: 'hibiscus' }
  ]
  return (
    <div className="flex h-full flex-col bg-[color:color-mix(in_oklch,var(--ink)_92%,transparent)] p-5 text-[color:color-mix(in_oklch,var(--paper)_94%,transparent)]">
      <div className="mono-caption text-[10px] text-[color:color-mix(in_oklch,var(--paper)_55%,transparent)]">
        derived_profile.py
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((r, i) => (
          <div
            key={r.k}
            className="fade-rise flex items-baseline justify-between border-b border-[color:color-mix(in_oklch,var(--paper)_12%,transparent)]/30 pb-2"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="font-mono text-[12px] text-[color:color-mix(in_oklch,var(--paper)_75%,transparent)]">
              {r.k}
            </span>
            <span
              className={`font-mono text-[13px] tabular-nums ${
                r.tone === 'forest'
                  ? 'text-[color:var(--forest)]'
                  : r.tone === 'hibiscus'
                    ? 'text-[color:var(--hibiscus)]'
                    : 'text-[color:color-mix(in_oklch,var(--paper)_90%,transparent)]'
              }`}
            >
              {r.v}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-2 rounded-md bg-[color:color-mix(in_oklch,var(--paper)_6%,transparent)] p-3">
        <span className="size-1.5 rounded-full bg-[color:var(--forest)]" />
        <span className="mono-caption text-[10px] text-[color:color-mix(in_oklch,var(--paper)_75%,transparent)]">
          Schema valid · Pydantic v2 · 0 errors
        </span>
      </div>
    </div>
  )
}

function MatchMock() {
  const matches = [
    {
      code: 'STR 2026',
      tier: 'Household tier · 2 children',
      cite: 'Belanjawan 2026 · p.42',
      qualifies: true,
      amount: 'RM 1,200 / yr'
    },
    {
      code: 'JKM Warga Emas',
      tier: 'Father · age 70',
      cite: 'JKM Garis Panduan · §3.2',
      qualifies: true,
      amount: 'RM 6,000 / yr'
    },
    {
      code: 'LHDN Form B reliefs',
      tier: '5 of 5 reliefs apply',
      cite: 'YA2025 · Schedule 6',
      qualifies: true,
      amount: 'RM 5,108 / yr'
    },
    {
      code: 'BR1M / IRB exempt',
      tier: 'Income > B1 ceiling',
      cite: 'LHDN PR 5/2024',
      qualifies: false,
      amount: '—'
    }
  ]
  return (
    <div className="flex h-full flex-col gap-2 bg-[color:color-mix(in_oklch,var(--ink)_92%,transparent)] p-4 text-[color:color-mix(in_oklch,var(--paper)_94%,transparent)]">
      {matches.map((m, i) => (
        <div
          key={m.code}
          className="fade-rise flex items-center gap-3 rounded-lg border border-[color:color-mix(in_oklch,var(--paper)_10%,transparent)]/30 bg-[color:color-mix(in_oklch,var(--paper)_4%,transparent)] p-3"
          style={{ animationDelay: `${i * 110}ms` }}
        >
          <span
            className={`grid size-7 place-items-center rounded ${
              m.qualifies
                ? 'bg-[color:var(--forest)]/22 text-[color:var(--forest)]'
                : 'bg-[color:color-mix(in_oklch,var(--paper)_10%,transparent)] text-[color:color-mix(in_oklch,var(--paper)_55%,transparent)]'
            }`}
          >
            {m.qualifies ? '✓' : '×'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold">{m.code}</div>
            <div className="mono-caption mt-0.5 text-[9px] text-[color:color-mix(in_oklch,var(--paper)_60%,transparent)]">
              {m.tier}
            </div>
          </div>
          <div className="text-right">
            <div
              className={`font-mono text-[12px] tabular-nums ${m.qualifies ? '' : 'text-[color:color-mix(in_oklch,var(--paper)_45%,transparent)]'}`}
            >
              {m.amount}
            </div>
            <div className="mono-caption mt-0.5 text-[9px] text-[color:color-mix(in_oklch,var(--paper)_55%,transparent)]">
              {m.cite}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ComputeMock() {
  return (
    <div className="grid h-full grid-rows-[1fr_auto] bg-[color:color-mix(in_oklch,var(--ink)_92%,transparent)] text-[color:color-mix(in_oklch,var(--paper)_94%,transparent)]">
      <div className="overflow-hidden p-4">
        <div className="mono-caption text-[10px] text-[color:color-mix(in_oklch,var(--paper)_55%,transparent)]">
          gemini_codeexec · Python 3.12
        </div>
        <pre className="mt-3 overflow-hidden font-mono text-[10.5px] leading-[1.6] text-[color:color-mix(in_oklch,var(--paper)_92%,transparent)]">
          <span className="text-[#c39bd3]">def</span> <span className="text-[#a8d4f5]">total_upside</span>(matches):
          {'\n  '}return <span className="text-[#7fc7a3]">sum</span>(m.amount{' '}
          <span className="text-[#c39bd3]">for</span> m <span className="text-[#c39bd3]">in</span> matches)
          {'\n\n'}matches = [{'\n  '}
          <span className="text-[#a8d4f5]">Match</span>(<span className="text-[#e6b380]">{'"STR 2026"'}</span>,{' '}
          <span className="text-[#f5c98c]">1200</span>),
          {'\n  '}
          <span className="text-[#a8d4f5]">Match</span>(<span className="text-[#e6b380]">{'"JKM"'}</span>,{' '}
          <span className="text-[#f5c98c]">6000</span>),
          {'\n  '}
          <span className="text-[#a8d4f5]">Match</span>(<span className="text-[#e6b380]">{'"LHDN B"'}</span>,{' '}
          <span className="text-[#f5c98c]">5108</span>),
          {'\n'}]{'\n'}
          <span className="text-[#7fc7a3]">print</span>(
          <span className="text-[#e6b380]">{'f"RM {total_upside(matches):,}"'}</span>)
        </pre>
      </div>
      <div className="border-t border-[color:color-mix(in_oklch,var(--paper)_12%,transparent)]/30 bg-[color:color-mix(in_oklch,var(--paper)_4%,transparent)] p-4">
        <div className="mono-caption text-[10px] text-[color:color-mix(in_oklch,var(--paper)_55%,transparent)]">
          stdout
        </div>
        <div className="mt-1 font-mono text-[14px] text-[color:var(--forest)]">RM 12,308</div>
      </div>
    </div>
  )
}

function GenerateMock() {
  const packets = [
    { code: 'BK-01', name: 'STR 2026', tone: 'hibiscus' },
    { code: 'JKM18', name: 'Warga Emas', tone: 'forest' },
    { code: 'LHDN-B', name: 'Form B reliefs', tone: 'primary' }
  ] as const
  return (
    <div className="flex h-full items-center justify-center gap-4 bg-gradient-to-br from-[color:color-mix(in_oklch,var(--ink)_92%,transparent)] via-[color:color-mix(in_oklch,var(--ink)_88%,transparent)] to-[color:color-mix(in_oklch,var(--ink)_94%,transparent)] p-6">
      {packets.map((p, i) => (
        <div
          key={p.code}
          className="fade-rise relative aspect-[3/4] w-[26%] origin-bottom rounded-md bg-[color:var(--paper)] p-3 shadow-[0_22px_40px_-10px_rgba(0,0,0,0.55)] ring-1 ring-foreground/10"
          style={{
            transform: `rotate(${i === 0 ? -6 : i === 1 ? 0 : 6}deg) translateY(${i === 1 ? -10 : 0}px)`,
            animationDelay: `${i * 140}ms`
          }}
        >
          <div className="mono-caption text-[8px] text-foreground/55">PACKET · {p.code}</div>
          <div className="mt-1 font-heading text-[12px] font-bold text-foreground">{p.name}</div>
          <div className="mt-2 space-y-1">
            <span className="block h-1.5 rounded bg-foreground/10" />
            <span className="block h-1.5 w-[78%] rounded bg-foreground/10" />
            <span className="block h-1.5 w-[60%] rounded bg-foreground/10" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1">
            <span className="h-7 rounded bg-foreground/[0.06]" />
            <span className="h-7 rounded bg-foreground/[0.06]" />
          </div>
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 rotate-[-6deg] rounded border-2 px-1.5 py-0.5 mono-caption text-[8px]"
            style={{ borderColor: 'var(--hibiscus)', color: 'var(--hibiscus)' }}
          >
            DRAFT
          </div>
        </div>
      ))}
    </div>
  )
}
