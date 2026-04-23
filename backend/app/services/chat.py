"""Phase 10 — chat orchestration: guardrails + Vertex AI Search grounding +
streaming Gemini call. Sits between `app/routes/chat.py` (request lifecycle)
and `app/agents/gemini.py` + `app/agents/chat_prompt.py` (LLM contract).

Five guardrail layers (see docs/plan.md Phase 10 Task 4):

    1. System prompt hard constraints  → app/agents/chat_prompt.py
    2. `safety_settings` BLOCK_LOW_AND_ABOVE on the four harm categories
    3. Input validator — regex + length cap (this module)
    4. Vertex AI Search grounding — first-class retrieval Tool
    5. Output validator — citation drift detection (this module)
"""

from __future__ import annotations

import logging
import re
import uuid
from collections.abc import AsyncIterator
from typing import Any

from google.genai import errors as genai_errors
from google.genai import types

from app.agents.chat_prompt import build_system_instruction, qualifying_scheme_ids
from app.agents.gemini import (
    FAST_MODEL,
    get_client,
    humanize_error,
)
from app.config import getenv
from app.schema.chat import (
    MAX_MESSAGE_CHARS,
    ChatCitation,
    ChatDoneEvent,
    ChatErrorEvent,
    ChatRequest,
    ChatTokenEvent,
    ChatTurn,
)
from app.schema.events import ErrorCategory
from app.schema.locale import SupportedLanguage
from app.services.vertex_ai_search import _resolve_data_store, _resolve_location

_logger = logging.getLogger(__name__)

# Chat model selection — overridable via `LAYAK_CHAT_MODEL` env var. Defaults
# to FAST_MODEL (gemini-2.5-flash) per the Phase 10 design discussion:
#   - Fast first-token (~1.2 s) so the chat surface feels responsive
#   - Strong-enough reasoning for grounded Q&A + multilingual refusals
#   - Dedicated quota pool separate from classify (Flash-Lite) so a chat
#     burst doesn't starve the pipeline
CHAT_MODEL = getenv("LAYAK_CHAT_MODEL", FAST_MODEL)


# -----------------------------------------------------------------------------
# Guardrail #3 — input validator
# -----------------------------------------------------------------------------

# Minimal prompt-injection pattern set. Conservative — false positives reject
# legitimate queries, so we only catch the textbook patterns. The grounding +
# system-prompt layers handle the long tail of subtle attempts.
_INJECTION_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\b(?:ignore|disregard)\s+(?:all\s+|the\s+)*(?:previous|prior|above)\s+"
        r"(?:instructions|prompts|rules)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\byou\s+are\s+now\s+a\b", re.IGNORECASE),
    re.compile(
        r"\bact\s+as\s+(if\s+you\s+were\s+)?(a\s+)?(?:different|new)\s+(?:ai|assistant|bot|model|system)\b",
        re.IGNORECASE,
    ),
    re.compile(r"<\s*/?\s*(?:system|sys|instruction)s?\s*>", re.IGNORECASE),
    re.compile(r"^\s*system\s*:\s", re.IGNORECASE | re.MULTILINE),
    # "Show me the instruction you were given" — the optional `me\s+` lets
    # the natural-English form match without losing the strict "show your
    # prompt" form.
    re.compile(
        r"\b(?:reveal|print|show|display)\s+(?:me\s+)?(?:your|the)\s+"
        r"(?:system\s+)?(?:prompt|instruction)s?\b",
        re.IGNORECASE,
    ),
)


def validate_chat_input(message: str) -> ErrorCategory | None:
    """Return an `ErrorCategory` slug if the input must be refused; else None.

    Length over `MAX_MESSAGE_CHARS` is caught by the Pydantic schema's
    `max_length` first; this guard is a defence-in-depth in case a future
    request shape skips the schema. Pattern matches return
    `"extract_validation"` so the frontend reuses the existing recovery
    card copy ("we couldn't process that — try again").
    """
    if len(message) > MAX_MESSAGE_CHARS:
        return "extract_validation"
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(message):
            _logger.info("Chat input rejected by injection guard: pattern=%s", pattern.pattern)
            return "extract_validation"
    return None


# -----------------------------------------------------------------------------
# Vertex AI Search grounding tool — Phase 10 Task 3
# -----------------------------------------------------------------------------

# Discovery Engine "default_collection" is a magic string — the seed script
# (backend/scripts/seed_vertex_ai_search.py) provisions every data store under
# this collection by Discovery-Engine convention. Keep in sync with
# `vertex_ai_search.py::_serving_config_path`.
_COLLECTION = "default_collection"


