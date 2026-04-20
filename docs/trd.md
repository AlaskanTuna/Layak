# Technical Requirements Document

**Project**: Layak
**Module**: Layak MVP (v1 — hackathon demo build)
**Industry**: Malaysian GovTech / social-assistance delivery (Track 2 — Citizens First)
**Team Size**: 2
**Target Grade**: Project 2030 — MyAI Future Hackathon, National Open Champion
**Document Version**: 0.1.0
**Date**: 20 April 2026

---

## Table of Contents

1. Architecture Overview
2. Architecture Diagram (ASCII)
3. Component Responsibilities
4. Data Flow
5. Google AI Ecosystem Integration
6. External Dependencies
7. Security & Secrets
8. Feasible-Minimum Tech Stack (Plan B)
9. Open Questions

---

## 1. Architecture Overview

Layak is a two-service application: a **Next.js 16 App Router frontend** (React 19, Tailwind 4) and a **FastAPI + ADK-Python backend**, both deployed to Google Cloud Run. A citizen uploads three documents (IC, payslip or e-wallet income screenshot, utility bill). The frontend streams the upload to the backend, which invokes the **RootAgent** — a Gemini 2.5 Pro orchestrator built on ADK-Python v1.31 (GA) using a `SequentialAgent` composition. The RootAgent runs a five-step pipeline through `FunctionTool` bindings:

1. **extract** — Gemini 2.5 Flash reads the documents multimodally into a Pydantic `Profile`.
2. **classify** — Gemini 2.5 Flash tags household composition, dependants, income band.
3. **match** — a hardcoded Pydantic rule engine checks STR 2026, JKM Warga Emas, and five LHDN Form B reliefs; grounded retrieval over the scheme PDFs is served by **Vertex AI Search** (primary) returning the passage + URL that backs each rule.
4. **rank** — Gemini Code Execution computes annual RM upside per scheme + total in a sandboxed Python call.
5. **generate** — WeasyPrint renders three draft PDFs (BK-01, JKM18, LHDN relief summary) watermarked "DRAFT — NOT SUBMITTED".

The backend streams each step to the frontend over Server-Sent Events so the agentic moment is visible on stage. The app is **stateless**: user documents are processed in-memory and discarded at request-end. Scheme rules are hardcoded as typed Pydantic models; scheme PDFs are committed to the repo under `backend/data/schemes/`. A one-time seed script uploads those PDFs into a Vertex AI Search data store. There is no application database, no GCS bucket, and no Firestore in v1 — the git repo is the source of truth for the scheme corpus.

## 2. Architecture Diagram (ASCII)

### 2.1 System topology

```
 ┌──────────┐  HTTPS   ┌──────────────────────┐  POST+SSE ┌──────────────────┐
 │ Browser  │─────────►│ Next.js (Cloud Run)  │──────────►│ FastAPI + ADK    │
 │ (Aisyah) │◄─────────│  upload widget /     │◄──────────│ (Cloud Run)      │
 └──────────┘  stream  │  ranked results /    │  stream   │ /api/agent/intake│
                       │  provenance panel    │           └────────┬─────────┘
                       └──────────────────────┘                    │ invoke
                                                                   ▼
                                              ┌─────────────────────────────┐
                                              │ RootAgent                   │
                                              │ ADK-Python SequentialAgent  │
                                              │ Gemini 2.5 Pro orchestrator │
                                              └──────────────┬──────────────┘
                                                             │ FunctionTools
         ┌───────────────┬─────────────────┬─────────────────┼────────────────┐
         ▼               ▼                 ▼                 ▼                ▼
   ┌──────────┐   ┌──────────────┐  ┌────────────────┐ ┌──────────┐  ┌──────────────┐
   │ Gemini   │   │ Vertex AI    │  │ Rule Engine    │ │ Gemini   │  │ WeasyPrint   │
   │ 2.5 Flash│   │ Search       │  │ (Pydantic v2,  │ │ Code     │  │ PDF packet   │
   │ extract /│   │ (STR, JKM,   │  │  hardcoded     │ │ Execution│  │ generator    │
   │ classify │   │  LHDN PDFs)  │  │  thresholds)   │ │ sandbox  │  │ (3 drafts)   │
   └──────────┘   └──────┬───────┘  └────────────────┘ └──────────┘  └──────────────┘
                         │ indexed one-time via
                         │ backend/scripts/seed_vertex_ai_search.py
                         ▼
                  ┌────────────────────────────────┐
                  │ backend/data/schemes/*.pdf     │
                  │ (git-versioned; repo is the    │
                  │  source of truth; no GCS)      │
                  └────────────────────────────────┘

 GCP Secret Manager ── injects GEMINI_API_KEY ──► FastAPI Cloud Run service
```

