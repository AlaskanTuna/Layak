"""Vertex AI Search helper tests."""

from __future__ import annotations

import sys
from types import ModuleType
from unittest.mock import MagicMock, patch

from app.schema.scheme import RuleCitation
from app.services import vertex_ai_search
from app.services.vertex_ai_search import (
    RetrievedPassage,
    get_primary_rag_citation,
    passage_to_citation,
    search_passage,
)


def _fake_result(link: str, snippet: str, doc_id: str) -> MagicMock:
    result = MagicMock()
    result.document.id = doc_id
    result.document.derived_struct_data = {
        "link": link,
        "snippets": [{"snippet_status": "SUCCESS", "snippet": snippet}],
    }
    return result


class _FakeSearchRequest:
    class ContentSearchSpec:
        class SnippetSpec:
            def __init__(self, return_snippet: bool = False) -> None:
                self.return_snippet = return_snippet

        def __init__(self, snippet_spec: object | None = None) -> None:
            self.snippet_spec = snippet_spec

    def __init__(self, **kwargs: object) -> None:
        self.__dict__.update(kwargs)


def _mock_discovery_engine() -> dict[str, ModuleType]:
    google = ModuleType("google")
    cloud = ModuleType("google.cloud")
    discoveryengine_v1 = ModuleType("google.cloud.discoveryengine_v1")
    types = ModuleType("google.cloud.discoveryengine_v1.types")
    types.SearchRequest = _FakeSearchRequest
    discoveryengine_v1.types = types
    cloud.discoveryengine_v1 = discoveryengine_v1
    google.cloud = cloud
    return {
        "google": google,
        "google.cloud": cloud,
        "google.cloud.discoveryengine_v1": discoveryengine_v1,
        "google.cloud.discoveryengine_v1.types": types,
    }


def test_search_passage_returns_empty_list_on_empty_query() -> None:
    assert search_passage("") == []


def test_search_passage_returns_empty_list_on_sdk_error() -> None:
    client = MagicMock()
    client.search.side_effect = RuntimeError("boom")
    with patch.dict(sys.modules, _mock_discovery_engine()), patch.object(
        vertex_ai_search,
        "_client",
        return_value=client,
    ):
        assert search_passage("anything") == []


def test_search_passage_filters_by_uri_substring() -> None:
    response = MagicMock()
    response.results = [
        _fake_result("gs://bucket/other.pdf", "ignore me", "doc-1"),
        _fake_result("gs://bucket/jkm-bkk-brochure.pdf", "keep me", "doc-2"),
    ]
    client = MagicMock()
    client.search.return_value = response
    with patch.dict(sys.modules, _mock_discovery_engine()), patch.object(
        vertex_ai_search,
        "_client",
        return_value=client,
    ):
        hits = search_passage("query", filter_uri_contains=["jkm-bkk-brochure.pdf"])
    assert len(hits) == 1 and hits[0].source_uri.endswith("jkm-bkk-brochure.pdf")


def test_passage_to_citation_prefers_fallback_source_pdf() -> None:
    passage = RetrievedPassage(
        passage_text="snippet text",
        source_uri="gs://bucket/source.pdf",
        document_id="hashed-doc-id",
        relevance_score=0.9,
    )
    citation = passage_to_citation(passage, rule_id="rag.test.primary", fallback_source_pdf="fallback.pdf")
    assert isinstance(citation, RuleCitation)
    assert citation.source_pdf == "fallback.pdf"


def test_get_primary_rag_citation_returns_none_when_no_hits() -> None:
    with patch.object(vertex_ai_search, "search_passage", return_value=[]):
        assert (
            get_primary_rag_citation(
                query="q",
                uri_substring="uri",
                rule_id="rag.test.primary",
                fallback_pdf="fallback.pdf",
            )
            is None
        )


def test_get_primary_rag_citation_builds_citation_when_hit() -> None:
    passage = RetrievedPassage(
        passage_text="passage body",
        source_uri="gs://bucket/source.pdf",
        document_id="doc-1",
        relevance_score=None,
    )
    with patch.object(vertex_ai_search, "search_passage", return_value=[passage]):
        citation = get_primary_rag_citation(
            query="q",
            uri_substring="uri",
            rule_id="rag.test.primary",
            fallback_pdf="fallback.pdf",
        )
    assert isinstance(citation, RuleCitation)
    assert citation.rule_id == "rag.test.primary"
    assert citation.passage == "passage body"
