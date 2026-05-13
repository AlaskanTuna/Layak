'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ErrorCategory, StrategyAdvice } from '@/lib/agent-types'
import type {
  ChatEvent,
  ChatMessage,
  ChatRequest,
  ChatScenarioContext,
  ChatTurn
} from '@/lib/chat-types'
import { authedFetch } from '@/lib/firebase'

/**
 * Phase 10 — `use-chat` SSE consumer for the results-page chatbot.
 *
 * Mirrors `use-agent-pipeline.ts`'s SSE pattern (TextDecoder + `\n\n`-
 * delimited `data:` lines). The chat surface is shorter-lived (single turn
 * per send) so we lean on local state instead of a reducer; abort + error
 * paths route through the same conventions.
 *
 * The hook is instantiated once per chat panel mount; conversation history
 * is local to that instance. Refreshing the page wipes it (server doesn't
 * persist chat in v1).
 */

function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'
}

async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'))
        if (!dataLine) continue
        const payload = dataLine.slice(5).trim()
        if (!payload) continue
        yield JSON.parse(payload) as ChatEvent
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export type UseChatResult = {
  messages: ChatMessage[]
  send: (
    message: string,
    opts?: { advisory?: StrategyAdvice; scenarioContext?: ChatScenarioContext | null }
  ) => void
  abort: () => void
  reset: () => void
  isStreaming: boolean
  errorCategory: ErrorCategory | null
  errorMessage: string | null
  /** Phase 11 Feature 2 — Strategy section handoff. Stages the advisory's
   *  `suggested_chat_prompt` as a draft (the chat panel reads `pendingDraft`
   *  to populate its textarea); the next `send()` call will carry the
   *  advisory through to the backend's `recent_advisory` field. */
  handoffFromAdvice: (advice: StrategyAdvice, scenarioContext?: ChatScenarioContext | null) => void
  handoffFromScenario: (scenarioContext: ChatScenarioContext, draft: string) => void
  pendingDraft: string | null
  consumePendingDraft: () => void
  pendingAdvisory: StrategyAdvice | null
  pendingScenarioContext: ChatScenarioContext | null
}

export function useChat(evalId: string): UseChatResult {
  const { i18n } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [errorCategory, setErrorCategory] = useState<ErrorCategory | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Phase 11 Feature 2 — handoff staging. `pendingDraft` is the prefilled
  // textarea content; `pendingAdvisory` is the advisory whose context
  // should be attached to the NEXT `send()`. The chat panel reads both,
  // calls `consumePendingDraft()` after rendering the textarea value, and
  // forwards the advisory as the second arg to `send()`.
  const [pendingDraft, setPendingDraft] = useState<string | null>(null)
  const [pendingAdvisory, setPendingAdvisory] = useState<StrategyAdvice | null>(null)
  const [pendingScenarioContext, setPendingScenarioContext] = useState<ChatScenarioContext | null>(null)

  const cleanup = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setMessages([])
    setIsStreaming(false)
    setErrorCategory(null)
    setErrorMessage(null)
    setPendingDraft(null)
    setPendingAdvisory(null)
    setPendingScenarioContext(null)
  }, [cleanup])

  const abort = useCallback(() => {
    cleanup()
    setIsStreaming(false)
  }, [cleanup])

  const send = useCallback(
    (
      message: string,
      opts?: { advisory?: StrategyAdvice; scenarioContext?: ChatScenarioContext | null }
    ) => {
      const trimmed = message.trim()
      if (!trimmed || isStreaming) return

      const userTurn: ChatMessage = {
        id: localId(),
        role: 'user',
        content: trimmed
      }
      const modelTurnId = localId()
      const modelTurn: ChatMessage = {
        id: modelTurnId,
        role: 'model',
        content: '',
        streaming: true
      }

      setErrorCategory(null)
      setErrorMessage(null)
      setIsStreaming(true)
      setMessages((prev) => [...prev, userTurn, modelTurn])

      // Snapshot history BEFORE this turn — server expects the prior context,
      // not the current user message (which is sent separately).
      const priorHistory: ChatTurn[] = messages
        .filter((m) => !m.streaming && m.content.length > 0)
        .map((m) => ({ role: m.role, content: m.content }))

      const language = (['en', 'ms', 'zh'] as const).find((l) => i18n.language.startsWith(l)) ?? 'en'
      // Prefer an explicit per-call advisory, then fall back to the staged
      // handoff advisory. Either way, clear the staged advisory after one
      // consumption so the next free-form turn is plain.
      const attachedAdvisory = opts?.advisory ?? pendingAdvisory ?? null
      if (pendingAdvisory && !opts?.advisory) {
        setPendingAdvisory(null)
      }
      const attachedScenarioContext = opts?.scenarioContext ?? pendingScenarioContext ?? null
      if (pendingScenarioContext && !opts?.scenarioContext) {
        setPendingScenarioContext(null)
      }
      const body: ChatRequest = {
        history: priorHistory,
        message: trimmed,
        language,
        recent_advisory: attachedAdvisory,
        scenario_context: attachedScenarioContext
      }

      const controller = new AbortController()
      abortRef.current = controller
      ;(async () => {
        try {
          const res = await authedFetch(`${getBackendUrl()}/api/evaluations/${evalId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
          })
          if (!res.ok || !res.body) {
            throw new Error(`Chat backend returned ${res.status}`)
          }
          for await (const event of parseSseStream(res.body)) {
            if (event.type === 'token') {
              setMessages((prev) =>
                prev.map((m) => (m.id === modelTurnId ? { ...m, content: m.content + event.text } : m))
              )
            } else if (event.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === modelTurnId
                    ? {
                        ...m,
                        id: event.message_id,
                        streaming: false,
                        citations: event.citations,
                        groundingUnavailable: event.grounding_unavailable
                      }
                    : m
                )
              )
            } else if (event.type === 'error') {
              setErrorCategory(event.category)
              setErrorMessage(event.message)
              setMessages((prev) => prev.filter((m) => m.id !== modelTurnId))
            }
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            // User-initiated cancel — drop the placeholder turn silently.
            setMessages((prev) => prev.filter((m) => m.id !== modelTurnId))
          } else {
            setErrorCategory(null)
            setErrorMessage((err as Error).message || 'Chat request failed')
            setMessages((prev) => prev.filter((m) => m.id !== modelTurnId))
          }
        } finally {
          setIsStreaming(false)
          abortRef.current = null
        }
      })()
    },
    [evalId, i18n.language, isStreaming, messages, pendingAdvisory, pendingScenarioContext]
  )

  const handoffFromAdvice = useCallback(
    (advice: StrategyAdvice, scenarioContext?: ChatScenarioContext | null) => {
      setPendingDraft(advice.suggested_chat_prompt ?? advice.headline)
      setPendingAdvisory(advice)
      setPendingScenarioContext(scenarioContext ?? null)
    },
    []
  )

  const handoffFromScenario = useCallback((scenarioContext: ChatScenarioContext, draft: string) => {
    setPendingDraft(draft)
    setPendingAdvisory(null)
    setPendingScenarioContext(scenarioContext)
  }, [])

  const consumePendingDraft = useCallback(() => {
    setPendingDraft(null)
  }, [])

  return {
    messages,
    send,
    abort,
    reset,
    isStreaming,
    errorCategory,
    errorMessage,
    handoffFromAdvice,
    handoffFromScenario,
    pendingDraft,
    consumePendingDraft,
    pendingAdvisory,
    pendingScenarioContext
  }
}
