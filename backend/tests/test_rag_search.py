"""Local embedding RAG retrieval tests (replaces the Discovery Engine path)."""

from __future__ import annotations

import numpy as np
import pytest

from app.schema.scheme import RuleCitation
from app.services import rag_search
from app.services.rag_search import (
    RetrievedPassage,
    get_primary_rag_citation,
    passage_to_citation,
    search_passage,
)

_CHUNKS = [
    {"source_pdf": "risalah-str-2026.pdf", "page_start": 1, "page_end": 1, "text": "STR household tier"},
    {"source_pdf": "jkm-bkk-brochure.pdf", "page_start": 2, "page_end": 2, "text": "JKM children aid"},
]
_VECTORS = np.asarray([[1.0, 0.0], [0.0, 1.0]], dtype=np.float32)


@pytest.fixture(autouse=True)
def _stub_index(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rag_search, "_load_index", lambda: (_VECTORS, _CHUNKS))
    # Query embedding aligns with chunk 0 (STR) by default.
    monkeypatch.setattr(rag_search, "_embed_query", lambda _q: np.asarray([1.0, 0.0], dtype=np.float32))


def test_search_passage_returns_empty_list_on_empty_query() -> None:
    assert search_passage("") == []


def test_search_passage_fail_open_on_embed_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def _boom(_q: str):
        raise RuntimeError("no api key")

    monkeypatch.setattr(rag_search, "_embed_query", _boom)
    assert search_passage("anything") == []


def test_search_passage_returns_top_hit() -> None:
    hits = search_passage("str query", top_k=1)
    assert len(hits) == 1
    assert hits[0].source_uri.endswith("risalah-str-2026.pdf")
    assert hits[0].passage_text == "STR household tier"


def test_search_passage_filters_by_uri_substring() -> None:
    # Query aligns with STR (chunk 0), but the filter restricts to the JKM pdf,
    # so the best *qualifying* chunk (JKM) is returned — never the STR chunk.
    hits = search_passage("query", filter_uri_contains=["jkm-bkk-brochure.pdf"])
    assert len(hits) == 1
    assert hits[0].source_uri == "jkm-bkk-brochure.pdf"
    assert hits[0].passage_text == "JKM children aid"


def test_passage_to_citation_prefers_fallback_source_pdf() -> None:
    passage = RetrievedPassage(
        passage_text="snippet", source_uri="risalah-str-2026.pdf", document_id="d", relevance_score=0.9
    )
    citation = passage_to_citation(passage, rule_id="rag.test.primary", fallback_source_pdf="fallback.pdf")
    assert isinstance(citation, RuleCitation)
    assert citation.source_pdf == "fallback.pdf"


def test_get_primary_rag_citation_returns_none_when_no_hits(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rag_search, "search_passage", lambda *a, **k: [])
    assert get_primary_rag_citation(query="q", uri_substring="uri", rule_id="r", fallback_pdf="f.pdf") is None


def test_get_primary_rag_citation_builds_citation_when_hit(monkeypatch: pytest.MonkeyPatch) -> None:
    passage = RetrievedPassage(
        passage_text="body", source_uri="risalah-str-2026.pdf", document_id="d", relevance_score=None
    )
    monkeypatch.setattr(rag_search, "search_passage", lambda *a, **k: [passage])
    citation = get_primary_rag_citation(query="q", uri_substring="uri", rule_id="r", fallback_pdf="f.pdf")
    assert isinstance(citation, RuleCitation) and citation.passage == "body"
