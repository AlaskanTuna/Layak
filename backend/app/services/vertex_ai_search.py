"""Vertex AI Search (Discovery Engine) retrieval helper.

The data store is provisioned by `backend/scripts/seed_vertex_ai_search.py` —
it indexes every PDF under `backend/data/schemes/` so the rule engine can
ground each citation in a retrieved passage instead of (or alongside) the
hardcoded URL each rule module ships today.

Design contract:

- **Fail-open.** Any Discovery Engine error or empty response returns `[]`,
  never raises. Rule modules treat the empty list as "no retrieved citation,
  fall back to the hardcoded one." This mirrors the existing
  `services/rate_limit.py` posture (NEVER hard-block the user on a Firestore
  hiccup).
- **Cached client.** `SearchServiceClient` instantiation hits the gRPC channel
  setup; cache one per process via `@lru_cache(maxsize=1)`.
- **Region-pinned to `global`.** The seed script provisions the data store in
  `global` (per Discovery Engine v1's data-store region constraints), and our
  Vertex AI Gemini calls also live in `global` (asia-southeast1 only publishes
  2.5-flash). Keeping both in `global` removes one cross-region hop.

Configuration:

    `GOOGLE_CLOUD_PROJECT`            — required (resolved via gemini.py loader).
    `VERTEX_AI_SEARCH_DATA_STORE`     — optional. Defaults to "layak-schemes-v1"
                                        (the seed script's default ID).
    `VERTEX_AI_SEARCH_LOCATION`       — optional. Defaults to "global".

The seed script prints the canonical `VERTEX_AI_SEARCH_DATA_STORE` line on a
successful run so operators can paste it into `.env` verbatim.
"""

from __future__ import annotations

import logging
import os
import re
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from functools import lru_cache

from pydantic import BaseModel, ConfigDict, Field

from app.agents.gemini import _resolve_project

_logger = logging.getLogger(__name__)

_DEFAULT_DATA_STORE = "layak-schemes-v1"
_DEFAULT_LOCATION = "global"
_DEFAULT_SERVING_CONFIG = "default_serving_config"
_RAG_DISABLED: ContextVar[bool] = ContextVar("vertex_ai_search_disabled", default=False)


@contextmanager
def disable_vertex_ai_search() -> Iterator[None]:
    """Temporarily skip live retrieval and fall back to hardcoded citations."""
    token = _RAG_DISABLED.set(True)
    try:
        yield
    finally:
        _RAG_DISABLED.reset(token)


class RetrievedPassage(BaseModel):
    """One Discovery Engine search hit, normalised for rule-module consumption."""

    model_config = ConfigDict(extra="forbid")

    passage_text: str = Field(min_length=1)
    source_uri: str
    document_id: str = Field(min_length=1)
    relevance_score: float | None = None


def _resolve_data_store() -> str:
    return os.environ.get("VERTEX_AI_SEARCH_DATA_STORE") or _DEFAULT_DATA_STORE


def _resolve_location() -> str:
    return os.environ.get("VERTEX_AI_SEARCH_LOCATION") or _DEFAULT_LOCATION


@lru_cache(maxsize=1)
def _client():  # type: ignore[no-untyped-def]
    """Cached SearchServiceClient. Lazy import keeps the package optional at
    cold-start so backend/main.py imports never fail when Discovery Engine is
    unreachable in CI/test contexts."""
    from google.cloud import discoveryengine_v1 as de

    return de.SearchServiceClient()


def _serving_config_path() -> str:
    project = _resolve_project()
    location = _resolve_location()
    data_store = _resolve_data_store()
    return (
        f"projects/{project}/locations/{location}/collections/default_collection/"
        f"dataStores/{data_store}/servingConfigs/{_DEFAULT_SERVING_CONFIG}"
    )


_SNIPPET_TAG_RE = re.compile(r"<[^>]+>")


def _clean_snippet(text: str) -> str:
    """Strip HTML highlight tags (`<b>`) and leading/trailing ellipses-noise
    that Discovery Engine emits inside snippet payloads."""
    cleaned = _SNIPPET_TAG_RE.sub("", text)
    cleaned = cleaned.replace("&nbsp;", " ").strip()
    # Snippets often start with "... " and end with " ..."; trim those.
    if cleaned.startswith("... "):
        cleaned = cleaned[4:]
    if cleaned.endswith(" ..."):
        cleaned = cleaned[:-4]
    return cleaned.strip()


