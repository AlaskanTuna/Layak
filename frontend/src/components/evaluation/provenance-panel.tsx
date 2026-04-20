'use client'

import { ExternalLink, FileText } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import type { RuleCitation } from '@/lib/agent-types'

type Props = {
  citations: RuleCitation[]
}

export function ProvenancePanel({ citations }: Props) {
  if (citations.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sources</p>
      <ul className="flex flex-col gap-1.5">
        {citations.map(citation => (
          <li key={citation.rule_id}>
            <Dialog>
              <DialogTrigger
                render={
                  <button
                    type="button"
                    className="group flex w-full items-start gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                }
              >
                <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex-1">
                  <span className="block font-medium text-foreground">{citation.rule_id}</span>
                  <span className="block text-muted-foreground">
                    {citation.source_pdf} · {citation.page_ref}
                  </span>
                </span>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{citation.rule_id}</DialogTitle>
                  <DialogDescription>
                    {citation.source_pdf} — {citation.page_ref}
                  </DialogDescription>
                </DialogHeader>
                <blockquote className="border-l-2 border-primary/40 bg-muted/50 px-3 py-2 text-sm italic">
                  {citation.passage}
                </blockquote>
                {citation.source_url && (
                  <a
                    href={citation.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-2"
                  >
                    <ExternalLink className="size-3" aria-hidden />
                    Open source PDF
                  </a>
                )}
              </DialogContent>
            </Dialog>
          </li>
        ))}
      </ul>
    </div>
  )
}