def _datastore_resource_path() -> str | None:
    """Build the fully-qualified Vertex AI Search datastore resource path.

    Uses `_resolve_data_store` + `_resolve_location` from the existing
    rule-citation helper to pick up the same `LAYAK_VERTEX_AI_SEARCH_*`
    env-var overrides. Returns None if the project ID isn't set, which
    flips the call to the no-grounding fallback path.
    """
    try:
        from app.agents.gemini import _resolve_project

        project = _resolve_project()
    except Exception:  # noqa: BLE001 — fail-open per grounding contract.
        _logger.exception("Could not resolve GCP project for chat grounding; flipping to no-grounding mode")
        return None
    location = _resolve_location()
    data_store = _resolve_data_store()
    return f"projects/{project}/locations/{location}/collections/{_COLLECTION}/dataStores/{data_store}"


def build_grounding_tool() -> types.Tool | None:
    """Return the Vertex AI Search retrieval tool, or None if unavailable.

    Returning None signals to `stream_chat_response` that grounding is
    unreachable — the call is retried without the tool and the
    `ChatDoneEvent` is stamped `grounding_unavailable=True` so the UI can
    surface a caveat. Fail-open mirrors the rule-engine's RAG posture.
    """
    datastore = _datastore_resource_path()
    if datastore is None:
        return None
    try:
        return types.Tool(
            retrieval=types.Retrieval(
                vertex_ai_search=types.VertexAISearch(datastore=datastore)
            )
        )
    except Exception:  # noqa: BLE001 — never fail the chat call on tool config.
        _logger.exception("Could not construct Vertex AI Search grounding tool")
        return None


# -----------------------------------------------------------------------------
# Guardrail #2 — Gemini built-in safety settings
# -----------------------------------------------------------------------------

def _safety_settings() -> list[types.SafetySetting]:
    """BLOCK_LOW_AND_ABOVE on the four harm categories. The chatbot context
    (citizen asking about social-assistance schemes) has no legitimate need
    for any harm-category content, so the strictest threshold is appropriate."""
    return [
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        ),
        types.SafetySetting(
            category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold=types.HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
        ),
    ]


# -----------------------------------------------------------------------------
# Conversation history projection
# -----------------------------------------------------------------------------

def _history_to_contents(history: list[ChatTurn], current_message: str) -> list[types.Content]:
    """Project the rolling client-supplied history + current user message
    into a Gemini `contents=[...]` list. Roles map 1:1 (we used Gemini's
    role names on `ChatTurn` precisely so this projection is trivial).
    """
    contents: list[types.Content] = []
    for turn in history:
        contents.append(
            types.Content(
                role=turn.role,
                parts=[types.Part.from_text(text=turn.content)],
            )
        )
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=current_message)],
        )
    )
    return contents


# -----------------------------------------------------------------------------
# Citation extraction + Guardrail #5 — output validator
# -----------------------------------------------------------------------------

# Matches the citation rule the system prompt enforces — `[scheme:str_2026]`.
# Whitespace is permissive so a model that drifts to `[scheme: str_2026]`
# still gets caught by the drift detector instead of slipping through.
_CITATION_RE = re.compile(r"\[\s*scheme\s*:\s*([a-z0-9_]+)\s*\]", re.IGNORECASE)


def extract_inline_scheme_citations(
    text: str, valid_scheme_ids: set[str]
) -> tuple[list[ChatCitation], list[str]]:
    """Pull `[scheme:<id>]` citations out of the model's response.

    Returns `(citations, drifted_ids)`:
      - citations: scheme_ids that appear in `valid_scheme_ids` (i.e.
        the user actually qualifies for them per the eval doc)
      - drifted_ids: scheme_ids the model cited but that aren't on the
        eval — logged as a warning so we can detect prompt-rule drift
        in production. The drifted IDs are NOT surfaced as citations
        but the response text is left intact (rewriting it would feel
        worse than letting an over-eager scheme name through).
    """
    seen: set[str] = set()
    citations: list[ChatCitation] = []
    drifted: list[str] = []
    for match in _CITATION_RE.finditer(text):
        raw_id = match.group(1).lower()
        if raw_id in seen:
            continue
        seen.add(raw_id)
        if raw_id in valid_scheme_ids:
            citations.append(ChatCitation(scheme_id=raw_id))
        else:
            drifted.append(raw_id)
    if drifted:
        _logger.warning(
            "Chat response cited scheme_id(s) not in eval matches: %s (valid set: %s)",
            drifted,
            sorted(valid_scheme_ids),
        )
    return citations, drifted