### 2.2 Agent internal tool-call flow

```
 ┌───────────────────────────────────────────────────────────────────────┐
 │ RootAgent  —  Gemini 2.5 Pro  —  ADK SequentialAgent                  │
 │ Entry: POST /api/agent/intake  (multipart IC, payslip, utility bill)  │
 ├───────────────────────────────────────────────────────────────────────┤
 │                                                                       │
 │  Step 1  extract_profile(ic_img, payslip_img, utility_img)            │
 │          └─► Gemini 2.5 Flash (multimodal)                            │
 │          └─► Pydantic Profile {name, ic_last4, age, income,           │
 │                                 dependants, household_flags}          │
 │                                                                       │
 │  Step 2  classify_household(profile)                                  │
 │          └─► Gemini 2.5 Flash (structured output)                     │
 │          └─► dependants, age flags, income band                       │
 │                                                                       │
 │  Step 3  match_schemes(profile)                                       │
 │          └─► Vertex AI Search FunctionTool                            │
 │              └─► retrieves STR / JKM / LHDN passages + source URLs    │
 │          └─► Pydantic rule engine validates thresholds + caps         │
 │              └─► provenance map: rule_id → (source_pdf_url, passage)  │
 │                                                                       │
 │  Step 4  compute_upside(matches)                                      │
 │          └─► Gemini Code Execution (sandboxed Python, 30s cap)        │
 │          └─► annual RM per scheme + total                             │
 │                                                                       │
 │  Step 5  generate_packet(matches, profile)                            │
 │          └─► WeasyPrint HTML → 3 PDFs                                 │
 │              (BK-01 STR, JKM18 Warga Emas, LHDN relief summary)       │
 │          └─► each page watermarked "DRAFT — NOT SUBMITTED"            │
 │                                                                       │
 │  SSE stream emits each step as it lands → UI renders progressively.   │
 │                                                                       │
 └───────────────────────────────────────────────────────────────────────┘
```

## 3. Component Responsibilities

