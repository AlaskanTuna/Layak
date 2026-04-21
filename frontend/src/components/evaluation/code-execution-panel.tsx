'use client'

import { Code2, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ComputeUpsideResult } from '@/lib/agent-types'

type Props = {
  upside: ComputeUpsideResult
}

export function CodeExecutionPanel({ upside }: Props) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Code2 className="size-4 text-primary" aria-hidden />
          {t('evaluation.codeExecution.title')}
        </CardTitle>
        <CardDescription>
          {t('evaluation.codeExecution.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Code2 className="size-3" aria-hidden />
            {t('evaluation.codeExecution.python')}
          </div>
          <pre className="overflow-x-auto rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed">
            {upside.python_snippet}
          </pre>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Terminal className="size-3" aria-hidden />
            {t('evaluation.codeExecution.stdout')}
          </div>
          <pre className="overflow-x-auto rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed">
            {upside.stdout}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