def extract_grounding_citations(response_chunk: object) -> list[ChatCitation]:
    """Best-effort parse of `grounding_metadata` into `ChatCitation` entries.

    The Vertex AI Search retrieval tool emits grounding chunks with URIs
    pointing at the indexed scheme PDFs. Shape varies across SDK versions
    (`grounding_chunks`, `grounding_supports`, `web` vs `retrieved_context`)
    so we descend defensively and skip anything we can't parse.
    """
    candidates = getattr(response_chunk, "candidates", None) or []
    citations: list[ChatCitation] = []
    seen_uris: set[str] = set()
    for candidate in candidates:
        metadata = getattr(candidate, "grounding_metadata", None)
        if metadata is None:
            continue
        chunks = getattr(metadata, "grounding_chunks", None) or []
        for chunk in chunks:
            retrieved = getattr(chunk, "retrieved_context", None)
            if retrieved is None:
                continue
            uri = getattr(retrieved, "uri", None) or ""
            text = getattr(retrieved, "text", None) or ""
            if not uri or uri in seen_uris:
                continue
            seen_uris.add(uri)
            # Best-effort scheme-PDF filename extraction from the GCS URI.
            source_pdf = uri.rsplit("/", 1)[-1] if "/" in uri else uri
            citations.append(
                ChatCitation(
                    source_pdf=source_pdf or None,
                    snippet=text[:600] if text else "",
                    source_uri=uri,
                )
            )
    return citations


# -----------------------------------------------------------------------------
# Main streaming entry point
# -----------------------------------------------------------------------------


async def stream_chat_response(
    eval_doc: dict[str, Any],
    request: ChatRequest,
) -> AsyncIterator[ChatTokenEvent | ChatDoneEvent | ChatErrorEvent]:
    """Stream a single chat turn as `ChatTokenEvent`s + a terminal Done/Error.

    The eval doc is the entire grounding context. Conversation history flows
    through `request.history`; nothing is persisted server-side in v1.
    Errors are caught and surfaced as `ChatErrorEvent` with category-tailored
    copy via `humanize_error(language=...)` so the frontend can reuse its
    existing recovery card.
    """
    language: SupportedLanguage = request.language

    # Guardrail #3: input validation. Fast-fail before any Gemini cost.
    rejection = validate_chat_input(request.message)
    if rejection is not None:
        message, _category = humanize_error("ValidationError: chat input rejected", language=language)
        yield ChatErrorEvent(category=rejection, message=message)
        return

    system_instruction = build_system_instruction(eval_doc, language=language)
    contents = _history_to_contents(request.history, request.message)
    valid_ids = qualifying_scheme_ids(eval_doc)

    grounding_tool = build_grounding_tool()
    grounding_unavailable = grounding_tool is None
    tools = [grounding_tool] if grounding_tool is not None else []

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        safety_settings=_safety_settings(),
        tools=tools or None,
        temperature=0.2,
    )

    # Append a strict per-turn language reinforcement. Even with the system
    # prompt's Rule 0 hard-lock, the model occasionally drifts to BM when the
    # question references Malay-named schemes (STR, JKM) AND the retrieval
    # tool surfaces Malay-language risalah PDFs — so we restate the language
    # constraint on the user's last turn as the most-recent-attention hint.
    _per_turn = {
        "en": "Reply in English. Translate any Malay text from retrieved PDFs into English.",
        "ms": "Balas dalam Bahasa Malaysia. Terjemahkan mana-mana teks Inggeris dari PDF yang diambil ke Bahasa Malaysia.",
        "zh": "请用简体中文回复。检索到的 PDF 中的任何马来文或英文段落，请翻译成中文。",
    }
    reinforcement = _per_turn.get(language, _per_turn["en"])
    contents[-1].parts.append(
        types.Part.from_text(text=f"\n\n[{reinforcement}]")
    )

    client = get_client()
    accumulated_text = ""
    accumulated_grounding: list[ChatCitation] = []
    seen_grounding_uris: set[str] = set()

    try:
        stream = client.models.generate_content_stream(
            model=CHAT_MODEL,
            contents=contents,
            config=config,
        )
        for chunk in stream:
            text = getattr(chunk, "text", None) or ""
            if text:
                accumulated_text += text
                yield ChatTokenEvent(text=text)
            # Citations may arrive on any chunk (typically the last).
            for citation in extract_grounding_citations(chunk):
                if citation.source_uri and citation.source_uri not in seen_grounding_uris:
                    seen_grounding_uris.add(citation.source_uri)
                    accumulated_grounding.append(citation)
    except genai_errors.APIError as exc:
        _logger.warning("Chat Gemini call failed: %s", exc)
        message, category = humanize_error(f"{type(exc).__name__}: {exc}", language=language)
        yield ChatErrorEvent(category=category, message=message)
        return
    except Exception as exc:  # noqa: BLE001 — surface unknown errors via the SSE channel.
        _logger.exception("Chat stream failed unexpectedly")
        message, category = humanize_error(f"{type(exc).__name__}: {exc}", language=language)
        yield ChatErrorEvent(category=category, message=message)
        return

    # Guardrail #5: output validation — citation drift detection.
    inline_citations, drifted = extract_inline_scheme_citations(accumulated_text, valid_ids)

    final_citations: list[ChatCitation] = []
    final_citations.extend(inline_citations)
    final_citations.extend(accumulated_grounding)

    yield ChatDoneEvent(
        message_id=str(uuid.uuid4()),
        citations=final_citations,
        grounding_unavailable=grounding_unavailable,
    )
