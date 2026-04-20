# backend/

Python service for Layak — to be scaffolded in Phase 1 (see `docs/roadmap.md`).

## Expected layout (locked in `docs/trd.md` §3, §6)

```
backend/
├── app/                          # FastAPI + ADK-Python application (Phase 1)
│   ├── main.py                   # FastAPI entry point; POST /api/agent/intake (SSE)
│   ├── agents/                   # RootAgent + FunctionTools
│   │   ├── root_agent.py
│   │   └── tools/
│   │       ├── extract.py
│   │       ├── classify.py
│   │       ├── match.py
│   │       ├── compute_upside.py
│   │       └── generate_packet.py
│   ├── rules/                    # Pydantic-typed scheme rule engine
│   │   ├── str_2026.py
│   │   ├── jkm_warga_emas.py
│   │   └── lhdn_form_b.py
│   └── schema/                   # Pydantic models (Profile, SchemeMatch, Packet)
├── data/
│   └── schemes/                  # Source PDFs (git-versioned; the repo is the bucket)
│       ├── RISALAH STR 2026.pdf
│       ├── BK-01.pdf
│       ├── JKM18.pdf
│       ├── pr-no-4-2024.pdf
│       ├── explanatorynotes_be2025.pdf
│       └── rf-filing-programme-for-2026.pdf
└── scripts/
    └── seed_vertex_ai_search.py  # One-time data-store seeder (idempotent)
```

## Stack (locked)

- Python **3.12**, async.
- **FastAPI** 0.115+ — single `POST /api/agent/intake` endpoint streaming SSE.
- **ADK-Python v1.31 (GA)** — `SequentialAgent`, `FunctionTool`, `LlmAgent`. **Do not use Genkit-Python** (Alpha; warm-instance bug on Cloud Run).
- **Gemini 2.5 Pro** as RootAgent orchestrator. **Gemini 2.5 Flash** as extractor + classifier workers. **Gemini Code Execution** for on-stage arithmetic.
- **Vertex AI Search** as the primary RAG layer over the six scheme PDFs above; inline 1M-context grounding as Plan B if setup stalls past sprint hour 12.
- **WeasyPrint** for the three draft PDFs (container needs `libpango`, `libcairo`, `libgdk-pixbuf`).

## Stateless — no database, no GCS bucket

Per `docs/trd.md` §6.4: Layak is stateless. User documents and profiles live only in request-scope memory. Scheme rules are Pydantic models in `app/rules/`. The source of truth for the scheme corpus is this directory — `data/schemes/*.pdf` is committed to git.

## Deployment

`adk deploy cloud_run --with_ui` from this directory, with `--min-instances=1 --cpu-boost` one hour before the demo slot. Secrets come from GCP Secret Manager (`gemini-api-key`). See `docs/trd.md` §5.4 for the full deploy command block.
