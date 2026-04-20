import { AlertTriangle, ShieldCheck } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const STEPS = [
  {
    step: '01 · Extract',
    body: 'Gemini 2.5 Flash reads your uploaded MyKad, payslip, and utility bill and pulls structured fields — name, IC, monthly income, household composition, address.'
  },
  {
    step: '02 · Classify',
    body: 'The backend derives household size, per-capita monthly income, filer category (Form B vs BE), and counts of children and elderly dependants.'
  },
  {
    step: '03 · Match',
    body: 'A rule engine checks your derived profile against every scheme threshold — STR tiers, JKM Warga Emas eligibility, LHDN Form B reliefs — and returns qualifying schemes with exact rule citations.'
  },
  {
    step: '04 · Compute',
    body: 'Gemini Code Execution runs a Python snippet on stage that sums your annual upside across every qualifying scheme, and streams the stdout back to the UI.'
  },
  {
    step: '05 · Generate',
    body: 'WeasyPrint renders three draft PDFs — BK-01 for STR, JKM18 for Warga Emas, a Form B relief summary for LHDN. Every page carries a watermark: DRAFT — NOT SUBMITTED.'
  }
]

export function HowItWorksContent() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-primary" aria-hidden />
            What Layak is
          </CardTitle>
          <CardDescription>
            Layak is an agentic AI concierge for Malaysian social-assistance schemes. Upload three documents; get back a
            ranked list of schemes you qualify for, plus three draft application packets.
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">The five-step pipeline</h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map(step => (
            <li key={step.step} className="rounded-md border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{step.step}</p>
              <p className="mt-1 text-sm leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4 text-amber-600" aria-hidden />
            Disclaimers
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            Layak never submits on your behalf. Every generated packet is a <strong>DRAFT</strong> — you review it and
            lodge it manually via the agency&rsquo;s official portal.
          </p>
          <p>Figures are estimates. The agency makes the final determination on every application.</p>
          <p>
            Layak is an independent prototype. It is not affiliated with LHDN, JKM, the Treasury, or any other
            Malaysian government body.
          </p>
          <p>Scheme coverage and thresholds reflect YA2025 / 2026 rules as of April 2026 and may change over time.</p>
        </CardContent>
      </Card>
    </div>
  )
}
