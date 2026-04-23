'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ErrorCategory } from '@/lib/agent-types'
import type {
  ChatEvent,
  ChatMessage,
  ChatRequest,
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
 * persist chat in v1 per docs/plan.md Phase 10 Task 7).
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
        const dataLine = chunk.split('\n').find(line => line.startsWith('data:'))
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
  send: (message: string) => void
  abort: () => void
  reset: () => void
  isStreaming: boolean
  errorCategory: ErrorCategory | null
  errorMessage: string | null
}

export function useChat(evalId: string): UseChatResult {
  const { i18n } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [errorCategory, setErrorCategory] = useState<ErrorCategory | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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
  }, [cleanup])

  const abort = useCallback(() => {
    cleanup()
    setIsStreaming(false)
  }, [cleanup])

  const send = useCallback(
    (message: string) => {
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
      setMessages(prev => [...prev, userTurn, modelTurn])

      // Snapshot history BEFORE this turn — server expects the prior context,
      // not the current user message (which is sent separately).
      const priorHistory: ChatTurn[] = messages
        .filter(m => !m.streaming && m.content.length > 0)
        .map(m => ({ role: m.role, content: m.content }))

      const language = (['en', 'ms', 'zh'] as const).find(l => i18n.language.startsWith(l)) ?? 'en'
      const body: ChatRequest = {
        history: priorHistory,
        message: trimmed,
        language
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
              setMessages(prev =>
                prev.map(m =>
                  m.id === modelTurnId ? { ...m, content: m.content + event.text } : m
                )
              )
            } else if (event.type === 'done') {
              setMessages(prev =>
                prev.map(m =>
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
              setMessages(prev => prev.filter(m => m.id !== modelTurnId))
            }
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            // User-initiated cancel — drop the placeholder turn silently.
            setMessages(prev => prev.filter(m => m.id !== modelTurnId))
          } else {
            setErrorCategory(null)
            setErrorMessage((err as Error).message || 'Chat request failed')
            setMessages(prev => prev.filter(m => m.id !== modelTurnId))
          }
        } finally {
          setIsStreaming(false)
          abortRef.current = null
        }
      })()
    },
    [evalId, i18n.language, isStreaming, messages]
  )

  return {
    messages,
    send,
    abort,
    reset,
    isStreaming,
    errorCategory,
    errorMessage
  }
}
