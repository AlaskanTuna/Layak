'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

import { ProvenancePanel } from '@/components/results/provenance-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SchemeMatch } from '@/lib/agent-types'

type Props = {
  match: SchemeMatch
}

function formatRm(value: number): string {
  return `RM${value.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
}

export function SchemeCard({ match }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="break-words">{match.scheme_name}</CardTitle>
            <Badge variant="outline" className="w-fit">
              {match.agency}
            </Badge>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <div className="font-heading text-lg font-semibold text-foreground">{formatRm(match.annual_rm)}</div>
            <div className="text-xs text-muted-foreground">per year (est.)</div>
          </div>
        </div>
        <CardDescription>{match.summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          className="justify-start px-0 text-primary hover:bg-transparent"
        >
          {expanded ? <ChevronUp className="mr-1.5 size-4" aria-hidden /> : <ChevronDown className="mr-1.5 size-4" aria-hidden />}
          Why I qualify
        </Button>
        {expanded && (
          <div className="flex flex-col gap-3 border-t pt-3">
            <p className="text-sm leading-relaxed">{match.why_qualify}</p>
            <ProvenancePanel citations={match.rule_citations} />
            <a
              href={match.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-2"
            >
              <ExternalLink className="size-3" aria-hidden />
              Open {match.agency} portal
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