| Component         | Responsibility                                                                       | Tech                                                                                        | Notes                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Frontend          | Upload widget, SSE consumer, ranked results, provenance panel, draft-packet download | Next.js 16.2 App Router, React 19, Tailwind 4, shadcn/ui, Lucide, ESLint 9 (flat config)    | Deployed to Cloud Run. English UI only (v1). Next.js 16 forces `--webpack` (see Plan B/§8). |
| Backend API       | Single SSE endpoint hosting the agent pipeline                                       | FastAPI 0.115+, Python 3.12, async                                                          | `POST /api/agent/intake` accepts 3 multipart files.                                         |
| RootAgent         | Five-step pipeline orchestrator                                                      | ADK-Python v1.31 GA, `SequentialAgent`, Gemini 2.5 Pro                                      | Five `FunctionTool`s bound at init.                                                         |
| Extractor Worker  | IC / payslip / utility → Pydantic `Profile`                                          | Gemini 2.5 Flash (multimodal)                                                               | Strict JSON schema; no free text.                                                           |
| Classifier Worker | Household flags, age flags, income band                                              | Gemini 2.5 Flash (structured output)                                                        | Deterministic schema.                                                                       |
| Rule Engine       | STR tier, Warga Emas means test, 5 LHDN reliefs                                      | Pydantic v2 models, Python                                                                  | Hardcoded thresholds; sourced from cached PDFs.                                             |
| RAG (primary)     | Grounded retrieval over 3 scheme PDFs                                                | Vertex AI Search data store, FunctionTool wrapper                                           | Each hit returns passage + URL for provenance.                                              |
| RAG (Plan B)      | Inline PDFs in 1M context                                                            | Gemini 2.5 Pro context window                                                               | Collapse trigger: Vertex AI Search setup stall past sprint hour 12.                         |
| Arithmetic        | Annual RM upside per scheme + total                                                  | Gemini Code Execution (`tools: [{codeExecution: {}}]`)                                      | 30-second sandbox; on-stage Python visible in SSE.                                          |
| PDF Generator     | Three draft application PDFs                                                         | WeasyPrint 62+, HTML+CSS templates                                                          | Cloud Run container needs libpango, libcairo, libgdk-pixbuf.                                |
| Secrets           | `GEMINI_API_KEY`                                                                     | GCP Secret Manager                                                                          | Injected via `--set-secrets=GEMINI_API_KEY=gemini-api-key:latest`.                          |
| Deploy            | Frontend + backend                                                                   | Cloud Run `--min-instances=1 --cpu-boost`                                                   | Warm 1 hour before demo slot.                                                               |
| Scheme corpus     | Three source PDFs                                                                    | Git-versioned at `backend/data/schemes/`                                                    | Repo is the bucket; no GCS in v1.                                                           |
| Seed script       | Index scheme PDFs into Vertex AI Search                                              | `backend/scripts/seed_vertex_ai_search.py` (exact path subject to backend-layout decisions) | One-time run; idempotent; checked into CI.                                                  |

## 4. Data Flow

A single end-to-end journey from upload to download, narrated at component level.

1. **User loads the Cloud Run URL.** Next.js renders the landing page with the upload widget. No login. The "we store nothing" and "draft only" notices render above the fold.
2. **User selects three documents** (IC, payslip or e-wallet income screenshot, utility bill) from the phone's gallery or camera. Client-side validation rejects files >10 MB or non-image/non-PDF MIME types. Alternatively, the "Use Aisyah sample documents" button loads seed fixtures (FR-10).
3. **Next.js POSTs the files as multipart form-data** to `/api/agent/intake` on the FastAPI service. Upload progress is rendered via a streamed progress bar.
4. **FastAPI opens an SSE response** and constructs the RootAgent (`SequentialAgent` with five `FunctionTool`s: extract, classify, match, rank, generate). Each tool call emits a `step_started` / `step_done` SSE event so the UI can render the agentic moment.
5. **Step 1 — extract:** The extractor worker calls Gemini 2.5 Flash with the three document images as multimodal parts and a strict Pydantic `Profile` schema. The returned JSON is validated; an invalid response forces a retry and, on second failure, surfaces a structured error to the client (the UI offers "Use sample documents" as the recovery path).
6. **Step 2 — classify:** The classifier worker calls Gemini 2.5 Flash again with the `Profile` and a structured-output schema emitting household flags (children under 18, elderly dependant present), age flags, and an income band.
7. **Step 3 — match:** The rule engine composes three scheme-match calls. For each scheme, it invokes the Vertex AI Search `FunctionTool` against the pre-indexed data store to fetch the relevant passage and source URL, then validates the profile against hardcoded Pydantic thresholds (STR tier tables, JKM PGK Miskin Tegar food-PLI RM1,236, LHDN relief caps tagged `ya_2025`). Each rule result carries a provenance record `{ rule_id, source_pdf_url, page_ref, passage }`.
8. **Step 4 — compute_upside:** Gemini Code Execution runs three Python computations in a sandbox: STR household-tier lookup, JKM Warga Emas annualised rate, LHDN tax-liability delta across the five locked reliefs. The code and output are streamed to the UI.
9. **Step 5 — generate_packet:** WeasyPrint composes three HTML-templated PDFs (BK-01, JKM18, LHDN relief summary) with the extracted profile values pre-filled. Every page is watermarked "DRAFT — NOT SUBMITTED" and footered with the disclaimer from PRD §7.
10. **UI renders the ranked-scheme list, provenance panel, and packet download.** The user downloads the three PDFs. No data is persisted server-side; the request scope ends and memory is released.

