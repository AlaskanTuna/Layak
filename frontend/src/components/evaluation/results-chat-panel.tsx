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
      {/* Floating action button — stacked ABOVE the FloatingHelpLauncher.
          Uses the exact same `Button size="icon-lg"` shape (size-9 → 36×36 px)
          and `glass-surface` styling as the help launcher so the two FABs
          render identically and right-align flush. The help launcher sits
          at bottom-4 / md:bottom-6; bottom-16 / md:bottom-20 puts this
          button ~12 px above it (36 px button + 16 px gap = 52 px → bottom-16). */}
      {!isOpen && (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="glass-surface fixed right-4 bottom-16 z-40 rounded-full text-foreground shadow-lg hover:bg-accent/25 hover:text-foreground md:right-6 md:bottom-20 dark:hover:bg-accent/35"
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
          <div className="border-border/70 bg-card/96 supports-[backdrop-filter]:bg-card/88 dark:bg-card/95 dark:supports-[backdrop-filter]:bg-card/82 flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border backdrop-blur-2xl backdrop-saturate-150 shadow-[0_28px_72px_rgb(15_23_42/0.16),inset_0_1px_0_rgb(255_255_255/0.42)] dark:shadow-[0_28px_72px_rgb(0_0_0/0.48),inset_0_1px_0_rgb(255_255_255/0.08)] sm:h-[640px] sm:max-h-[80vh] sm:rounded-2xl">
            <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{t('evaluation.chat.title')}</span>
                <span className="text-xs text-muted-foreground">{t('evaluation.chat.subtitle')}</span>
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
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label={t('evaluation.chat.close')}
                  className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {chat.messages.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                  {t('evaluation.chat.emptyBody')}
                </div>
              )}

              {chat.messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}

              {chat.errorMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>{chat.errorMessage}</p>
                </div>
              )}

              {showSuggestions && (
                <div className="flex flex-col gap-2 pt-2">
                  <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    {t('evaluation.chat.suggestionsLabel')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSuggestion(s)}
                        disabled={chat.isStreaming}
                        className="rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <footer className="border-t border-border bg-muted/20 px-3 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('evaluation.chat.placeholder')}
                  rows={1}
                  className="max-h-32 min-h-[40px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
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
                  >
                    <Send className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">{t('evaluation.chat.disclaimer')}</p>
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
            ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground'
            : 'max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground'
        }
      >
        <p className="whitespace-pre-wrap break-words">
          {renderInlineCitations(message.content)}
          {message.streaming && (
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-current align-middle" aria-hidden />
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
                  className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition hover:text-foreground"
                  title={c.snippet || c.source_pdf || c.scheme_id || ''}
                >
                  {c.scheme_id ?? c.source_pdf}
                </button>
              ))}
          </div>
        )}
        {!isUser && message.groundingUnavailable && !message.streaming && (
          <p className="mt-2 text-[10px] text-muted-foreground italic">{t('evaluation.chat.groundingUnavailable')}</p>
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
