'use client'

import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { authedFetch } from '@/lib/firebase'

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

type Phase = 'loading' | 'ready' | 'error'

/**
 * Brief AI-written summary of the evaluation — sits below the Total
 * Potential Relief hero inside the Overview section. Fetches once on
 * mount; failures hide the card rather than render an error band, since
 * the hero above already carries the load-bearing copy. The /summary
 * endpoint itself is fail-open (deterministic fallback on Gemini error),
 * so an "error" phase here only fires on a transport-layer or auth
 * failure that the rest of the page would surface anyway.
 */
export function EvaluationSummaryCard({ evalId }: { evalId: string }) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('loading')
  const [summary, setSummary] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await authedFetch(`${getBackendUrl()}/api/evaluations/${evalId}/summary`, {
          method: 'GET'
        })
        if (cancelled) return
        if (!res.ok) {
          setPhase('error')
          return
        }
        const body = (await res.json()) as { summary: string }
        if (cancelled) return
        setSummary(body.summary)
        setPhase('ready')
      } catch {
        if (!cancelled) setPhase('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [evalId])

  if (phase === 'error') return null

  return (
    <section className="paper-card relative isolate flex flex-col gap-3 overflow-hidden rounded-[16px] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-[color:var(--hibiscus)]/10 text-[color:var(--hibiscus)]">
            <Sparkles className="size-3.5" aria-hidden />
          </span>
          <h3 className="font-heading text-base font-semibold tracking-tight">
            {t('evaluation.summary.title')}
          </h3>
        </div>
        <span className="mono-caption text-foreground/45">{t('evaluation.summary.aiBadge')}</span>
      </div>
      {phase === 'loading' ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
          <div className="h-3 w-[92%] animate-pulse rounded-full bg-foreground/10" />
          <div className="h-3 w-[85%] animate-pulse rounded-full bg-foreground/10" />
          <div className="h-3 w-[60%] animate-pulse rounded-full bg-foreground/10" />
          <span className="sr-only">{t('evaluation.summary.loading')}</span>
        </div>
      ) : (
        <p className="text-[14px] leading-[1.65] text-foreground/75">{summary}</p>
      )}
    </section>
  )
}