## 5. Google AI Ecosystem Integration

### 5.1 Model routing

| Workload                       | Model                                                             | Why                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| RootAgent orchestration        | Gemini 2.5 Pro (GA)                                               | 1M context; holds system prompt, tool registry, conversation buffer; cheap tier ≤200K prompt tokens ($1.25 / $10 per 1M in/out). |
| Multimodal document extraction | Gemini 2.5 Flash (GA)                                             | $0.15 / $0.60; latency-sensitive bulk work on IC / payslip / utility-bill images; structured-output first-class.                 |
| Household classification       | Gemini 2.5 Flash (GA)                                             | Same rationale as extraction; deterministic structured output.                                                                   |
| On-stage arithmetic            | Gemini Code Execution (built-in tool on 2.5 Pro/Flash/Flash-Lite) | `tools: [{codeExecution: {}}]`; sandboxed Python; numpy/pandas bundled; 30s cap.                                                 |
| Fallback if Pro rate-limits    | Gemini 2.5 Flash                                                  | Drop orchestrator to Flash; quality sufficient for the narrow rule-walk.                                                         |

### 5.2 Vertex AI Search

**Primary retrieval layer for v1.** A single Vertex AI Search data store is populated one-time from the three committed scheme PDFs (`RISALAH STR 2026.pdf`, `JKM18.pdf`, `public-ruling-no-4-2024.pdf`, plus the LHDN explanatory notes for BE2025). Vertex AI Search handles chunking, embedding, indexing, and serving. The `match_schemes` FunctionTool wraps the Search endpoint and returns `(passage, source_pdf_url, page_ref)` tuples that populate the provenance panel for every eligibility claim.

**Rationale.** The hackathon Technical Mandate (Handbook §3, "The Context") names Vertex AI Search as a required ecosystem component. The pitch narrative benefits visibly from a dedicated retrieval layer backing every number on-screen — this is the specific credibility beat that separates Layak from the MyGov Malaysia and NYC MyCity chatbot failures.

### 5.3 Handbook stack alignment

The Handbook (Technical Mandate, §3) names four stack components. Layak's coverage:

| Handbook component                                                    | Layak v1   | Notes                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **The Intelligence (Brain)** — Gemini (Pro / Flash / Flash-Lite)      | ✅         | Pro = RootAgent orchestrator; Flash = extractor + classifier workers; Flash-Lite available as a handbook-compliant fallback for further latency / cost reduction if required.                                                                                                                          |
| **The Orchestrator** — Vertex AI Agent Builder + Firebase Genkit      | ✅ partial | Handbook explicitly names Vertex AI Agent Builder and Firebase Genkit. Layak uses **ADK-Python v1.31 (GA)** — Google's first-party agent framework. Genkit-Python is Alpha (v0.5) with a known "Event loop is closed" warm-instance bug on Cloud Run (genkit-ai/genkit#4925). See Open Questions §9.1. |
| **The Development Lifecycle** — Google Cloud Workstations + Cloud Run | ✅         | Cloud Run is the deploy target for both services; Workstations optional (team laptops used).                                                                                                                                                                                                           |
| **The Context** — Vertex AI Search for grounded RAG                   | ✅ primary | Vertex AI Search is the primary retrieval layer grounding every eligibility claim; **Plan B** (see §8) collapses to Gemini 2.5 Pro inline-PDF grounding in the 1M context window if setup stalls past sprint hour 12.                                                                                  |

