# Technical Requirements Document

**Project**: Layak
**Module**: Layak v1 (hackathon demo build) + v2 (production SaaS pivot)
**Industry**: Malaysian GovTech / social-assistance delivery (Track 2 — Citizens First)
**Team Size**: 2
**Target Grade**: Project 2030 — MyAI Future Hackathon, National Open Champion
**Document Version**: 0.2.0
**Date**: 21 April 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Architecture Diagram (ASCII)](#2-architecture-diagram-ascii)
3. [System topology](#21-system-topology)
4. [Agent internal tool-call flow](#22-agent-internal-tool-call-flow)
5. [Component Responsibilities](#3-component-responsibilities)
6. [Data Flow](#4-data-flow)
7. [Google AI Ecosystem Integration](#5-google-ai-ecosystem-integration)
8. [Model routing](#51-model-routing)
9. [Vertex AI Search](#52-vertex-ai-search)
10. [Handbook stack alignment](#53-handbook-stack-alignment)
11. [Cloud Run deploy commands](#54-cloud-run-deploy-commands)
12. [External Dependencies](#6-external-dependencies)
13. [Government source PDFs (cached in-repo under `backend/data/schemes/`)](#61-government-source-pdfs-cached-in-repo-under-backenddataschemes)
14. [Supplementary datasets (framing, not rule-critical)](#62-supplementary-datasets-framing-not-rule-critical)
15. [Open-source libraries](#63-open-source-libraries)
16. [Repo layout](#64-repo-layout)
17. [Data & storage](#65-data--storage)
18. [Pre-commit hooks (Husky + lint-staged)](#66-pre-commit-hooks-husky--lint-staged)
19. [Security & Secrets](#7-security--secrets)
20. [Feasible-Minimum Tech Stack (Plan B)](#8-feasible-minimum-tech-stack-plan-b)
21. [Open Questions](#9-open-questions)
22. [Handbook orchestrator mismatch](#91-handbook-orchestrator-mismatch)
23. [Vertex AI Search collapse trigger](#92-vertex-ai-search-collapse-trigger)
24. [GCP project and region pinning](#93-gcp-project-and-region-pinning)
25. [Backend layout — RESOLVED](#94-backend-layout--resolved)
26. [JKM Warga Emas rate](#95-jkm-warga-emas-rate)
27. [Demo document specimens](#96-demo-document-specimens)
28. [Team & Delivery Responsibilities](#10-team--delivery-responsibilities)
29. [Roles at a glance](#101-roles-at-a-glance)
30. [Phase ownership matrix](#102-phase-ownership-matrix)
31. [Cross-cutting responsibilities](#103-cross-cutting-responsibilities)
32. [Swap & escalation rules](#104-swap--escalation-rules)
33. [v2 additions](#v2-additions)
34. [v2 authenticated topology](#23-v2-authenticated-topology)
35. [v2 authenticated flow](#41-v2-authenticated-flow)
36. [Firestore as the session + archive layer](#55-firestore-as-the-session--archive-layer)
37. [v2 environment variables](#67-v2-environment-variables)
38. [Supabase fallback for v2 auth + DB layer](#82-supabase-fallback-for-v2-auth--db-layer)
39. [Rate-limit race condition](#97-rate-limit-race-condition)

---

## 1. Architecture Overview

Layak is a two-service application: a **Next.js 16 App Router frontend** (React 19, Tailwind 4) and a **FastAPI + ADK-Python backend**, both deployed to Google Cloud Run. A citizen uploads three documents (IC, payslip or e-wallet income screenshot, utility bill). The frontend streams the upload to the backend, which invokes the **RootAgent** — a Gemini 2.5 Pro orchestrator built on ADK-Python v1.31 (GA) using a `SequentialAgent` composition. The RootAgent runs a five-step pipeline through `FunctionTool` bindings:

1. **extract** — Gemini 2.5 Flash reads the documents multimodally into a Pydantic `Profile`.
2. **classify** — Gemini 2.5 Flash tags household composition, dependants, income band.
3. **match** — a hardcoded Pydantic rule engine checks STR 2026, JKM Warga Emas, and five LHDN Form B reliefs; grounded retrieval over the scheme PDFs is served by **Vertex AI Search** (primary) returning the passage + URL that backs each rule.
4. **rank** — Gemini Code Execution computes annual RM upside per scheme + total in a sandboxed Python call.
5. **generate** — WeasyPrint renders three draft PDFs (BK-01, JKM18, LHDN relief summary) watermarked "DRAFT — NOT SUBMITTED".

The backend streams each step to the frontend over Server-Sent Events so the agentic moment is visible on stage. The app is **stateless**: user documents are processed in-memory and discarded at request-end. Scheme rules are hardcoded as typed Pydantic models; scheme PDFs are committed to the repo under `backend/data/schemes/`. A one-time seed script uploads those PDFs into a Vertex AI Search data store. There is no application database, no GCS bucket, and no Firestore in v1 — the git repo is the source of truth for the scheme corpus.

### v2 additions

Layak v2 keeps the v1 stateless agent pipeline unchanged. The new layer adds Firebase Auth (Google OAuth only) for user identity, Firestore in `asia-southeast1` for `users`, `evaluations`, and `waitlist`, plus a Cloud Scheduler + Cloud Run Job pair that prunes free-tier history nightly at 02:00 MYT. Uploaded documents are still discarded immediately after extraction; auth, persistence, and tier gating are layered on top of the existing pipeline rather than replacing it.

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

 GCP Secret Manager ── injects firebase-admin-key; Cloud Run service account provides Vertex AI ADC ──► FastAPI Cloud Run service
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

### 2.3 v2 authenticated topology

```
┌──────────┐  OAuth popup  ┌──────────────────────────────┐  ID token  ┌──────────────────────────┐  Authorization: Bearer  ┌──────────────────────────────┐
│ Browser  │──────────────►│ Firebase Auth SDK            │───────────►│ ID token (IndexedDB)     │───────────────────────►│ Next.js                      │
└──────────┘               │ (Google OAuth only)          │            └──────────────────────────┘                         │ attaches header              │
                           └──────────────────────────────┘                                                                  ▼
                                                                                                           ┌──────────────────────────────────────┐
                                                                                                           │ FastAPI                              │
                                                                                                           │ firebase_admin.auth.verify_id_token  │
                                                                                                           └─────────────────┬────────────────────┘
                                                                                                                             ▼
                                                                                                           ┌──────────────────────────────────────┐
                                                                                                           │ rate-limit count query (Firestore)   │
                                                                                                           └─────────────────┬────────────────────┘
                                                                                                                             ▼
                                                                                                           ┌──────────────────────────────────────┐
                                                                                                           │ SequentialAgent                      │
                                                                                                           └─────────────────┬────────────────────┘
                                                                                                                             ▼
                                                                                                           ┌──────────────────────────────────────┐
                                                                                                           │ Firestore eval doc writes per step   │
                                                                                                           └─────────────────┬────────────────────┘
                                                                                                                             ├──────────────► SSE stream
                                                                                                                             └──────────────► Firestore realtime fallback
                                                                                                                                             ▼
                                                                                                                                      results/[id]

Cloud Scheduler (daily 02:00 MYT) ─────────► Cloud Run Job (prune) ─────────► Firestore
```

## 3. Component Responsibilities

| Component         | Responsibility                                                                       | Tech                                                                                        | Notes                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Frontend          | Upload widget, SSE consumer, ranked results, provenance panel, draft-packet download | Next.js 16.2 App Router, React 19, Tailwind 4, shadcn/ui, Lucide, ESLint 9 (flat config)    | Deployed to Cloud Run. English UI only (v1). Next.js 16 forces `--webpack` (see Plan B/§8).                                        |
| Backend API       | Single SSE endpoint hosting the agent pipeline                                       | FastAPI 0.115+, Python 3.12, async                                                          | `POST /api/agent/intake` accepts 3 multipart files.                                                                                |
| RootAgent         | Five-step pipeline orchestrator                                                      | ADK-Python v1.31 GA, `SequentialAgent`, Gemini 2.5 Pro                                      | Five `FunctionTool`s bound at init.                                                                                                |
| Extractor Worker  | IC / payslip / utility → Pydantic `Profile`                                          | Gemini 2.5 Flash (multimodal)                                                               | Strict JSON schema; no free text.                                                                                                  |
| Classifier Worker | Household flags, age flags, income band                                              | Gemini 2.5 Flash (structured output)                                                        | Deterministic schema.                                                                                                              |
| Rule Engine       | STR tier, Warga Emas means test, 5 LHDN reliefs                                      | Pydantic v2 models, Python                                                                  | Hardcoded thresholds; sourced from cached PDFs.                                                                                    |
| RAG (primary)     | Grounded retrieval over 3 scheme PDFs                                                | Vertex AI Search data store, FunctionTool wrapper                                           | Each hit returns passage + URL for provenance.                                                                                     |
| RAG (Plan B)      | Inline PDFs in 1M context                                                            | Gemini 2.5 Pro context window                                                               | Collapse trigger: Vertex AI Search setup stall past sprint hour 12.                                                                |
| Arithmetic        | Annual RM upside per scheme + total                                                  | Gemini Code Execution (`tools: [{codeExecution: {}}]`)                                      | 30-second sandbox; on-stage Python visible in SSE.                                                                                 |
| PDF Generator     | Three draft application PDFs                                                         | WeasyPrint 62+, HTML+CSS templates                                                          | Cloud Run container needs libpango, libcairo, libgdk-pixbuf.                                                                       |
| Secrets           | `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`                                      | Cloud Run env vars + ADC                                                                    | Injected via `--set-env-vars=GOOGLE_CLOUD_PROJECT=...,GOOGLE_CLOUD_LOCATION=...`; Gemini auth rides the Cloud Run service account. |
| Deploy            | Frontend + backend                                                                   | Cloud Run `--min-instances=1 --cpu-boost`                                                   | Warm 1 hour before demo slot.                                                                                                      |
| Scheme corpus     | Three source PDFs                                                                    | Git-versioned at `backend/data/schemes/`                                                    | Repo is the bucket; no GCS in v1.                                                                                                  |
| Seed script       | Index scheme PDFs into Vertex AI Search                                              | `backend/scripts/seed_vertex_ai_search.py` (exact path subject to backend-layout decisions) | One-time run; idempotent; checked into CI.                                                                                         |
| Firebase Auth     | Google OAuth sign-in, ID-token issuance, IndexedDB token storage, client bootstrap   | Firebase Auth (Google OAuth only)                                                           | `Continue with Google`, `pdpaConsentAt` gate, fetch wrapper.                                                                       |
| Firestore         | Session + archive layer for users, evaluations, and waitlist                         | Firestore (`asia-southeast1`)                                                               | Flat collections, owner-gated reads, backend-only writes.                                                                          |
| Cloud Scheduler   | Triggers nightly 30-day free-tier prune at 02:00 MYT                                 | Cloud Scheduler                                                                             | Schedules the Cloud Run Job once per day.                                                                                          |
| Cloud Run Job     | Deletes stale free-tier evaluations older than 30 days                               | Cloud Run Job                                                                               | `backend/scripts/prune_free_tier.py`.                                                                                              |

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

### 4.1 v2 authenticated flow

1. User clicks "Continue with Google" on `/sign-in` or `/sign-up`.
2. Firebase Auth completes Google OAuth and stores the ID token in IndexedDB.
3. Next.js attaches `Authorization: Bearer <id-token>` on dashboard API requests.
4. FastAPI runs `Depends(current_user)` / `firebase_admin.auth.verify_id_token` and injects the Firebase `uid`.
5. Backend performs the free-tier rate-limit count query against Firestore before SSE opens.
6. Backend creates `evaluations/{evalId}` with `status="running"`, `userId`, and `createdAt`.
7. The existing ADK `SequentialAgent` pipeline runs unchanged.
8. Each step writes to the Firestore evaluation doc and streams an SSE event to the frontend.
9. On completion, backend writes the final state, emits `done`, and the frontend routes to `/dashboard/evaluation/results/[id]`.
10. `/results/[id]` reads the Firestore document first; on refresh or deep-link it falls back to Firestore realtime updates until the doc is complete.

### 4.2 Manual Entry alternate flow (FR-21)

Privacy-first alternative to §4 for users unwilling to upload the documents themselves. Design spec: `docs/superpowers/specs/2026-04-21-manual-entry-mode-design.md`.

1. On the intake page, the user switches the segmented toggle to **Enter manually**. The three upload cards are replaced by a four-section form (Identity / Income / Address / Household).
2. The user types: full name, date of birth, IC last-4, monthly income RM, employment type (gig vs. salaried), optional address, and a dynamic list of dependants (relationship + age + optional IC last-4). Household size is derived on the server as `1 + len(dependants)` and never entered directly.
3. Next.js POSTs `application/json` to `/api/agent/intake_manual` instead of multipart `/api/agent/intake`. In v2 the same `Authorization: Bearer` header is attached.
4. FastAPI validates the payload through a Pydantic `ManualEntryPayload` model and builds a `Profile` via `backend/app/agents/tools/build_profile.py::build_profile_from_manual_entry` — no Gemini call.
5. The backend opens the same SSE response, emits a synthetic `step_started`/`step_result` pair for the `extract` step whose `data.profile` is the built `Profile`, then runs classify → match → compute_upside → generate **unchanged**. The UI stepper renders all five steps with the extract-step label changed to "Profile prepared".
6. No full IC number is transmitted. Only `ic_last4` and `date_of_birth` are accepted as identity inputs; `age` is derived server-side in the `asia-southeast1` timezone.
7. Endpoint auth parity: v1 intake is unauthed → manual endpoint is unauthed; v2 intake is authed → manual endpoint is authed. No feature-specific bypass.
8. Persistence (v2): the resulting `evaluations/{evalId}` is indistinguishable from an upload-path evaluation, so the history view, results page, and PDPA export/delete cascades treat both modes as one.

## 5. Google AI Ecosystem Integration

### 5.1 Model routing

| Step           | Model constant + ID                                | Why                                                                                                   |
| -------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| extract        | `FAST_MODEL = gemini-2.5-flash`                    | Multimodal OCR; GA-only and the right fit for IC, payslip, and utility-bill extraction.               |
| classify       | `WORKER_MODEL = gemini-2.5-flash-lite`             | About 5x cheaper than Flash; structured household classification stays low-latency and deterministic. |
| match          | Pure-Python rule engine                            | No LLM. Scheme thresholds and eligibility rules stay hardcoded and testable.                          |
| compute_upside | `HEAVY_MODEL = gemini-3-flash-preview` + code exec | Heavy arithmetic and structured outputs run in Gemini 3 Flash Preview with `code_execution`.          |
| generate       | Deterministic WeasyPrint + Jinja                   | PDF generation stays reproducible and non-LLM.                                                        |

The backend constructs `genai.Client(vertexai=True, project=os.environ["GOOGLE_CLOUD_PROJECT"], location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"))`; Phase 8 Task 1 confirmed that `asia-southeast1` only publishes `gemini-2.5-flash`, while the four-model matrix needed here is available from `global`, so the client location now defaults there. ADC on the Cloud Run service account handles auth, and the Vertex AI publisher model IDs stay the same. `HEAVY_MODEL_FALLBACK = gemini-2.5-pro` is the documented fallback.

### 5.2 Vertex AI Search

**Live retrieval layer for v1.** The `layak-schemes-v1` data store in Discovery Engine `global` is populated from `gs://layak-schemes-pdfs/` (multi-region `us`) via GCS-source ingestion (`GcsSource(input_uris=..., data_schema="content")`). The runtime helper in `backend/app/services/vertex_ai_search.py` exposes `search_passage()`, `passage_to_citation()`, and `get_primary_rag_citation()`; each rule module's `_citations()` prepends a Vertex-AI-Search-derived `RuleCitation` first and keeps the hardcoded citation as the fail-open fallback. Standard-edition limits apply: `snippet_spec` only, document IDs are random hashes so the helper filters by URI substring instead of doc_id, and any error returns an empty list with log-only fail-open behavior.

**Rationale.** The hackathon Technical Mandate (Handbook §3, "The Context") names Vertex AI Search as a required ecosystem component. The pitch narrative benefits visibly from a dedicated retrieval layer backing every number on-screen — this is the specific credibility beat that separates Layak from the MyGov Malaysia and NYC MyCity chatbot failures.

### 5.3 Handbook stack alignment

The Handbook (Technical Mandate, §3) names four stack components. Layak's coverage:

| Handbook component                                                    | Layak v1   | Notes                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The Intelligence (Brain)** — Gemini (Pro / Flash / Flash-Lite)      | ✅         | Pro remains `ORCHESTRATOR_MODEL` and `HEAVY_MODEL_FALLBACK`; Flash powers `extract`; Flash-Lite powers `classify`; Gemini 3 Flash Preview powers `compute_upside`; `match` stays rule-engine-only and `generate` stays deterministic. |
| **The Orchestrator** — Vertex AI Agent Builder + Firebase Genkit      | ✅ partial | Handbook explicitly names Vertex AI Agent Builder and Firebase Genkit. Layak keeps **ADK-Python v1.31 (GA)** — Google's first-party agent framework — and the existing Genkit deviation rationale.                                    |
| **The Development Lifecycle** — Google Cloud Workstations + Cloud Run | ✅         | Cloud Run and ADC remain the deployed lifecycle; Workstations stay optional (team laptops used).                                                                                                                                      |
| **The Context** — Vertex AI Search for grounded RAG                   | ✅         | Vertex AI Search is the live RAG layer grounding every eligibility claim.                                                                                                                                                             |

### 5.4 Cloud Run deploy commands

```bash
# Backend (FastAPI + ADK): ADK packages the container.
adk deploy cloud_run --with_ui

# Alternative / frontend: buildpack-based deploy.
gcloud run deploy layak-frontend --source . \
  --region asia-southeast1 \
  --min-instances=1 --cpu-boost \
  --allow-unauthenticated

# Vertex AI auth at deploy time.
gcloud run deploy layak-backend \
  --set-env-vars=GOOGLE_CLOUD_PROJECT=...,GOOGLE_CLOUD_LOCATION=... \
  ...
```

Required IAM: ADC handles Gemini auth via the attached Cloud Run service account (default Compute SA; inherited `roles/editor` covers `aiplatform.user`). Keep `roles/secretmanager.secretAccessor` for `firebase-admin-key`. Required API enablements: Vertex AI, Cloud Run, Artifact Registry, Secret Manager, Vertex AI Search (Discovery Engine).

### 5.5 Firestore as the session + archive layer

- **Schema summary:** top-level flat collections `users`, `evaluations`, and `waitlist`; each record carries a `userId` field for owner-scoped queries.
- **Composite index:** `evaluations` on `(userId ASC, createdAt DESC)`.
- **Security rules summary:** backend-only writes; client reads gated on `request.auth.uid == resource.data.userId` (and `request.auth.uid == userId` for user docs).
- **Rate-limit query pattern:** `.where("userId", "==", uid).where("createdAt", ">=", now - timedelta(hours=24)).count()`.
- **Migration note:** the flat collection shape keeps cross-user rate-limit checks and history lookups simple without nested subcollections.

## 6. External Dependencies

### 6.1 Government source PDFs (cached in-repo under `backend/data/schemes/`)

| Scheme                              | File                               | Canonical URL                                                                                           |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| STR 2026 eligibility infographic    | `risalah-str-2026.pdf`             | https://bantuantunai.hasil.gov.my/FAQ/RISALAH%20STR%202026.pdf                                          |
| STR 2026 application form           | `bk-01.pdf`                        | https://bantuantunai.hasil.gov.my/Borang/BK-01%20(Borang%20Permohonan%20&%20Kemaskini%20STR%202026).pdf |
| JKM Warga Emas application form     | `jkm18.pdf`                        | https://www.jkm.gov.my/jkm/uploads/files/Bahagian%20PW/BORANG%20PERMOHONAN%20JKM%2018%20(2022)(1).pdf   |
| LHDN Public Ruling 4/2024 (reliefs) | `pr-no-4-2024.pdf`                 | https://www.hasil.gov.my/media/d2wh4ykj/pr-no-4-2024.pdf                                                |
| LHDN explanatory notes BE2025       | `explanatory-notes-be2025.pdf`     | https://www.hasil.gov.my/media/pshpbomm/explanatorynotes_be2025_2.pdf                                   |
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
│   │   ├── app/                  App Router: route wrappers, layout, globals.css
│   │   │   └── pages/            page modules imported by the route wrappers
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
├── docs/                         PRD, TRD, roadmap, plan, progress
├── .claude/                      project instructions, skills inventory
├── .husky/                       git pre-commit hook
├── package.json                  root orchestrator (husky, lint-staged, prettier)
└── pnpm-workspace.yaml
```

Route files under `frontend/src/app/(app|auth|marketing)/**/page.tsx` stay as thin wrappers; the page implementations now live in `frontend/src/app/pages/**`.
The backend setup notes that used to live in `backend/README.md` are now captured here in §6.4 and §5.4.

### 6.5 Data & storage

- **No application database** in v1. Layak is stateless: user documents and profiles live only in request-scope memory and are discarded at response-end.
- **Scheme rules** are encoded as typed Pydantic v2 models in `backend/app/rules/` (Phase 1 scaffold).
- **Scheme PDFs** are the source of truth and live at `backend/data/schemes/`, versioned in git. The repo is the bucket.
- **Vertex AI Search data store** is populated one-time by `backend/scripts/seed_vertex_ai_search.py`. The script is idempotent and re-runnable.
- **No GCS bucket, no Firestore, no Cloud SQL, no Redis** — none are provisioned in v1.

### 6.6 Pre-commit hooks (Husky + lint-staged)

Layak uses **Husky** to ship git hooks with the repo. Hooks live in `.husky/` (tracked in git); on `pnpm install`, the root `prepare: husky` script auto-configures git's `core.hooksPath` to point there, so every developer gets the same hooks on the first install — no per-machine setup required.

**lint-staged** runs commands only on _staged_ files, keeping pre-commit checks fast. Configs:

- Frontend: `frontend/package.json → "lint-staged"` runs `eslint --fix` on `**/*.{ts,tsx,js,jsx}`.
- Root: `package.json → "lint-staged"` runs `prettier --write` on `*.{md,json,yml,yaml}` and `docs/**/*.md`.

**The hook** is `.husky/pre-commit`:

```sh
pnpm --dir frontend exec lint-staged   # ESLint --fix on staged frontend ts/tsx/js/jsx
pnpm exec lint-staged                  # Prettier --write on staged root md/json/yaml
```

Both invocations use `pnpm exec` to bypass the pnpm v10 bare-script shortcut which misroutes `pnpm -C frontend lint-staged` as a recursive workspace command.

**Developer experience:**

- `git commit` runs the hook automatically; on failure, the commit aborts with the failing tool's output.
- Any auto-fixes from ESLint / Prettier are re-added to the staged set transparently.
- Emergency bypass (avoid): `git commit --no-verify`.
- Adding a new check (e.g. a type-check pre-push): append to `.husky/pre-commit` or create a new hook file such as `.husky/pre-push` — both are tracked and propagate to the team on next `pnpm install`.

**Why Husky and not raw git hooks:** raw hooks live in `.git/hooks/` which is outside git tracking, so they can't be versioned or shared. Husky flips that by keeping hook scripts in-repo and wiring them in on install.

### 6.7 v2 environment variables

- **Backend (Secret Manager):** `FIREBASE_ADMIN_KEY` (secret: `firebase-admin-key`).
- **Frontend (build-time, publishable):** `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
- **Vertex AI auth:** `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`.
- **Retained from v1:** `VERTEX_AI_SEARCH_DATA_STORE`.

## 7. Security & Secrets

- `.env` and `.env.*` are git-ignored repo-wide; `.env.example` / `.env.template` are the only committed templates (whitelisted in root `.gitignore`).
- **Secrets split: Secret Manager for `firebase-admin-key` only; Gemini auth is project-based via Vertex AI ADC and the Cloud Run service account.** This keeps production deploys free of Gemini secret mounts while preserving the existing Firebase admin secret path.
  - **Production (Cloud Run)**: inject `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` with `--set-env-vars=GOOGLE_CLOUD_PROJECT=...,GOOGLE_CLOUD_LOCATION=...`; ADC handles Gemini auth via the attached Cloud Run service account.
  - **Development (local)**: a single gitignored `.env` at the repo root is the only local config file. Next.js reads it through a `frontend/.env.local -> ../.env` symlink auto-created by the `predev` and `prebuild` hooks in `frontend/package.json`; FastAPI loads it via `python-dotenv` pointed at the repo root. Run `gcloud auth application-default login` once for ADC.
  - Root `.env.example` is the single committed template catalogue of env var names; values stay blank.
- Cloud Run service account has `roles/secretmanager.secretAccessor` for `firebase-admin-key` plus the minimum Vertex AI access roles; no broader privilege.
- HTTPS-only (Cloud Run defaults).
- No PII persisted. IC numbers appear in UI and packet as last-4-digits only; full IC is held only in request-scope memory on the backend and never logged.
- Synthetic demo documents carry the "SYNTHETIC — FOR DEMO ONLY" watermark on every page. No real MyKad photos are used.
- AI-disclosure text in README names Claude Code (Anthropic) per hackathon Rules §4.2.

**ID-token verification middleware.** FastAPI applies `Depends(current_user)` on every `/api/**` dashboard endpoint except `/api/health`; the middleware is the only accepted path into authenticated backend reads and writes.

**Firestore security rules.** All writes stay backend-only. Client reads are owner-gated with `request.auth.uid == resource.data.userId`, so the browser can only see its own `users` and `evaluations` documents.

**PDPA 2010 posture.** Sign-up records consent in `pdpaConsentAt`, preserves the IC last-4 invariant, keeps free-tier history on a 30-day retention window, and exposes user-rights endpoints for export plus delete-cascade. Uploaded documents are still discarded after extraction.

**Encryption.** Firestore uses default encryption at rest, while Cloud Run HTTPS and Firebase Auth TLS cover transport in transit.

### 7.1 Local environment + secrets policy

1. Copy `.env.example` to `.env` at the repo root. Keep `.env` gitignored.
   Run `gcloud auth application-default login` once on the dev machine so ADC exists for Vertex AI.
   Run `pnpm install` once. The frontend `predev` hook in `frontend/package.json` symlinks `frontend/.env.local` to `../.env` before `pnpm dev`.
   Keep the root file as the single source of truth for both services.
   Do not duplicate values into per-service env files.
2. The backend reads `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` from `.env` and constructs `genai.Client(vertexai=True, ...)` in `backend/app/agents/gemini.py::get_client()`.
   Local auth comes from ADC. Production auth comes from the attached Cloud Run service account.
   Do not reintroduce an AI Studio Gemini API key into this flow.
   The client should never need a JSON key or OAuth refresh token for AI.
3. Keep production secrets in GCP Secret Manager.
   `firebase-admin-key` owns `FIREBASE_ADMIN_KEY`, and Cloud Run injects it with `--set-secrets FIREBASE_ADMIN_KEY=firebase-admin-key:latest`.
   Leave the old `gemini-api-key` entry on the deprecation path until one stable demo cycle passes, then delete it per the Phase 6 Task 6 closing checkbox.
   Rotate the secret through Secret Manager, not by editing deploy commands.
4. Treat Firebase Web SDK keys as identifiers, not secrets.
   The `NEXT_PUBLIC_FIREBASE_*` values only tell Google which project to talk to.
   Access control comes from Firestore rules plus the backend Admin SDK boundary, not from obscuring those public fields.
   The values are public because the browser must read them at build time.
5. Keep `NEXT_PUBLIC_BACKEND_URL=http://localhost:8080` in local `.env`.
   Cloud Run injects the production backend URL at deploy time with `--set-build-env-vars`, so the local default never ships.
   Use the same value for local dev and preview builds; only Cloud Run overrides it.
6. Keep `PORT=3000` for local Next.js runs.
   Cloud Run injects its own `PORT`, so the local value is only for `pnpm dev` and `pnpm start`.
   If the port changes locally, change the root `.env`, not the deploy config.

## 8. Feasible-Minimum Tech Stack (Plan B)

**Plan B scope.** Vertex AI Search is live in Phase 8 Task 3, so Plan B is no longer the optional layer the stack collapses away from. If Discovery Engine is unreachable on demo day, the documented fallback is **Gemini 2.5 Pro inline-PDF grounding**. The three cached scheme PDFs (~80K tokens combined) are dropped directly into the system prompt; the RootAgent holds the entire corpus inline in its 1M-token context window. The `match_schemes` FunctionTool is rewritten to reference passages by `(pdf_filename, page)` pairs already in context rather than making a Search call.

**Plan B does not drop ADK-Python or the five-step pipeline.** The RootAgent, `SequentialAgent`, and `FunctionTool` bindings stay identical; only the retrieval FunctionTool implementation changes. Expected migration cost: ~1 hour (replace Search client calls with a local passage lookup). Cost per demo run rises marginally but stays well under RM1.

**Ceiling collapse (hour 18+).** If the RootAgent itself is unstable at sprint hour 18, refer to PRD §6.3 emergency de-scope. The four-step cut list begins with dropping packet generation and ends with replacing live extraction with Aisyah seed data.

### 8.2 Supabase fallback for v2 auth + DB layer

- **Trigger:** Firebase Auth or Firestore blocker within the first sprint day of v2; PO1 calls the collapse trigger, and both accept without re-debate.
- **Auth swap:** Supabase Auth Google provider.
- **DB swap:** Supabase Postgres with RLS policies keyed on `auth.uid()`.
- **Schema translation:** `users`, `evaluations`, and `waitlist` tables, with `JSONB` for embedded `Profile`, `classification`, and `matches`.
- **RLS policy template:** `CREATE POLICY user_read_own ON evaluations FOR SELECT USING (auth.uid() = user_id);`
- **Migration cost:** about 1 day; ADK `SequentialAgent` and SSE stay unchanged.

## 9. Open Questions

### 9.1 Handbook orchestrator mismatch

**Question.** The Handbook (Technical Mandate §3) names **Vertex AI Agent Builder** and **Firebase Genkit** as the two orchestrators. Layak uses **ADK-Python v1.31 (GA)** instead.

**Rationale for deviation.** ADK-Python is Google's first-party agent framework (`pypi.org/project/google-adk`, `github.com/google/adk-python`), shares the same `FunctionTool` / `LlmAgent` / `SequentialAgent` primitives as ADK-TS, and deploys to Cloud Run via `adk deploy cloud_run --with_ui`. Genkit-Python is Alpha (v0.5) with a known "Event loop is closed" bug on warm Cloud Run instances (genkit-ai/genkit#4925) that would be catastrophic during a live demo. Vertex AI Agent Builder adds 2–4 hours of setup time with no demo-visible benefit over ADK at this scope.

**Risk.** A judge may ask why neither named orchestrator is in the stack. The defence is: "ADK-Python is Google's first-party GA agent framework; Genkit-Python is Alpha with a documented warm-instance bug; Agent Builder setup exceeds our sprint budget with no visible-in-demo upside." The README's AI disclosure section will state this explicitly.

**Action.** Raise with human PO before sprint start for final sign-off.

### 9.2 Vertex AI Search collapse trigger

**Trigger.** If Vertex AI Search data-store creation, indexing, or IAM wiring is not complete by **sprint hour 12**, collapse to the Plan B inline-PDF grounding in §8.

**Owner.** PO1 calls the trigger.

**Indicator metrics.** (a) the seed script `backend/scripts/seed_vertex_ai_search.py` has not run to green by hour 10; (b) a canary retrieval query against the data store returns zero or low-quality hits by hour 11; (c) the service account cannot be granted the required Discovery Engine role within ops budget.

### 9.3 GCP project and region pinning

- [BLOCKED ON INFRA SETUP] GCP project ID.
- [BLOCKED ON INFRA SETUP] Cloud Run region (candidate: `asia-southeast1` for latency).
- [BLOCKED ON INFRA SETUP] Vertex AI Search data store ID and region.

### 9.4 Backend layout — RESOLVED

Monorepo via pnpm workspace. Frontend lives at `frontend/` (workspace package `layak-frontend`); backend lives at `backend/` (Python app, not a pnpm package). Backend skeleton landed in Phase 0; the setup notes that used to live in `backend/README.md` are captured here in §6.4 and §5.4. `backend/app/`, `backend/scripts/seed_vertex_ai_search.py`, and the six committed scheme PDFs under `backend/data/schemes/` are canonical paths. See §6.4 for the full repo layout.

### 9.5 JKM Warga Emas rate

Budget 2026 announced RM600/month; no gov.my PDF yet reflects the uplift (JKM federal page last revised 2019). UI copy falls back to "RM500–600/month depending on current gazetted rate" when the rule engine cannot confirm RM600 against the live JKM18 form. Decision: display RM600 in demo copy and cite the Budget 2026 speech; keep the RM500 fallback string in the rule engine for belt-and-braces.

### 9.6 Demo document specimens — RESOLVED

Closed by commit landing the three synthetic HTML documents at `docs/demo/` (`mykad.html`, `grab-earnings.html`, `tnb-bill.html`). The files are the docs-side source of truth and can be opened directly from the workspace or served from any local static host; the render guide now lives here instead of `docs/demo/README.md`. All three carry the repeated diagonal `SYNTHETIC — FOR DEMO ONLY` watermark, pin to `backend/app/fixtures/aisyah.py` (name, IC `900324-06-4321`, monthly income RM2,800, address shared between MyKad and TNB), and avoid any replication of the Malaysian coat of arms, holographic foil, or chip contacts. Pitch deck slide 1 must also disclose the documents as synthetic.

Original decisions (preserved for audit trail):

- MyKad — synthetic, watermarked, fictional IC number, no holographic/chip elements.
- Grab earnings statement replaces the original payslip/EA Form plan — Aisyah is a Form B gig worker (docs/prd.md §3.1), so an EA Form specimen would have misrepresented her filer category. Monthly net ties to `monthly_income_rm`.
- TNB utility bill — no official specimen PDF exists on tnb.com.my; generated from observed layouts with no real account or meter numbers.

All three are PDPA 2010 / NRR 1990 compliant only so long as they are labelled SYNTHETIC on every page and in slide 1 of the pitch deck.

### 9.7 Rate-limit race condition

**Acknowledged-and-accepted.** Concurrent free-tier submissions can squeeze past the 5/24 h cap by 1-2 evaluations. The cap is a UX guardrail, not a billing boundary, so this is not fixed in v2.

## 10. Team & Delivery Responsibilities

Two developers, two strong-lane focus areas, one hard submit deadline (21 Apr 23:00 MYT). Ownership is mapped directly to `docs/plan.md` tasks and `docs/roadmap.md` phase milestones so nothing falls between lanes.

### 10.1 Roles at a glance

| Role     | Name | Focus                            | Primary areas they own                                                                                                                                                                                                                                             |
| -------- | ---- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PO1**  | Hao  | AI · backend · infra             | `backend/` tree; this TRD §3 (component responsibilities), §4 (data flow), §5 (Google AI ecosystem integration); GCP project + Secret Manager + Gemini API key; rule-engine correctness against cached scheme PDFs; hackathon Google-Form submission.              |
| **PO2**  | Adam | Frontend · UX · responsiveness   | `frontend/` tree; `docs/prd.md` §4 (FR-1…FR-10 UI contracts) and §6 (in-/out-of-scope surfacing in UI); shadcn component integration; upload widget + SSE consumer + ranked-scheme list + provenance panel; pitch deck (Canva); responsiveness pass and UI polish. |
| **Both** | —    | Integration · rehearsal · submit | Frontend ↔ backend wiring (Phase 1 midday block); synthetic demo documents validation; three clean 90-second demo rehearsals; submission package (README + video + deck); 23:00–23:59 buffer-zone resubmit if anything breaks.                                     |

> **NOTE:** Agent-role conventions (PL / PG / QA / AD) in `docs/roles.md` are orthogonal — those apply to AI agents working on the repo (Claude Code, Codex, etc.), not to the two human developers. The `.claude/CLAUDE.md` working-convention override grants agent-commit permission for this project; human reviews before push.

### 10.2 Phase ownership matrix

Each row below maps to a specific task in `docs/plan.md` or a milestone in `docs/roadmap.md`. **Owner** is primary; `Both` = paired block. When a matching task in `plan.md` is fully ticked, the matrix row is considered delivered.

| Phase | Task                                                                                                                                              | Owner                                   | Anchor                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| **0** | Docs decomposition → PRD / TRD / roadmap / plan / progress                                                                                        | PO2 (solo tonight)                      | `docs/plan.md` Phase 0 tasks 1–2, commits `4eab9cb`, `484e83d`  |
| **0** | `.claude/` project instructions + skills inventory                                                                                                | PO2                                     | `docs/plan.md` Phase 0 task 3, commit `f266a56`                 |
| **0** | Next.js 16 + React 19 + Tailwind 4 + shadcn + Husky scaffold                                                                                      | PO2                                     | `docs/plan.md` Phase 0 task 4, commit `fcbe6b5`                 |
| **0** | Refactor into `frontend/` + `backend/` pnpm workspace                                                                                             | PO2                                     | `docs/plan.md` Phase 0 task 6, commits `b7bf34a`, `5171838`     |
| **0** | Download + commit six scheme source PDFs into `backend/data/schemes/` (renamed to lowercase kebab-case)                                           | Either (mechanical)                     | `docs/plan.md` Phase 0 task 7, commits `9138113`, `d57694b`     |
| **0** | GCP project signup; enable Vertex AI + Cloud Run + Artifact Registry + Secret Manager + Discovery Engine APIs; Gemini API key → Secret Manager    | PO1 (Hao)                               | `docs/roadmap.md` Phase 0 exit gate · **BLOCKED on PO1 signup** |
| **0** | Hello-world FastAPI → Gemini → Cloud Run container (`v0.0.1-helloworld` tag)                                                                      | Both                                    | `docs/roadmap.md` Phase 0 exit gate · blocked on GCP            |
| **1** | Pydantic `Profile` / `SchemeMatch` / `Packet`; FastAPI skeleton with `POST /api/agent/intake` SSE stub; ADK `SequentialAgent` + 2–3 FunctionTools | PO1                                     | `docs/plan.md` Phase 1 task 1                                   |
| **1** | Upload widget (FR-2), SSE consumer, ranked-scheme list skeleton (FR-6), provenance panel layout (FR-7), demo-mode banner (FR-10)                  | PO2                                     | `docs/plan.md` Phase 1 task 2                                   |
| **1** | Five-step orchestration (extract → classify → match → compute_upside → generate_packet); Vertex AI Search indexing; hour-12 Plan B trigger        | PO1 (PO2 wires SSE events into UI)      | `docs/plan.md` Phase 1 task 3 · this TRD §8                     |
| **1** | Rule engine: STR 2026 household tier, JKM Warga Emas per-capita means test, five LHDN Form B reliefs; unit tests vs cached PDFs                   | PO1                                     | `docs/plan.md` Phase 1 task 4                                   |
| **1** | Wire frontend ↔ backend end-to-end: real SSE, live provenance, Code Execution on stage, WeasyPrint drafts downloadable                            | Both                                    | `docs/plan.md` Phase 1 task 5                                   |
| **1** | Cloud Run deploy with `--min-instances=1 --cpu-boost`, Vertex AI env vars + ADC                                                                   | PO1                                     | `docs/plan.md` Phase 1 task 6                                   |
| **1** | Responsiveness pass at 375 / 768 / 1440; three clean demo rehearsals of the 90-second Aisyah flow                                                 | PO2 (responsiveness) / Both (rehearsal) | `docs/plan.md` Phase 1 task 6                                   |
| **2** | UI polish: copy review, empty states, obvious-bug sweep                                                                                           | PO2                                     | `docs/plan.md` Phase 2 task 1                                   |
| **2** | README final pass: features, setup, AI disclosure (Rules §4.2), architecture overview (ASCII from this TRD)                                       | PO1                                     | `docs/plan.md` Phase 2 task 1                                   |
| **2** | 3-min demo video: script → 2 takes → caption if time → unlisted YouTube                                                                           | PO1                                     | `docs/plan.md` Phase 2 task 2                                   |
| **2** | 15-slide pitch deck in Canva: problem → user → solution → demo → architecture → tech → impact → business → team → export `pitch.pdf`              | PO2                                     | `docs/plan.md` Phase 2 task 3                                   |
| **2** | Fill + submit Google Form: repo URL, Cloud Run URL, video URL, `pitch.pdf`, GitHub profiles, track + category                                     | PO1 (Team Lead submits)                 | `docs/plan.md` Phase 2 task 4                                   |
| **2** | 23:00–23:59 buffer: resubmit if any link breaks                                                                                                   | Both                                    | `docs/roadmap.md` Phase 2                                       |
| **2** | v2 SaaS Foundation (Auth + Firestore wiring)                                                                                                      | Both                                    | `docs/plan.md` Phase 2                                          |
| **3** | v2 Persisted Evaluations + Rate Limiting                                                                                                          | Both                                    | `docs/plan.md` Phase 3                                          |
| **4** | v2 Dashboard UX (History, Stats, Settings)                                                                                                        | Both                                    | `docs/plan.md` Phase 4                                          |
| **5** | v2 Marketing Landing + Legal                                                                                                                      | PO2                                     | `docs/plan.md` Phase 5                                          |
| **6** | v2 Production Cutover                                                                                                                             | Both                                    | `docs/plan.md` Phase 6                                          |

### 10.3 Cross-cutting responsibilities

- **Synthetic demo documents** (MyKad, payslip, TNB utility bill — this TRD §9.6): PO2 designs the visual templates; PO1 validates extraction compatibility with Gemini 2.5 Flash before demo rehearsal. Every page watermarked "SYNTHETIC — FOR DEMO ONLY"; fictional IC number; AI-generated face disclosed on slide 1 of the pitch deck.
- **Code review on `main`**: for substantive commits (not formatting or doc-only), the other developer reads the diff before the next commit lands on top. Hard pass after feature freeze (21 Apr 18:00) — trust and keep moving.
- **Progress logging**: after every meaningful milestone, append a dated entry to `docs/progress.md` (format in `.claude/CLAUDE.md`) and tick matching items in `docs/plan.md`. Applies to both devs.
- **Conventional Commits**: every commit follows `.claude/CLAUDE.md` → Git Commit Convention (`<type>(scope): <description>`, imperative mood, single sentence, no body, no trailing period). Allowed types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`. Allowed scopes in the project's CLAUDE.md.
- **AI-coding tool disclosure**: Claude Code, Codex, or any agentic coder used inside the hackathon window must be named in the README AI Disclosure section (Rules §4.2). PO1 writes that section during Phase 2 README pass.

### 10.4 Swap & escalation rules

- **PO1 blocked on ADK-Python migration past the 4-hour budget** (this TRD §10 feasibility note inside the source research brief `docs/project-idea.md` §10): PO2 takes on Cloud Run deploy scaffold so the deploy is unblocked the moment PO1's backend turns green.
- **Vertex AI Search setup stalls past sprint hour 12**: PO1 calls the trigger; team collapses to Plan B inline-PDF grounding (this TRD §8). ADK-Python and the five-step pipeline stay intact; only the retrieval FunctionTool changes.
- **Pipeline still unstable at sprint hour 18**: activate the emergency de-scope list in `docs/prd.md` §6.3 — drop PDF packet → drop Code Execution arithmetic → drop two of the five LHDN reliefs → fall back to Aisyah seed fixtures. PO1 proposes, PO2 seconds, both execute in parallel.
- **Either dev blocked for more than 30 minutes**: ask the other for a 5-minute pair-check before scope-switching. Don't suffer in silence.
- **Feature freeze at 21 Apr 18:00 (sprint hour 10/10 of Phase 1)**: no new endpoints, pages, or flows. Bug fixes only until code freeze at 21 Apr 21:00. Submission-metadata-only commits after code freeze.
