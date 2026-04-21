import {
  AlertTriangle,
  BookOpen,
  Calculator,
  FileSearch,
  FileType,
  type LucideIcon,
  Network,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Timer
} from 'lucide-react'

type PipelineStep = {
  step: string
  title: string
  icon: LucideIcon
  body: string
  tools: string[]
}

const PIPELINE: PipelineStep[] = [
  {
    step: '01',
    title: 'Extract',
    icon: FileSearch,
    body: 'Gemini Vision reads your MyKad, payslip, and utility bill and pulls structured profile fields — name, IC, monthly income, household composition, address.',
    tools: ['Gemini 2.5 Flash', 'Vision OCR']
  },
  {
    step: '02',
    title: 'Classify',
    icon: ScanSearch,
    body: 'Household size, per-capita monthly income, filer category (Form B vs BE), and counts of children under 18 and elderly dependants 60+ are derived from the extracted profile.',
    tools: ['Python rules', 'Pydantic']
  },
  {
    step: '03',
    title: 'Match',
    icon: Network,
    body: 'The rule engine checks your derived profile against every scheme threshold — STR 2026 tiers, JKM Warga Emas eligibility, five LHDN Form B reliefs — and returns qualifying schemes with exact citations.',
    tools: ['Vertex AI Search', 'Rule engine']
  },
  {
    step: '04',
    title: 'Compute',
    icon: Calculator,
    body: 'Gemini writes a Python snippet and runs it in Google’s code sandbox to sum your annual upside across every qualifying scheme. The generated code and its output stream live to the UI, so you see the full working — not just a final number.',
    tools: ['Gemini Code Execution', 'Python']
  },
  {
    step: '05',
    title: 'Generate',
    icon: FileType,
    body: 'WeasyPrint renders three draft PDFs — BK-01 for STR, JKM18 for Warga Emas, a Form B relief summary for LHDN. Every page carries the watermark: DRAFT — NOT SUBMITTED.',
    tools: ['WeasyPrint', 'Jinja2']
  }
]

type StackTool = {
  name: string
  role: string
  icon: LucideIcon
}

const STACK: StackTool[] = [
  {
    name: 'Gemini 2.5 Pro + Flash',
    role: 'Orchestrates the agent pipeline and handles document understanding + classification.',
    icon: Sparkles
  },
  {
    name: 'Vertex AI Search',
    role: 'RAG layer over committed scheme PDFs — the source of every cited rule passage.',
    icon: BookOpen
  },
  {
    name: 'Gemini Code Execution',
    role: 'Gemini writes and runs a Python snippet in Google’s sandbox to compute your annual upside. Both the generated source and its stdout stream to the UI — verifiable math, not a black box.',
    icon: Calculator
  },
  {
    name: 'WeasyPrint',
    role: 'HTML-to-PDF draft packet generator. Every page watermarked and agency-portal-ready.',
    icon: FileType
  }
]

function StatsRow() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        <span className="font-semibold text-foreground tabular-nums">5</span>
        <span>steps</span>
      </span>
      <span aria-hidden className="opacity-40">
        ·
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Timer className="size-3.5" aria-hidden />
        <span>under a minute end-to-end</span>
      </span>
      <span aria-hidden className="opacity-40">
        ·
      </span>
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck className="size-3.5 text-primary" aria-hidden />
        <span>drafts only — you submit</span>
      </span>
    </div>
  )
}

function PipelineTimeline() {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-xl font-semibold tracking-tight">The pipeline</h2>
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Streaming · step-by-step
        </span>
      </div>
      <ol className="flex flex-col">
        {PIPELINE.map((step, index) => {
          const Icon = step.icon
          const isLast = index === PIPELINE.length - 1
          return (
            <li key={step.step} className="relative flex gap-5 pb-8 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[1.4375rem] top-14 bottom-0 w-px bg-border"
                />
              )}
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-card shadow-sm">
                <span className="font-heading text-base font-semibold tabular-nums text-primary">{step.step}</span>
              </div>
              <div className="flex flex-1 flex-col gap-2 pt-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-semibold tracking-tight">{step.title}</h3>
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {step.tools.map(tool => (
                    <span
                      key={tool}
                      className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function AgentStack() {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-heading text-xl font-semibold tracking-tight">The agent stack</h2>
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          What&rsquo;s under the hood
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STACK.map(tool => {
          const Icon = tool.icon
          return (
            <li key={tool.name} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </div>
                <p className="font-heading text-sm font-semibold">{tool.name}</p>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{tool.role}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function FinePrint() {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
        <h2 className="font-heading text-sm font-semibold tracking-tight">The fine print</h2>
      </div>
      <ul className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
        <li className="flex gap-2">
          <span aria-hidden className="text-amber-600 dark:text-amber-400">
            ·
          </span>
          <span>
            Layak never submits on your behalf. Every generated packet is a <strong>DRAFT</strong> — you review it and
            lodge it manually via the agency&rsquo;s official portal.
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-amber-600 dark:text-amber-400">
            ·
          </span>
          <span>Figures are estimates. The agency makes the final determination on every application.</span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-amber-600 dark:text-amber-400">
            ·
          </span>
          <span>
            Layak is an independent prototype. It is not affiliated with LHDN, JKM, the Treasury, or any other
            Malaysian government body.
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-amber-600 dark:text-amber-400">
            ·
          </span>
          <span>Scheme coverage and thresholds reflect YA2025 / 2026 rules as of April 2026 and may change over time.</span>
        </li>
      </ul>
    </section>
  )
}

export function HowItWorksContent() {
  return (
    <div className="flex flex-col gap-8">
      <StatsRow />
      <PipelineTimeline />
      <AgentStack />
      <FinePrint />
    </div>
  )
}