def _extract_passage_text(result_obj: object) -> str:
    """Flatten a SearchResult's document content into a single plain-text snippet.

    Discovery Engine v1 standard-edition returns snippets under
    `derived_struct_data.snippets[*].snippet` (with `snippet_status="SUCCESS"`
    when the snippet generator fired). Enterprise edition adds
    `extractive_answers` and `extractive_segments` under `content`; we still
    try those keys first so an enterprise upgrade is a no-code change.
    """
    document = getattr(result_obj, "document", None)
    if document is None:
        return ""

    derived = getattr(document, "derived_struct_data", None)
    if derived is not None:
        try:
            data = dict(derived)
        except (TypeError, ValueError):
            data = {}
        # Enterprise paths first.
        for key in ("extractive_answers", "extractive_segments"):
            entries = data.get(key) or []
            for entry in entries:
                content = None
                if isinstance(entry, dict):
                    content = entry.get("content")
                if content:
                    return _clean_snippet(str(content))
        # Standard-edition snippet path.
        snippets = data.get("snippets") or []
        for entry in snippets:
            if not isinstance(entry, dict):
                # The proto-plus marshal may surface MapComposite types here
                # that don't .items() cleanly — coerce via the raw proto.
                try:
                    entry = dict(entry)
                except (TypeError, ValueError):
                    continue
            status = entry.get("snippet_status")
            if status and status != "SUCCESS":
                continue
            text = entry.get("snippet")
            if text:
                return _clean_snippet(str(text))

    content = getattr(document, "content", None)
    snippet = getattr(content, "snippet", None) if content is not None else None
    if snippet:
        return _clean_snippet(str(snippet))

    return ""


def _extract_uri(result_obj: object) -> str:
    document = getattr(result_obj, "document", None)
    if document is None:
        return ""
    derived = getattr(document, "derived_struct_data", None)
    if derived is not None:
        try:
            data = dict(derived)
        except (TypeError, ValueError):
            data = {}
        link = data.get("link")
        if isinstance(link, str):
            return link
    return getattr(document, "uri", "") or ""


def search_passage(
    query: str,
    *,
    top_k: int = 1,
    filter_uri_contains: list[str] | None = None,
) -> list[RetrievedPassage]:
    """Run a Discovery Engine search and return up to `top_k` normalised hits.

    Args:
        query: Natural-language query string. Crafted per scheme by callers.
        top_k: Maximum hits to return.
        filter_uri_contains: When supplied, drops any hit whose source_uri does
            not contain ANY of the listed substrings. Discovery Engine assigns
            random hash document IDs when ingesting from a GCS source, so URI
            substring matching is the practical way to constrain a query to its
            expected scheme PDF (e.g. `["risalah-str-2026.pdf"]` for STR).

    Returns:
        List of RetrievedPassage. Empty list on any error (logged) or no hits.
    """
    if not query.strip():
        return []
    try:
        from google.cloud.discoveryengine_v1.types import SearchRequest

        client = _client()
        # Default Discovery Engine search returns only doc id + link + title —
        # no snippets unless `content_search_spec` is set. We use snippet_spec
        # only (extractive_content_spec is Enterprise-edition gated and the
        # layak-schemes-v1 data store is on the free Standard edition).
        content_spec = SearchRequest.ContentSearchSpec(
            snippet_spec=SearchRequest.ContentSearchSpec.SnippetSpec(
                return_snippet=True,
            ),
        )
        # Over-fetch when filtering so we still have headroom after dropping
        # mismatched results client-side.
        page_size = top_k * 5 if filter_uri_contains else top_k
        request = SearchRequest(
            serving_config=_serving_config_path(),
            query=query,
            page_size=max(page_size, 1),
            content_search_spec=content_spec,
        )
        response = client.search(request=request)
    except Exception:  # noqa: BLE001 — fail-open per module contract.
        _logger.exception("Discovery Engine search failed for query=%r", query)
        return []

    results: list[RetrievedPassage] = []
    for raw in response.results:
        document_id = getattr(getattr(raw, "document", None), "id", "") or ""
        uri = _extract_uri(raw)
        if filter_uri_contains and not any(needle in uri for needle in filter_uri_contains):
            continue
        text = _extract_passage_text(raw)
        if not text:
            continue
        results.append(
            RetrievedPassage(
                passage_text=text,
                source_uri=uri,
                document_id=document_id,
                relevance_score=None,
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

    # Prefer the scheme's canonical source_pdf filename over the hash
    # document_id Discovery Engine assigns when ingesting from GCS.
    return RuleCitation(
        rule_id=rule_id,
        source_pdf=fallback_source_pdf,
        page_ref="Vertex AI Search retrieval",
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

    Runs a Discovery Engine search filtered to the scheme's expected source
    PDF, and converts the top hit into a `RuleCitation` ready to prepend to
    `_citations()`. Returns `None` when the data store is unreachable or
    when no hit matches the URI filter — rule modules can then fall through
    to their hardcoded citation list unchanged.

    Usage in a rule module:

        from app.services.vertex_ai_search import get_primary_rag_citation

        def _citations() -> list[RuleCitation]:
            cites: list[RuleCitation] = []
            rag = get_primary_rag_citation(
                query="Sumbangan Tunai Rahmah household tier with children",
                uri_substring="risalah-str-2026.pdf",
                rule_id="rag.str_2026.primary",
                fallback_pdf="risalah-str-2026.pdf",
            )
            if rag is not None:
                cites.append(rag)
            cites.extend([<existing hardcoded citations>])
        return cites
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
