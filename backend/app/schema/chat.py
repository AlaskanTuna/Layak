"""Pydantic models for the results-page chatbot.

Wire shape (locked):

    POST /api/evaluations/{eval_id}/chat
    Authorization: Bearer <firebase-id-token>
    Content-Type: application/json
    Body: ChatRequest

    Response: text/event-stream
        ChatTokenEvent  { type: "token",  text }
        ChatDoneEvent   { type: "done",   message_id, citations[], grounding_unavailable }
        ChatErrorEvent  { type: "error",  category|null, message }

The chatbot is hard-constrained to a single `evaluations/{eval_id}` doc —
the eval is the entire context window. History is supplied per-call by the
client (no Firestore-side conversation log in v1); the client is the source
of truth for turn ordering.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schema.events import ErrorCategory
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.scheme import SchemeMatch
from app.schema.strategy import StrategyAdvice
from app.schema.what_if import SchemeDelta

# Hard caps. The 4 KiB per-message cap matches the input-validator length
# guard in `app.services.chat`; the 20-turn history cap keeps the prompt
# under Gemini's per-call context budget while leaving headroom for the
# eval-context digest the system instruction injects.
MAX_MESSAGE_CHARS = 4000
MAX_HISTORY_TURNS = 20
MAX_CITATION_SNIPPET_CHARS = 600


class ChatTurn(BaseModel):
    """One turn in the rolling client-supplied history.

    `role="user"` for the citizen, `role="model"` for the assistant. We
    reuse Gemini's role names so the history can be re-projected into a
    Gemini `contents=[...]` list without a re-mapping table.
    """

    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "model"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)


class ChatRequest(BaseModel):
    """POST body for `/api/evaluations/{eval_id}/chat`.

    The client carries history; the server carries eval context. `language`
    is the language the response should render in — defaults to English so a
    legacy client that never sends the field still works.

    `recent_advisory` (Phase 11 Feature 2): optional handoff context from the
    Strategy section. When the user clicks "Ask Cik Lay about this" on a
    StrategyCard, the frontend packages the card's payload here so the
    system prompt can inject a "Recent advisory" block — Cik Lay then
    answers with the specific cross-scheme context already in mind.
    """

    model_config = ConfigDict(extra="forbid")

    history: list[ChatTurn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    language: SupportedLanguage = DEFAULT_LANGUAGE
    recent_advisory: StrategyAdvice | None = None
    scenario_context: ScenarioContext | None = None


class ScenarioContext(BaseModel):
    """Compact active What-If preview facts passed from the results page."""

    model_config = ConfigDict(extra="forbid")

    overrides: dict[str, float | int] = Field(default_factory=dict)
    total_annual_rm: float = Field(ge=0)
    matches: list[SchemeMatch] = Field(default_factory=list)
    deltas: list[SchemeDelta] = Field(default_factory=list)
    strategy: list[StrategyAdvice] = Field(default_factory=list)


class ChatCitation(BaseModel):
    """One source attribution surfaced under an assistant turn.

    Two flavours:
      - `scheme_id` set + `source_pdf` set → this citation refers to a scheme
        in the eval's matches list. Frontend renders it as a chip that
        scrolls + highlights the corresponding scheme card on the page.
      - `scheme_id` None + `source_pdf` set → this citation came from
        Vertex AI Search retrieval over a scheme PDF that wasn't in the
        eval's matches (e.g. user asked about a scheme they don't qualify
        for). Frontend renders as a passive PDF-source chip.
    """

    model_config = ConfigDict(extra="forbid")

    scheme_id: str | None = None
    source_pdf: str | None = None
    snippet: str = Field(default="", max_length=MAX_CITATION_SNIPPET_CHARS)
    source_uri: str | None = None


class ChatTokenEvent(BaseModel):
    """One streaming text chunk from Gemini. Frontend appends `text` to the
    in-flight assistant turn as it arrives."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["token"] = "token"
    text: str


class ChatDoneEvent(BaseModel):
    """Terminal success event. `message_id` is a server-minted UUID the
    client can use as a React key + future Firestore lookup. `citations`
    aggregates everything Gemini grounded against during this turn.
    `grounding_unavailable` flips True when the Vertex AI Search retrieval
    Tool failed to attach (datastore unreachable, IAM denial, etc.) so the
    UI can surface a "responses are not currently grounded on PDFs" caveat
    without breaking the flow."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["done"] = "done"
    message_id: str
    citations: list[ChatCitation] = Field(default_factory=list)
    grounding_unavailable: bool = False


class ChatErrorEvent(BaseModel):
    """Terminal failure event. Mirrors the pipeline `ErrorEvent` so the
    frontend can reuse the same category-keyed recovery copy. `category`
    is None for unknown / unclassified failures (frontend falls through to
    a generic recovery card)."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["error"] = "error"
    category: ErrorCategory | None = None
    message: str = Field(min_length=1)


ChatEvent = ChatTokenEvent | ChatDoneEvent | ChatErrorEvent