### 5.4 Cloud Run deploy commands

```bash
# Backend (FastAPI + ADK): ADK packages the container.
adk deploy cloud_run --with_ui

# Alternative / frontend: buildpack-based deploy.
gcloud run deploy layak-frontend --source . \
  --region asia-southeast1 \
  --min-instances=1 --cpu-boost \
  --allow-unauthenticated

# Secret injection at deploy time.
gcloud run deploy layak-backend \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  ...
```

Required IAM: `roles/secretmanager.secretAccessor` on the Cloud Run service account for `gemini-api-key`. Required API enablements: Vertex AI, Cloud Run, Artifact Registry, Secret Manager, Vertex AI Search (Discovery Engine).

## 6. External Dependencies

### 6.1 Government source PDFs (cached in-repo under `backend/data/schemes/`)

| Scheme                              | File                               | Canonical URL                                                                                           |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| STR 2026 eligibility infographic    | `RISALAH STR 2026.pdf`             | https://bantuantunai.hasil.gov.my/FAQ/RISALAH%20STR%202026.pdf                                          |
| STR 2026 application form           | `BK-01.pdf`                        | https://bantuantunai.hasil.gov.my/Borang/BK-01%20(Borang%20Permohonan%20&%20Kemaskini%20STR%202026).pdf |
| JKM Warga Emas application form     | `JKM18.pdf`                        | https://www.jkm.gov.my/jkm/uploads/files/Bahagian%20PW/BORANG%20PERMOHONAN%20JKM%2018%20(2022)(1).pdf   |
| LHDN Public Ruling 4/2024 (reliefs) | `pr-no-4-2024.pdf`                 | https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf                                                |
| LHDN explanatory notes BE2025       | `explanatorynotes_be2025.pdf`      | https://www.hasil.gov.my/media/pshpbomm/explanatorynotes_be2025_2.pdf                                   |
| LHDN filing programme 2026          | `rf-filing-programme-for-2026.pdf` | https://www.hasil.gov.my/media/fqog1423/rf-filing-programme-for-2026.pdf                                |

**Licensing note.** Malaysian government-published PDFs are cached verbatim for reference. Layak displays source URLs prominently and does not claim authorship. Treat as reference-only fair use for the hackathon; for post-demo distribution, seek formal permission.

### 6.2 Supplementary datasets (framing, not rule-critical)

- OpenDOSM household income by state — https://data.gov.my/data-catalogue/hh_income_state (parquet mirror preferred: `https://storage.dosm.gov.my/hies/hh_income_state.parquet`).
- OpenDOSM percentile (B40 / M40 / T20) — https://data.gov.my/data-catalogue/hies_malaysia_percentile.
- OpenDOSM poverty line (PGK Miskin Tegar, food-PLI RM1,236 for 2024) — https://data.gov.my/data-catalogue/hh_poverty.

Use parquet mirrors over `storage.dosm.gov.my`; live `api.data.gov.my` endpoints rate-limit.

### 6.3 Open-source libraries

| Library      | Version                                                  | License      |
| ------------ | -------------------------------------------------------- | ------------ |
| Next.js      | 16.2.4                                                   | MIT          |
| React        | 19.2.4                                                   | MIT          |
| Tailwind CSS | 4.2.x                                                    | MIT          |
| shadcn/ui    | 4.3.1 (preset: `base-nova`, `@base-ui/react` primitives) | MIT          |
| Lucide React | 1.8.x                                                    | ISC          |
| ESLint       | 9.x (flat config)                                        | MIT          |
| FastAPI      | 0.115+                                                   | MIT          |
| Pydantic     | v2                                                       | MIT          |
| ADK-Python   | 1.31 (GA)                                                | Apache 2.0   |
| WeasyPrint   | 62+                                                      | BSD-3-Clause |

