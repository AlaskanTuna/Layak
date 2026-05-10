'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Bot, Loader2, RotateCcw, Send, Sparkles, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { SchemeMatch } from '@/lib/agent-types'
import type { ChatMessage } from '@/lib/chat-types'
import { useChat } from '@/hooks/use-chat'

/**
 * Phase 10 — floating chatbot panel for `/dashboard/evaluation/results/[id]`.
 *
 * Surfaces only when an evaluation is complete + has at least one qualifying
 * match (no chat without context). Floating action button → expanding card
 * (desktop bottom-right, mobile near-fullscreen) using fixed-position only,
 * so the page tree underneath isn't rearranged.
 */

type Props = {
  evalId: string
  matches: SchemeMatch[]
}

export function ResultsChatPanel({ evalId, matches }: Props) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const chat = useChat(evalId)

  const qualifyingMatches = useMemo(() => matches.filter((m) => m.qualifies), [matches])
  const suggestions = useMemo(() => buildSuggestedQuestions(qualifyingMatches, t), [qualifyingMatches, t])

  // Auto-scroll the message list to the latest token as it streams in.
  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [isOpen, chat.messages])

  // Focus the textarea when the panel opens (desktop ergonomic — first-time
  // open on mobile may pop the keyboard, which is fine).
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const handleSend = useCallback(() => {
    const value = draft.trim()
    if (!value || chat.isStreaming) return
    chat.send(value)
    setDraft('')
  }, [draft, chat])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleSuggestion = useCallback(
    (text: string) => {
      if (chat.isStreaming) return
      chat.send(text)
    },
    [chat]
  )

  const showSuggestions = chat.messages.length === 0 && suggestions.length > 0

  return (
    <>
      {/* Floating action button — sits one slot above the help launcher.
          Hibiscus tinted so it reads as the *evaluation-level* action,
          distinct from the neutral help launcher below it. */}
      {!isOpen && (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="fixed right-4 bottom-16 z-40 cursor-pointer rounded-full border border-[color:var(--hibiscus)]/40 bg-[color:var(--hibiscus)] text-[color:var(--hibiscus-foreground)] shadow-[0_18px_40px_-18px_color-mix(in_oklch,var(--hibiscus)_70%,transparent)] hover:bg-[color:var(--hibiscus)]/92 md:right-6 md:bottom-20"
          aria-label={t('evaluation.chat.openButton')}
          onClick={() => setIsOpen(true)}
        >
          <Bot className="size-5" aria-hidden />
        </Button>
      )}

      {/* Expanding panel — fixed-position so it never affects page layout. */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t('evaluation.chat.title')}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:inset-auto sm:right-6 sm:bottom-6 sm:bg-transparent sm:backdrop-blur-none"
          onClick={(e) => {
            // Click backdrop (mobile) closes the panel.
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          <div className="glass-grid-panel flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] sm:h-[640px] sm:max-h-[80vh] sm:rounded-[20px]">
            {/* Header — paper letterhead with mono caption + DRAFT-style accent */}
            <header className="relative flex items-center justify-between gap-2 border-b border-foreground/10 px-4 py-3.5">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70"
              />
              <div className="flex flex-col">
                <span className="mono-caption text-[color:var(--hibiscus)]">Concierge</span>
                <span className="mt-0.5 font-heading text-[15px] font-semibold text-foreground">
                  {t('evaluation.chat.title')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {chat.messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      chat.reset()
                      setDraft('')
                    }}
                    aria-label={t('evaluation.chat.reset')}
                    title={t('evaluation.chat.reset')}
                    disabled={chat.isStreaming}
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground/60 transition hover:bg-foreground/[0.05] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={t('evaluation.chat.close')}
                  className="-mr-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground/60 transition hover:bg-foreground/[0.05] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {chat.messages.length === 0 && (
                <div className="rounded-[12px] border border-dashed border-foreground/20 bg-foreground/[0.03] px-3.5 py-3 text-sm text-foreground/65">
                  <p className="mono-caption mb-1.5 text-foreground/55">Ask the concierge</p>
                  {t('evaluation.chat.emptyBody')}
                </div>
              )}

              {chat.messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}

              {chat.errorMessage && (
                <div className="flex items-start gap-2 rounded-[10px] border border-[color:var(--hibiscus)]/40 bg-[color:var(--hibiscus)]/[0.06] px-3 py-2.5 text-sm text-[color:var(--hibiscus)]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>{chat.errorMessage}</p>
                </div>
              )}

              {showSuggestions && (
                <div className="flex flex-col gap-2 pt-2">
                  <p className="mono-caption flex items-center gap-1.5 text-foreground/55">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    {t('evaluation.chat.suggestionsLabel')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSuggestion(s)}
                        disabled={chat.isStreaming}
                        className="cursor-pointer rounded-full border border-[color:var(--hibiscus)]/30 bg-[color:var(--hibiscus)]/[0.06] px-3 py-1.5 text-xs text-foreground transition hover:border-[color:var(--hibiscus)]/55 hover:bg-[color:var(--hibiscus)]/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <footer className="border-t border-foreground/10 bg-foreground/[0.025] px-3 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('evaluation.chat.placeholder')}
                  rows={1}
                  className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-foreground/15 bg-background/70 px-3 py-2 text-sm focus:border-[color:var(--hibiscus)]/45 focus:outline-none focus:ring-2 focus:ring-[color:var(--hibiscus)]/30 disabled:opacity-60"
                  disabled={chat.isStreaming}
                  maxLength={4000}
                />
                {chat.isStreaming ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={chat.abort}
                    aria-label={t('evaluation.chat.abort')}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    aria-label={t('evaluation.chat.send')}
                    className="rounded-full bg-[color:var(--hibiscus)] px-3 text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92 disabled:bg-foreground/15 disabled:text-foreground/40"
                  >
                    <Send className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
              <p className="mono-caption mt-2 text-foreground/45">{t('evaluation.chat.disclaimer')}</p>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation()
  const isUser = message.role === 'user'
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          isUser
            ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[color:var(--hibiscus)] px-3.5 py-2 text-sm text-[color:var(--hibiscus-foreground)] shadow-[0_8px_18px_-10px_color-mix(in_oklch,var(--hibiscus)_60%,transparent)]'
            : 'max-w-[90%] rounded-2xl rounded-bl-sm border border-foreground/10 bg-background/85 px-3.5 py-2 text-sm text-foreground'
        }
      >
        <p className="whitespace-pre-wrap break-words">
          {renderInlineCitations(message.content)}
          {message.streaming && (
            <span
              className={`ml-0.5 inline-block h-3 w-1.5 animate-pulse align-middle ${
                isUser ? 'bg-[color:var(--hibiscus-foreground)]' : 'bg-[color:var(--hibiscus)]'
              }`}
              aria-hidden
            />
          )}
        </p>
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.citations
              .filter((c) => c.scheme_id || c.source_pdf)
              .slice(0, 5)
              .map((c, idx) => (
                <button
                  key={`${message.id}-cite-${idx}`}
                  type="button"
                  onClick={() => {
                    if (c.scheme_id) {
                      const target = document.getElementById(`scheme-${c.scheme_id}`)
                      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }}
                  className="citation-chip cursor-pointer hover:bg-[color:var(--primary)]/16"
                  title={c.snippet || c.source_pdf || c.scheme_id || ''}
                >
                  {c.scheme_id ?? c.source_pdf}
                </button>
              ))}
          </div>
        )}
        {!isUser && message.groundingUnavailable && !message.streaming && (
          <p className="mono-caption mt-2 italic text-foreground/55">
            {t('evaluation.chat.groundingUnavailable')}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Strip the `[scheme:xxx]` markers from rendered text — they're machine
 * markers consumed by the citation extractor, not human-readable. The
 * citation chips below the bubble carry the real surface.
 */
function renderInlineCitations(text: string): string {
  return text.replace(/\s*\[\s*scheme\s*:\s*[a-z0-9_]+\s*\]\s*/gi, ' ').trim()
}

/**
 * Per-language suggested-question chips. Derived from the eval's qualifying
 * matches so the suggestions are eval-context-aware ("Why do I qualify for
 * STR 2026?" only appears if STR 2026 is in the matches list).
 */
function buildSuggestedQuestions(
  matches: SchemeMatch[],
  t: (key: string, opts?: Record<string, string | number>) => string
): string[] {
  const chips: string[] = []
  if (matches.length > 0) {
    const top = matches[0]
    chips.push(t('evaluation.chat.suggestions.whyQualify', { scheme: top.scheme_name }))
  }
  if (matches.length > 0) {
    chips.push(t('evaluation.chat.suggestions.howApply'))
  }
  chips.push(t('evaluation.chat.suggestions.documents'))
  if (matches.length >= 2) {
    chips.push(t('evaluation.chat.suggestions.deadlines'))
  }
  return chips
}
