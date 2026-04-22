'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Code2, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ComputeUpsideResult } from '@/lib/agent-types'

type Props = {
  upside: ComputeUpsideResult
}

export function CodeExecutionPanel({ upside }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader className="grid-cols-[1fr_auto] gap-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Code2 className="size-4 text-primary" aria-hidden />
          {t('evaluation.codeExecution.title')}
        </CardTitle>
        <CardDescription>
          {t('evaluation.codeExecution.description')}
        </CardDescription>
        <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(value => !value)}>
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
        </div>
      </CardHeader>
      {expanded && (
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
      )}
    </Card>
  )
}
