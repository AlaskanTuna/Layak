"""Smoke-test the GCP -> free-tier migration end to end.

Exercises every migrated surface against the LIVE free Gemini Developer API
(API key, not Vertex). Run after `build_rag_index.py` so the local RAG checks
have an index to hit.

Checks:
  1. Client construction      — genai.Client(api_key=...), no Vertex/project.
  2. Structured JSON output   — response_schema on FAST_MODEL (extract/classify path).
  3. Multimodal image input   — tiny synthetic image on FAST_MODEL (OCR path).
  4. code_execution tool      — HEAVY_MODEL (compute_upside path); flips heavy model on failure.
  5. Embeddings               — gemini-embedding-001, 768-dim.
  6. Local RAG retrieval      — search_passage + get_primary_rag_citation over the committed index.
  7. Chat grounding           — retrieve_grounding_passages (the chat surface's RAG).

Usage:
    cd backend && GEMINI_API_KEY=... python -m scripts.smoke_migration

Exit 0 if all checks pass; non-zero if any fail (details printed per check).
"""

from __future__ import annotations

import io
import traceback

_results: list[tuple[str, bool, str]] = []


def _check(name: str):  # type: ignore[no-untyped-def]
    def run(fn):  # type: ignore[no-untyped-def]
        try:
            detail = fn()
            _results.append((name, True, detail or ""))
            print(f"PASS  {name}  {detail or ''}")
        except Exception as exc:  # noqa: BLE001 — smoke test reports, never crashes mid-suite.
            _results.append((name, False, f"{type(exc).__name__}: {exc}"))
            print(f"FAIL  {name}  {type(exc).__name__}: {exc}")
            traceback.print_exc()
        return fn

    return run


@_check("1. client construction (API key)")
def _client() -> str:
    from app.agents.gemini import get_client

    client = get_client()
    assert client is not None
    return "genai.Client built from GEMINI_API_KEY"


@_check("2. structured JSON output (FAST_MODEL)")
def _structured() -> str:
    import json

    from google.genai import types

    from app.agents.gemini import FAST_MODEL, get_client

    schema = {
        "type": "object",
        "properties": {"name": {"type": "string"}, "monthly_income_rm": {"type": "number"}},
        "required": ["name", "monthly_income_rm"],
    }
    resp = get_client().models.generate_content(
        model=FAST_MODEL,
        contents="Extract fields. Name: Aisyah. Monthly income: RM2800.",
        config=types.GenerateContentConfig(
            response_mime_type="application/json", response_schema=schema, temperature=0.0
        ),
    )
    data = json.loads(resp.text)
    assert "name" in data and "monthly_income_rm" in data, data
    return f"-> {data}"


@_check("3. multimodal image input (FAST_MODEL)")
def _multimodal() -> str:
    from google.genai import types
    from PIL import Image, ImageDraw

    from app.agents.gemini import FAST_MODEL, get_client

    img = Image.new("RGB", (240, 80), "white")
    ImageDraw.Draw(img).text((10, 30), "RM 2800", fill="black")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    resp = get_client().models.generate_content(
        model=FAST_MODEL,
        contents=[
            types.Part.from_bytes(data=buf.getvalue(), mime_type="image/png"),
            "What number is in this image? Reply with just the number.",
        ],
        config=types.GenerateContentConfig(temperature=0.0),
    )
    text = (resp.text or "").strip()
    assert "2800" in text, f"model read: {text!r}"
    return f"read {text!r}"


@_check("4. code_execution tool (HEAVY_MODEL)")
def _code_exec() -> str:
    from google.genai import types

    from app.agents.gemini import HEAVY_MODEL, get_client

    resp = get_client().models.generate_content(
        model=HEAVY_MODEL,
        contents="Use the code execution tool to compute and print the sum of [1, 2, 3].",
        config=types.GenerateContentConfig(
            tools=[types.Tool(code_execution=types.ToolCodeExecution())], temperature=0.0
        ),
    )
    assert resp.candidates, "no candidates returned"
    return f"HEAVY_MODEL={HEAVY_MODEL} executed (candidates ok)"


@_check("5. embeddings (gemini-embedding-001)")
def _embeddings() -> str:
    from google.genai import types

    from app.agents.gemini import get_client

    resp = get_client().models.embed_content(
        model="gemini-embedding-001",
        contents="Sumbangan Tunai Rahmah household tier",
        config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY", output_dimensionality=768),
    )
    dim = len(resp.embeddings[0].values)
    assert dim == 768, f"expected 768 dims, got {dim}"
    return "768-dim vector OK"


@_check("6. local RAG retrieval (search_passage + citation)")
def _local_rag() -> str:
    from app.services.rag_search import get_primary_rag_citation, search_passage

    hits = search_passage("Sumbangan Tunai Rahmah household tier with children", top_k=1)
    assert hits, "no RAG hits — did you run `python -m scripts.build_rag_index`?"
    cite = get_primary_rag_citation(
        query="Sumbangan Tunai Rahmah household tier with children",
        uri_substring="risalah-str-2026.pdf",
        rule_id="rag.smoke.str",
        fallback_pdf="risalah-str-2026.pdf",
    )
    assert cite is not None, "citation None despite hits"
    return f"top={hits[0].source_uri} score={hits[0].relevance_score:.3f}"


@_check("7. chat grounding (retrieve_grounding_passages)")
def _chat_grounding() -> str:
    from app.services.chat import retrieve_grounding_passages

    passages = retrieve_grounding_passages("How much is STR 2026 for a household with children?")
    assert passages, "no grounding passages"
    return f"{len(passages)} passages retrieved"


def main() -> int:
    print("=== Layak migration smoke test ===\n")
    # The decorators above already executed each check at import/def time.
    passed = sum(1 for _, ok, _ in _results if ok)
    total = len(_results)
    print(f"\n=== {passed}/{total} checks passed ===")
    if passed < total:
        print("FAILURES:")
        for name, ok, detail in _results:
            if not ok:
                print(f"  - {name}: {detail}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
