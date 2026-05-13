'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Loader2, Maximize2, Minimize2, RotateCcw, Send, Sparkles, X } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from '@/components/ui/button'
import type { SchemeMatch } from '@/lib/agent-types'
import type { ChatMessage } from '@/lib/chat-types'
import { type UseChatResult } from '@/hooks/use-chat'

const CIK_LAY_ICON = '/chatbot/cik-lay-icon.webp'

type Props = {
  evalId: string
  matches: SchemeMatch[]
  // Parent owns the hook so StrategySection's "Ask Cik Lay" CTA can stage a draft on the same instance.
  chat: UseChatResult
}

const PULSE_DURATION_MS = 10_000
const IDLE_DURATION_MS = 60_000
const CLICK_COOLDOWN_MS = 180_000
const INITIAL_DELAY_MS = 800

const INITIAL_CHIPS = 4
const FOLLOWUP_CHIPS = 4

export function ResultsChatPanel({ evalId, matches, chat }: Props) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isModal, setIsModal] = useState(false)
  const [draft, setDraft] = useState('')
  const [isPulsing, setIsPulsing] = useState(false)
  const [cooldownNonce, setCooldownNonce] = useState(0)
  const cooldownPendingRef = useRef(false)
  const [sessionNonce, setSessionNonce] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  void evalId

  const qualifyingMatches = useMemo(() => matches.filter((m) => m.qualifies), [matches])

  const initialPool = useMemo(() => buildInitialSuggestionPool(qualifyingMatches, t), [qualifyingMatches, t])
  const suggestions = useMemo(
    () => pickRandom(initialPool, INITIAL_CHIPS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialPool, sessionNonce]
  )

  const followUpPool = useMemo(() => buildFollowUpPool(t), [t])
  const lastMessage = chat.messages[chat.messages.length - 1] ?? null
  const showInitial = chat.messages.length === 0 && suggestions.length > 0
  const showFollowUps =
    !showInitial && !!lastMessage && lastMessage.role === 'model' && !lastMessage.streaming && !chat.isStreaming
  const followUpKey = lastMessage?.id ?? 'none'
  const followUps = useMemo(
    () => (showFollowUps ? pickRandom(followUpPool, FOLLOWUP_CHIPS) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [followUpPool, followUpKey, showFollowUps]
  )

  // Pulse 10s → idle 60s → repeat. Opening the panel re-arms with CLICK_COOLDOWN_MS instead.
  useEffect(() => {
    let cancelled = false
    let timer = 0

    const initialDelay = cooldownPendingRef.current ? CLICK_COOLDOWN_MS : INITIAL_DELAY_MS
    cooldownPendingRef.current = false

    const pulseOn = () => {
      if (cancelled) return
      setIsPulsing(true)
      timer = window.setTimeout(() => {
        if (cancelled) return
        setIsPulsing(false)
        timer = window.setTimeout(pulseOn, IDLE_DURATION_MS)
      }, PULSE_DURATION_MS)
    }

    timer = window.setTimeout(pulseOn, initialDelay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      setIsPulsing(false)
    }
  }, [cooldownNonce])

  const handleOpenPanel = useCallback(() => {
    setIsOpen(true)
    setIsPulsing(false)
    cooldownPendingRef.current = true
    setCooldownNonce((n) => n + 1)
  }, [])

  const handleClosePanel = useCallback(() => {
    setIsOpen(false)
    setIsModal(false)
  }, [])

  const handleResetChat = useCallback(() => {
    chat.reset()
    setDraft('')
    setSessionNonce((n) => n + 1)
  }, [chat])

  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [isOpen, chat.messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen, isModal])

  // Strategy CTA handoff: consume the staged draft from the shared chat hook.
  useEffect(() => {
    if (chat.pendingDraft == null) return
    const draftValue = chat.pendingDraft
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(draftValue)
    setIsOpen(true)
    setIsPulsing(false)
    cooldownPendingRef.current = true
    setCooldownNonce((n) => n + 1)
    chat.consumePendingDraft()
  }, [chat])

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

  const wrapperClass = isModal
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-md dark:bg-black/55'
    : 'fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:inset-auto sm:right-6 sm:bottom-6 sm:bg-transparent sm:backdrop-blur-none'

  const panelClass = isModal
    ? 'glass-grid-panel flex h-[85vh] w-[92vw] max-w-2xl flex-col overflow-hidden rounded-[20px] sm:h-[80vh]'
    : 'glass-grid-panel flex h-[85vh] min-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] sm:h-[640px] sm:min-h-[640px] sm:max-h-[80vh] sm:rounded-[20px]'

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          aria-label={t('evaluation.chat.openButton')}
          onClick={handleOpenPanel}
          className={`group fixed right-4 bottom-20 z-40 inline-flex size-12 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[color:var(--hibiscus)]/30 bg-[color:var(--paper)] shadow-[0_18px_40px_-18px_color-mix(in_oklch,var(--ink)_45%,transparent)] transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[color:var(--hibiscus)]/40 md:right-6 md:bottom-20 ${
            isPulsing ? 'pulse-soft' : ''
          }`}
        >
          <Image
            src={CIK_LAY_ICON}
            alt="Cik Lay"
            width={48}
            height={48}
            className="size-12 object-cover transition-transform group-hover:scale-110"
            priority
          />
        </button>
      )}

      {isOpen && (
        <div
          role="dialog"
          aria-label={t('evaluation.chat.title')}
          className={wrapperClass}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClosePanel()
          }}
        >
          <div className={panelClass}>
            <header className="relative flex items-center justify-between gap-2 border-b border-foreground/10 bg-foreground/[0.025] px-4 py-3.5 backdrop-blur-md backdrop-saturate-150">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-[color:var(--hibiscus)]/70"
              />
              <div className="flex items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--hibiscus)]/25 bg-[color:var(--paper)]">
                  <Image src={CIK_LAY_ICON} alt="Cik Lay" width={40} height={40} className="size-10 object-cover" />
                </span>
                <div className="flex flex-col">
                  <span className="mono-caption text-[color:var(--hibiscus)]">Cik Lay · Pegawai Skim</span>
                  <span className="mt-0.5 font-heading text-[15px] font-semibold text-foreground">
                    {t('evaluation.chat.title')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {chat.messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetChat}
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
                  onClick={() => setIsModal((v) => !v)}
                  aria-label={
                    isModal
                      ? t('evaluation.chat.collapse', 'Collapse to side panel')
                      : t('evaluation.chat.expand', 'Expand to centre modal')
                  }
                  title={isModal ? t('evaluation.chat.collapse', 'Collapse') : t('evaluation.chat.expand', 'Expand')}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground/60 transition hover:bg-foreground/[0.05] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {isModal ? (
                    <Minimize2 className="h-4 w-4" aria-hidden />
                  ) : (
                    <Maximize2 className="h-4 w-4" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClosePanel}
                  aria-label={t('evaluation.chat.close')}
                  className="-mr-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-foreground/60 transition hover:bg-foreground/[0.05] hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </header>

            {/* min-h-0 is the flexbox + overflow fix to keep this area filling available height. */}
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4">
              {chat.messages.length === 0 && (
                <div className="rounded-[12px] border border-dashed border-foreground/20 bg-foreground/[0.04] px-3.5 py-3 text-sm text-foreground/72 backdrop-blur-md backdrop-saturate-150">
                  <p className="mono-caption mb-1.5 text-foreground/55">Hi, I&apos;m Cik Lay</p>
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

              {showInitial && (
                <SuggestionsBlock
                  label={t('evaluation.chat.suggestionsLabel')}
                  chips={suggestions}
                  disabled={chat.isStreaming}
                  onPick={handleSuggestion}
                />
              )}

              {showFollowUps && followUps.length > 0 && (
                <SuggestionsBlock
                  label={t('evaluation.chat.followUpsLabel', 'Follow-up questions')}
                  chips={followUps}
                  disabled={chat.isStreaming}
                  onPick={handleSuggestion}
                />
              )}

              <div ref={messagesEndRef} />
            </div>

            <footer className="border-t border-foreground/10 bg-foreground/[0.025] px-3 py-3 backdrop-blur-md backdrop-saturate-150">
              {chat.pendingScenarioContext && (
                <p className="mono-caption mb-2 text-[color:var(--primary)]">{t('evaluation.chat.scenarioQueued')}</p>
              )}
              <div className="flex items-stretch gap-2">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('evaluation.chat.placeholder')}
                  rows={1}
                  className="max-h-32 min-h-[44px] flex-1 resize-none rounded-md border border-foreground/15 bg-background/55 px-3 py-2.5 text-sm backdrop-blur-md backdrop-saturate-150 focus:border-[color:var(--hibiscus)]/45 focus:outline-none focus:ring-2 focus:ring-[color:var(--hibiscus)]/30 disabled:opacity-60"
                  disabled={chat.isStreaming}
                  maxLength={4000}
                />
                {chat.isStreaming ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={chat.abort}
                    aria-label={t('evaluation.chat.abort')}
                    className="h-11 w-11 shrink-0 rounded-md bg-background/55 p-0 backdrop-blur-md backdrop-saturate-150"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSend}
                    disabled={!draft.trim()}
                    aria-label={t('evaluation.chat.send')}
                    className="h-11 w-11 shrink-0 rounded-md bg-[color:var(--hibiscus)]/82 p-0 text-[color:var(--hibiscus-foreground)] backdrop-blur-md backdrop-saturate-150 hover:bg-[color:var(--hibiscus)]/95 disabled:bg-foreground/15 disabled:text-foreground/40 disabled:backdrop-blur-none"
                  >
                    <Send className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}

function SuggestionsBlock({
  label,
  chips,
  disabled,
  onPick
}: {
  label: string
  chips: string[]
  disabled: boolean
  onPick: (text: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <p className="mono-caption flex items-center gap-1.5 text-foreground/55">
        <Sparkles className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <div className="flex flex-wrap justify-start gap-2">
        {chips.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            disabled={disabled}
            className="cursor-pointer rounded-full border border-[color:var(--hibiscus)]/30 bg-[color:var(--hibiscus)]/[0.08] px-3 py-1.5 text-xs text-foreground backdrop-blur-md backdrop-saturate-150 transition hover:border-[color:var(--hibiscus)]/55 hover:bg-[color:var(--hibiscus)]/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

// Headings rendered inline-bold because Cik Lay's prompt forbids H1/H2.
const MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0 leading-[1.55]">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5 first:mt-0 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5 first:mt-0 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.5]">{children}</li>,
  code: ({ children, className }) => {
    const isBlock = (className ?? '').includes('language-')
    if (isBlock) {
      return (
        <pre className="my-2 overflow-x-auto rounded-md bg-foreground/[0.08] p-2.5 font-mono text-[12px] leading-[1.5]">
          <code>{children}</code>
        </pre>
      )
    }
    return <code className="rounded bg-foreground/[0.08] px-1 py-0.5 font-mono text-[12px]">{children}</code>
  },
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[color:var(--hibiscus)] underline decoration-[color:var(--hibiscus)]/40 underline-offset-2 hover:decoration-[color:var(--hibiscus)]"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <p className="mt-1.5 mb-1 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mt-1.5 mb-1 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mt-1.5 mb-1 font-semibold">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-2 border-foreground/20 pl-3 text-foreground/75">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-[12.5px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-foreground/15 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-foreground/8 px-2 py-1">{children}</td>
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation()
  const isUser = message.role === 'user'
  const cleaned = useMemo(() => cleanInlineCitations(message.content), [message.content])
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          isUser
            ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-[color:var(--hibiscus)] px-3.5 py-2 text-sm text-[color:var(--hibiscus-foreground)] shadow-[0_8px_18px_-10px_color-mix(in_oklch,var(--hibiscus)_60%,transparent)]'
            : 'max-w-[90%] rounded-2xl rounded-bl-sm border border-foreground/10 bg-background/85 px-3.5 py-2 text-sm text-foreground'
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-[1.55]">{cleaned}</p>
        ) : (
          <div className="break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
              {cleaned}
            </ReactMarkdown>
          </div>
        )}
        {message.streaming && (
          <span
            className={`mt-1 ml-0.5 inline-block h-3 w-1.5 animate-pulse align-middle ${
              isUser ? 'bg-[color:var(--hibiscus-foreground)]' : 'bg-[color:var(--hibiscus)]'
            }`}
            aria-hidden
          />
        )}
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
          <p className="mono-caption mt-2 italic text-foreground/55">{t('evaluation.chat.groundingUnavailable')}</p>
        )}
      </div>
    </div>
  )
}

// Strips [scheme:xxx] markers and repairs two recurring Gemini emphasis defects:
// whitespace inside ** runs (CommonMark flanking strips them) and single-asterisk
// closes before a colon. The cap + terminator exclusion confines the flanking
// regexes to single-phrase typos so they don't bold prose between adjacent runs.
function cleanInlineCitations(text: string): string {
  return text
    .replace(/\s*\[\s*scheme\s*:\s*[a-z0-9_]+\s*\]\s*/gi, ' ')
    .replace(/\*\*([^*\n]+?)\s*:\s*\*(?!\*)/g, '**$1:** ')
    .replace(/(\*{1,2})\s+([^*.!?\n]{1,80}?)\s+\1/g, '$1$2$1')
    .replace(/(\*{1,2})([^*.!?\s\n][^*.!?\n]{0,80}?)\s+\1/g, '$1$2$1')
    .replace(/(\*{1,2})\s+([^*.!?\n]{1,80}?[^*\s\n])\1/g, '$1$2$1')
    .replace(/ {2,}/g, ' ')
    .trim()
}

function pickRandom<T>(pool: T[], n: number): T[] {
  if (n >= pool.length) return pool.slice()
  const arr = pool.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, n)
}

