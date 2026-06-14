"""Build the local embedding index that replaces Vertex AI Search.

Extracts text from every PDF in backend/data/schemes/, chunks it, embeds
each chunk with the free `gemini-embedding-001` model (RETRIEVAL_DOCUMENT,
768-dim, L2-normalized), and writes two committed artifacts:

    backend/data/rag_index/vectors.npz   float32 matrix (n_chunks x 768)
    backend/data/rag_index/chunks.json   aligned [{source_pdf,page_start,page_end,text}]

Runtime retrieval (app/services/vertex_ai_search.py) loads these and does a
numpy cosine search — no GCP, no billing. Re-run this whenever the scheme
PDFs change.

Usage:
    GEMINI_API_KEY=... python -m scripts.build_rag_index --verbose
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from pypdf import PdfReader

from app.agents.gemini import get_client

_SCHEMES_DIR = Path(__file__).resolve().parent.parent / "data" / "schemes"
_INDEX_DIR = Path(__file__).resolve().parent.parent / "data" / "rag_index"
_EMBED_MODEL = "gemini-embedding-001"
_DIM = 768
_CHUNK_CHARS = 3000  # ~750 tokens, well under the 2048-token cap
_CHUNK_OVERLAP = 300


def _chunk_pages(reader: PdfReader) -> list[dict]:
    chunks: list[dict] = []
    for page_no, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if not text:
            continue
        start = 0
        while start < len(text):
            piece = text[start : start + _CHUNK_CHARS].strip()
            if piece:
                chunks.append({"page_start": page_no, "page_end": page_no, "text": piece})
            start += _CHUNK_CHARS - _CHUNK_OVERLAP
    return chunks


def _embed(client, texts: list[str], task_type: str) -> np.ndarray:  # type: ignore[no-untyped-def]
    from google.genai import types

    vectors: list[list[float]] = []
    for text in texts:
        resp = client.models.embed_content(
            model=_EMBED_MODEL,
            contents=text,
            config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=_DIM),
        )
        vectors.append(list(resp.embeddings[0].values))
    arr = np.asarray(vectors, dtype=np.float32)
    norms = np.linalg.norm(arr, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return arr / norms  # L2-normalize (required for non-3072 dims)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the local RAG embedding index.")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    client = get_client()
    all_chunks: list[dict] = []
    for pdf in sorted(_SCHEMES_DIR.glob("*.pdf")):
        reader = PdfReader(str(pdf))
        for chunk in _chunk_pages(reader):
            chunk["source_pdf"] = pdf.name
            all_chunks.append(chunk)
        if args.verbose:
            print(f"  {pdf.name}: cumulative {len(all_chunks)} chunks")

    if not all_chunks:
        print("No chunks extracted — aborting.", file=sys.stderr)
        return 1

    vectors = _embed(client, [c["text"] for c in all_chunks], "RETRIEVAL_DOCUMENT")

    _INDEX_DIR.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(_INDEX_DIR / "vectors.npz", vectors=vectors)
    (_INDEX_DIR / "chunks.json").write_text(json.dumps(all_chunks, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(all_chunks)} chunks ({vectors.shape}) to {_INDEX_DIR}")

    if args.verbose:
        for q in ("STR 2026 household tier", "JKM Warga Emas elderly", "LHDN Form B relief"):
            qv = _embed(client, [q], "RETRIEVAL_QUERY")[0]
            scores = vectors @ qv
            top = int(np.argmax(scores))
            print(f"  canary {q!r} -> {all_chunks[top]['source_pdf']} (score {scores[top]:.3f})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