### 6.4 Repo layout

Monorepo via pnpm workspace. One lockfile at root; one `prepare: husky` script at root.

```
layak/
├── frontend/                     Next.js 16 workspace package (layak-frontend)
│   ├── src/
│   │   ├── app/                  App Router: layout, page, globals.css
│   │   ├── components/ui/        shadcn primitives (12 components)
│   │   └── lib/utils.ts          cn() helper
│   ├── public/                   static assets
│   ├── AGENTS.md                 Next.js 16 framework warning for agents
│   ├── components.json           shadcn config (base-nova preset, Tailwind 4)
│   ├── eslint.config.mjs         ESLint 9 flat config
│   ├── next.config.ts            webpack HMR polling (poll=800ms)
│   ├── package.json
│   └── tsconfig.json
├── backend/                      FastAPI + ADK-Python (Phase 1 scaffolds)
│   ├── app/                      FastAPI + RootAgent (Phase 1)
│   ├── data/schemes/             source PDFs, git-versioned
│   ├── scripts/
│   │   └── seed_vertex_ai_search.py   one-time Vertex AI Search data-store seeder
│   └── README.md
├── docs/                         PRD, TRD, roadmap, plan, progress
├── .claude/                      project instructions, skills inventory
├── .husky/                       git pre-commit hook
├── package.json                  root orchestrator (husky, lint-staged, prettier)
└── pnpm-workspace.yaml
```

### 6.5 Data & storage

- **No application database** in v1. Layak is stateless: user documents and profiles live only in request-scope memory and are discarded at response-end.
- **Scheme rules** are encoded as typed Pydantic v2 models in `backend/app/rules/` (Phase 1 scaffold).
- **Scheme PDFs** are the source of truth and live at `backend/data/schemes/`, versioned in git. The repo is the bucket.
- **Vertex AI Search data store** is populated one-time by `backend/scripts/seed_vertex_ai_search.py`. The script is idempotent and re-runnable.
- **No GCS bucket, no Firestore, no Cloud SQL, no Redis** — none are provisioned in v1.

## 7. Security & Secrets

- `.env` is git-ignored; `.env.example` is the only committed template.
- `GEMINI_API_KEY` lives in GCP Secret Manager as `gemini-api-key`; Cloud Run services mount it via `--set-secrets=GEMINI_API_KEY=gemini-api-key:latest`. No other secret is required in v1.
- Cloud Run service account has `roles/secretmanager.secretAccessor` plus the minimum Vertex AI access roles; no broader privilege.
- HTTPS-only (Cloud Run defaults).
- No PII persisted. IC numbers appear in UI and packet as last-4-digits only; full IC is held only in request-scope memory on the backend and never logged.
- Synthetic demo documents carry the "SYNTHETIC — FOR DEMO ONLY" watermark on every page. No real MyKad photos are used.
- AI-disclosure text in README names Claude Code (Anthropic) per hackathon Rules §4.2.

## 8. Feasible-Minimum Tech Stack (Plan B)

**Plan B scope.** If Vertex AI Search setup stalls past **sprint hour 12**, collapse the RAG layer to **Gemini 2.5 Pro inline-PDF grounding**. The three cached scheme PDFs (~80K tokens combined) are dropped directly into the system prompt; the RootAgent holds the entire corpus inline in its 1M-token context window. The `match_schemes` FunctionTool is rewritten to reference passages by `(pdf_filename, page)` pairs already in context rather than making a Search call.

**Plan B does not drop ADK-Python or the five-step pipeline.** The RootAgent, `SequentialAgent`, and `FunctionTool` bindings stay identical; only the retrieval FunctionTool implementation changes. Expected migration cost: ~1 hour (replace Search client calls with a local passage lookup). Cost per demo run rises marginally but stays well under RM1.