function buildInitialSuggestionPool(
  matches: SchemeMatch[],
  t: (key: string, opts?: Record<string, string | number>) => string
): string[] {
  const pool: string[] = []
  if (matches.length > 0) {
    const top = matches[0]
    pool.push(t('evaluation.chat.suggestions.whyQualify', { scheme: top.scheme_name }))
  }
  pool.push(t('evaluation.chat.suggestions.howApply'))
  pool.push(t('evaluation.chat.suggestions.documents'))
  if (matches.length >= 2) {
    pool.push(t('evaluation.chat.suggestions.deadlines'))
  }
  pool.push(
    t('evaluation.chat.suggestions.whereToSubmit', {
      defaultValue: 'Where do I submit my application?'
    })
  )
  pool.push(
    t('evaluation.chat.suggestions.howAmountCalculated', {
      defaultValue: 'How is the amount calculated?'
    })
  )
  pool.push(
    t('evaluation.chat.suggestions.appealRejected', {
      defaultValue: 'Can I appeal if my application is rejected?'
    })
  )
  pool.push(
    t('evaluation.chat.suggestions.renewalCadence', {
      defaultValue: 'Do I need to renew these applications yearly?'
    })
  )
  return pool
}

function buildFollowUpPool(t: (key: string, opts?: Record<string, string | number>) => string): string[] {
  return [
    t('evaluation.chat.followUps.tellMore', { defaultValue: 'Tell me more about this scheme.' }),
    t('evaluation.chat.followUps.eligibility', { defaultValue: 'What is the eligibility criteria?' }),
    t('evaluation.chat.followUps.howCalculated', { defaultValue: 'How is the amount calculated?' }),
    t('evaluation.chat.followUps.deadline', { defaultValue: 'What is the application deadline?' }),
    t('evaluation.chat.followUps.applyOnline', { defaultValue: 'Can I apply online?' }),
    t('evaluation.chat.followUps.whereSubmit', { defaultValue: 'Where do I submit my application?' }),
    t('evaluation.chat.followUps.missDeadline', { defaultValue: 'What if I miss the deadline?' }),
    t('evaluation.chat.followUps.multiple', { defaultValue: 'Can I qualify for multiple schemes at once?' }),
    t('evaluation.chat.followUps.taxImpact', { defaultValue: 'Are there any tax implications?' }),
    t('evaluation.chat.followUps.notification', { defaultValue: 'How will I be notified if I am approved?' }),
    t('evaluation.chat.followUps.changes', { defaultValue: 'What if my circumstances change?' }),
    t('evaluation.chat.followUps.trackStatus', { defaultValue: 'Can I track my application status?' })
  ]
}
