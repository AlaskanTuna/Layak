'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Code2, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { ComputeUpsideResult } from '@/lib/agent-types'

type Props = {
  upside: ComputeUpsideResult
}

export function CodeExecutionPanel({ upside }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="paper-card rounded-[14px] p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <p className="mono-caption text-[color:var(--primary)]">Compute</p>
          <h3 className="mt-1 flex items-center gap-2 font-heading text-[15px] font-semibold tracking-tight">
            <Code2 className="size-4 text-foreground/55" aria-hidden />
            {t('evaluation.codeExecution.title')}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-foreground/65">
            {t('evaluation.codeExecution.description')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 rounded-full"
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-1.5 size-4" aria-hidden />
              {t('evaluation.codeExecution.hide')}
            </>
          ) : (
            <>
              <ChevronDown className="mr-1.5 size-4" aria-hidden />
              {t('evaluation.codeExecution.show')}
            </>
          )}
        </Button>
      </header>
      {expanded && (
        <div className="mt-4 flex flex-col gap-3 border-t border-foreground/10 pt-4">
          <CodeBlock
            label={t('evaluation.codeExecution.python')}
            icon={<Code2 className="size-3" aria-hidden />}
            content={upside.python_snippet}
          />
          <CodeBlock
            label={t('evaluation.codeExecution.stdout')}
            icon={<Terminal className="size-3" aria-hidden />}
            content={upside.stdout}
          />
        </div>
      )}
    </section>
  )
}

function CodeBlock({
  label,
  icon,
  content
}: {
  label: string
  icon: React.ReactNode
  content: string
}) {
  return (
    <div className="mock-chrome">
      <div className="flex items-center gap-2 border-b border-[color:color-mix(in_oklch,var(--paper)_18%,transparent)]/40 px-3 py-2">
        <span className="size-2 rounded-full bg-[#ff5f57]" />
        <span className="size-2 rounded-full bg-[#febc2e]" />
        <span className="size-2 rounded-full bg-[#28c840]" />
        <span className="ml-2 mono-caption flex items-center gap-1.5 text-[color:color-mix(in_oklch,var(--paper)_60%,transparent)]">
          {icon}
          {label}
        </span>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[12px] leading-[1.55] text-[color:color-mix(in_oklch,var(--paper)_94%,transparent)]">
        {content}
      </pre>
    </div>
  )
}