**Ceiling collapse (hour 18+).** If the RootAgent itself is unstable at sprint hour 18, refer to PRD §6.3 emergency de-scope. The four-step cut list begins with dropping packet generation and ends with replacing live extraction with Aisyah seed data.

## 9. Open Questions

### 9.1 Handbook orchestrator mismatch

**Question.** The Handbook (Technical Mandate §3) names **Vertex AI Agent Builder** and **Firebase Genkit** as the two orchestrators. Layak uses **ADK-Python v1.31 (GA)** instead.

**Rationale for deviation.** ADK-Python is Google's first-party agent framework (`pypi.org/project/google-adk`, `github.com/google/adk-python`), shares the same `FunctionTool` / `LlmAgent` / `SequentialAgent` primitives as ADK-TS, and deploys to Cloud Run via `adk deploy cloud_run --with_ui`. Genkit-Python is Alpha (v0.5) with a known "Event loop is closed" bug on warm Cloud Run instances (genkit-ai/genkit#4925) that would be catastrophic during a live demo. Vertex AI Agent Builder adds 2–4 hours of setup time with no demo-visible benefit over ADK at this scope.

**Risk.** A judge may ask why neither named orchestrator is in the stack. The defence is: "ADK-Python is Google's first-party GA agent framework; Genkit-Python is Alpha with a documented warm-instance bug; Agent Builder setup exceeds our sprint budget with no visible-in-demo upside." The README's AI disclosure section will state this explicitly.

**Action.** Raise with human PO before sprint start for final sign-off.

### 9.2 Vertex AI Search collapse trigger

**Trigger.** If Vertex AI Search data-store creation, indexing, or IAM wiring is not complete by **sprint hour 12**, collapse to the Plan B inline-PDF grounding in §8.

**Owner.** P1 calls the trigger.

**Indicator metrics.** (a) the seed script `backend/scripts/seed_vertex_ai_search.py` has not run to green by hour 10; (b) a canary retrieval query against the data store returns zero or low-quality hits by hour 11; (c) the service account cannot be granted the required Discovery Engine role within ops budget.

### 9.3 GCP project and region pinning

- [BLOCKED ON INFRA SETUP] GCP project ID.
- [BLOCKED ON INFRA SETUP] Cloud Run region (candidate: `asia-southeast1` for latency).
- [BLOCKED ON INFRA SETUP] Vertex AI Search data store ID and region.

### 9.4 Backend layout — RESOLVED

Monorepo via pnpm workspace. Frontend lives at `frontend/` (workspace package `layak-frontend`); backend lives at `backend/` (Python app, not a pnpm package). Backend skeleton and `README.md` landed in Phase 0; `backend/app/`, `backend/scripts/seed_vertex_ai_search.py`, and the six committed scheme PDFs under `backend/data/schemes/` are canonical paths. See §6.4 for the full repo layout.

### 9.5 JKM Warga Emas rate

Budget 2026 announced RM600/month; no gov.my PDF yet reflects the uplift (JKM federal page last revised 2019). UI copy falls back to "RM500–600/month depending on current gazetted rate" when the rule engine cannot confirm RM600 against the live JKM18 form. Decision: display RM600 in demo copy and cite the Budget 2026 speech; keep the RM500 fallback string in the rule engine for belt-and-braces.

### 9.6 Demo document specimens

- MyKad — synthetic, watermarked, fictional IC number, AI-generated face, no holographic/chip elements.
- Payslip — EA Form specimen layout (C.P. 8A) used as visual reference; synthetic content.
- TNB utility bill — no official specimen PDF exists on tnb.com.my; generate a synthetic bill from observed layouts with no real account or meter numbers.

All three are PDPA 2010 / NRR 1990 compliant only so long as they are labelled SYNTHETIC on every page and in slide 1 of the pitch deck.
