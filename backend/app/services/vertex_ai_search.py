"""Local embedding RAG retrieval helper.

Replaces the former Vertex AI Search (Discovery Engine) path with a fully
local, billing-free retrieval layer. The index is built offline by
`backend/scripts/build_rag_index.py` — it embeds every PDF under
`backend/data/schemes/` with the free `gemini-embedding-001` model and
commits two artifacts under `backend/data/rag_index/`:

    vectors.npz   float32 matrix (n_chunks x 768), L2-normalized
    chunks.json   aligned [{source_pdf, page_start, page_end, text}]

At runtime `search_passage()` embeds the query (one free embeddings call),
runs a numpy cosine search over the committed matrix, and returns the top
hits. The module name is retained so the ~20 rule modules and `chat.py`
keep importing the same public surface unchanged.

Design contract:

- **Fail-open.** Any error (missing key, missing index, embedding failure)
  returns `[]` / `None`, never raises. Rule modules treat the empty result
  as "no retrieved citation, fall back to the hardcoded one." This mirrors
  the `services/rate_limit.py` posture (NEVER hard-block the user).
- **Cached index.** The vectors + chunks load once per process via
  `@lru_cache`.

Configuration: none required beyond `GEMINI_API_KEY` (resolved via
`app.agents.gemini.get_client`). Per-scheme query strings still come from
the rule modules (overridable via `LAYAK_RAG_QUERY_*`).
"""

from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from functools import lru_cache
from pathlib import Path

import numpy as np
from pydantic import BaseModel, ConfigDict, Field

_logger = logging.getLogger(__name__)

_INDEX_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "rag_index"
_EMBED_MODEL = "gemini-embedding-001"
_DIM = 768
_RAG_DISABLED: ContextVar[bool] = ContextVar("local_rag_disabled", default=False)


@contextmanager
def disable_vertex_ai_search() -> Iterator[None]:
    """Temporarily skip live retrieval and fall back to hardcoded citations."""
    token = _RAG_DISABLED.set(True)
    try:
        yield
    finally:
        _RAG_DISABLED.reset(token)


class RetrievedPassage(BaseModel):
    """One retrieved chunk, normalised for rule-module consumption."""

    model_config = ConfigDict(extra="forbid")

    passage_text: str = Field(min_length=1)
    source_uri: str
    document_id: str = Field(min_length=1)
    relevance_score: float | None = None


@lru_cache(maxsize=1)
def _load_index():  # type: ignore[no-untyped-def]
    """Load the committed embedding matrix + aligned chunk metadata once."""
    vectors = np.load(_INDEX_DIR / "vectors.npz")["vectors"]
    chunks = json.loads((_INDEX_DIR / "chunks.json").read_text(encoding="utf-8"))
    return vectors, chunks


def _embed_query(query: str) -> np.ndarray:
    """Embed a query with gemini-embedding-001, L2-normalized (768-dim)."""
    from google.genai import types

    from app.agents.gemini import get_client

    resp = get_client().models.embed_content(
        model=_EMBED_MODEL,
        contents=query,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY", output_dimensionality=_DIM),
    )
    vec = np.asarray(resp.embeddings[0].values, dtype=np.float32)
    norm = float(np.linalg.norm(vec)) or 1.0
    return vec / norm


def search_passage(
    query: str,
    *,
    top_k: int = 1,
    filter_uri_contains: list[str] | None = None,
) -> list[RetrievedPassage]:
    """Cosine-search the local embedding index for up to `top_k` hits.

    Args:
        query: Natural-language query string. Crafted per scheme by callers.
        top_k: Maximum hits to return.
        filter_uri_contains: When supplied, drops any hit whose source PDF
            filename does not contain ANY of the listed substrings (e.g.
            `["risalah-str-2026.pdf"]` constrains a query to the STR PDF).

    Returns:
        List of RetrievedPassage. Empty list on any error (logged) or no hits.
    """
    if not query.strip():
        return []
    try:
        vectors, chunks = _load_index()
        qv = _embed_query(query)
        scores = vectors @ qv
    except Exception:  # noqa: BLE001 — fail-open per module contract.
        _logger.exception("Local RAG search failed for query=%r", query)
        return []

    order = np.argsort(scores)[::-1]
    results: list[RetrievedPassage] = []
    for raw_idx in order:
        idx = int(raw_idx)
        chunk = chunks[idx]
        uri = chunk["source_pdf"]
        if filter_uri_contains and not any(needle in uri for needle in filter_uri_contains):
            continue
        results.append(
            RetrievedPassage(
                passage_text=chunk["text"],
                source_uri=uri,
                document_id=f"{uri}#{idx}",
                relevance_score=float(scores[idx]),
            )
        )
        if len(results) >= top_k:
            break
    return results


def passage_to_citation(
    passage: RetrievedPassage,
    *,
    rule_id: str,
    fallback_source_pdf: str,
):  # type: ignore[no-untyped-def]
    """Build a `RuleCitation` from a `RetrievedPassage`.

    Lazy import of `RuleCitation` to keep this module importable from
    `app.rules.*` without a circular dependency.
    """
    from app.schema.scheme import RuleCitation

    # Prefer the scheme's canonical source_pdf filename over the synthetic
    # chunk document_id.
    return RuleCitation(
        rule_id=rule_id,
        source_pdf=fallback_source_pdf,
        page_ref="Local RAG retrieval",
        passage=passage.passage_text,
        source_url=passage.source_uri or None,
    )


def get_primary_rag_citation(
    *,
    query: str,
    uri_substring: str,
    rule_id: str,
    fallback_pdf: str,
):  # type: ignore[no-untyped-def]
    """High-level convenience for rule modules.

    Runs a local RAG search filtered to the scheme's expected source PDF and
    converts the top hit into a `RuleCitation` ready to prepend to
    `_citations()`. Returns `None` when retrieval is disabled or no hit
    matches the URI filter — rule modules then fall through to their
    hardcoded citation list unchanged.
    """
    if _RAG_DISABLED.get():
        return None
    hits = search_passage(query, top_k=1, filter_uri_contains=[uri_substring])
    if not hits:
        return None
    return passage_to_citation(
        hits[0],
        rule_id=rule_id,
        fallback_source_pdf=fallback_pdf,
    )
