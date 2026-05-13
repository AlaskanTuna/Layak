/**
 * Phase 10 — TypeScript mirrors of `backend/app/schema/chat.py`.
 *
 * Keep these in lockstep with the backend Pydantic models. The chat SSE
 * wire is structurally separate from the pipeline SSE, so we don't reuse
 * `agent-types.ts` — but `ErrorCategory` is shared (the chat error event
 * pipes through `humanize_error` exactly like the pipeline's `ErrorEvent`).
 */

import type { ErrorCategory, StrategyAdvice, WhatIfRequest, WhatIfResponse } from '@/lib/agent-types'

export type ChatRole = 'user' | 'model'

export type ChatTurn = {
  role: ChatRole
  content: string
}

export type ChatRequest = {
  history: ChatTurn[]
  message: string
  language: 'en' | 'ms' | 'zh'
  /** Phase 11 Feature 2 — optional advisory the user just clicked into. */
  recent_advisory?: StrategyAdvice | null
  scenario_context?: ChatScenarioContext | null
}

/** Mirrors backend `ScenarioContext`: compact active What-If preview facts. */
export type ChatScenarioContext = {
  overrides: WhatIfRequest['overrides']
  total_annual_rm: WhatIfResponse['total_annual_rm']
  matches: WhatIfResponse['matches']
  deltas: WhatIfResponse['deltas']
  strategy: WhatIfResponse['strategy']
}

export type ChatCitation = {
  scheme_id?: string | null
  source_pdf?: string | null
  snippet: string
  source_uri?: string | null
}

export type ChatTokenEvent = {
  type: 'token'
  text: string
}

export type ChatDoneEvent = {
  type: 'done'
  message_id: string
  citations: ChatCitation[]
  grounding_unavailable: boolean
}

export type ChatErrorEvent = {
  type: 'error'
  category: ErrorCategory | null
  message: string
}

export type ChatEvent = ChatTokenEvent | ChatDoneEvent | ChatErrorEvent

/** A locally-rendered chat message in the panel. `id` is server-assigned for
 *  model turns (the `ChatDoneEvent.message_id`) and locally-minted for user
 *  turns. `streaming=true` flags the in-flight model turn so the UI can render
 *  a typing cursor and disable the send button. */
export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  streaming?: boolean
  citations?: ChatCitation[]
  groundingUnavailable?: boolean
}
