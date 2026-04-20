# CLAUDE.md

> **Read `docs/roles.md` first** — it defines your role, responsibilities, and boundaries within the multi-agent workflow for this project.

---

## Project

**Layak** — an agentic AI concierge for Malaysian social-assistance schemes. One citizen uploads three documents; the agent runs a five-step pipeline (extract → classify → match → rank → generate) and returns a ranked list of schemes with cited-source provenance plus three pre-filled draft application PDFs watermarked "DRAFT — NOT SUBMITTED." Submitted to Project 2030: MyAI Future Hackathon under **Track 2 — Citizens First (GovTech & Digital Services), Open category**. Hard submit at 21 Apr 2026 · 23:00 MYT.

Primary persona is **Aisyah** — 34, Grab driver in Kuantan, two school-age children, one 70-year-old dependent father. She files **Form B** (self-employed), not Form BE. She activates all three locked schemes in one flow: STR 2026 household tier, JKM Warga Emas (father), and five LHDN Form B reliefs.

---

## Current Phase

`docs/roadmap.md` is the single source of truth for the sprint timeline. Read it before every major task. Do not duplicate timestamps or milestones here — consult the roadmap and the `docs/progress.md` tail instead.

- **Tonight (Phase 0):** docs decomposition, `.claude/` initialization, frontend scaffolding. No backend, no deploy.
- **Tomorrow AM (Phase 1):** core build — backend data models, ADK-Python orchestration, rule engine, Vertex AI Search, Cloud Run deploy, responsiveness pass.
- **Tomorrow PM (Phase 2):** polish, README, 3-min video, 15-slide deck, final submission.

---

## Architecture

The full architecture contract lives in `docs/trd.md`. Do **not** create `docs/architecture.md` — TRD is canonical.

Two-service app: **Next.js 16 frontend** (React 19, Tailwind 4) and **FastAPI + ADK-Python backend**, both on Cloud Run. The `RootAgent` (Gemini 2.5 Pro, ADK `SequentialAgent`) orchestrates five `FunctionTool`s. Vertex AI Search is the primary RAG layer over three committed scheme PDFs in `backend/data/schemes/`. The app is **stateless** — no DB, no GCS, no Firestore in v1; scheme rules are hardcoded Pydantic models; the repo is the source of truth for the scheme corpus.

Plan B (at sprint hour 12 if Vertex AI Search setup stalls): collapse to Gemini 2.5 Pro inline-PDF grounding in its 1M-token context. Keep ADK-Python and the five-step pipeline intact. See `docs/trd.md` §8.

---

## Tech Stack

### Frontend

- **Framework:** Next.js 16 App Router (`--webpack` forced in scripts; Turbopack is the 16 default but the WSL webpack-polling config below is tried-and-true), React 19, TypeScript 5.
- **Next.js 16 note.** The scaffold ships `AGENTS.md` + root `CLAUDE.md` warning that Next.js 16 has breaking changes vs prior training data. Read `node_modules/next/dist/docs/` before writing framework-sensitive code. Heed deprecation notices in `next dev` output.
- **Styling:** Tailwind CSS, shadcn/ui (slate, CSS variables), Lucide React icons.
- **Tooling:** pnpm (packageManager=pnpm@10.33.0, engines.node=24.x), Husky + lint-staged, Prettier + `prettier-plugin-tailwindcss`, ESLint.
- **Dev experience:** `next.config.mjs` sets WSL-friendly HMR polling (`poll: 800`, `aggregateTimeout: 300`, ignore `node_modules`).

### Backend

- **Framework:** FastAPI 0.115+, Python 3.12, async.
- **Agent layer:** ADK-Python **v1.31 (GA)** — `FunctionTool`, `LlmAgent`, `SequentialAgent`, `ParallelAgent`. **Do not use Firebase Genkit-Python** (Alpha, warm-instance bug on Cloud Run).
- **Models:** Gemini 2.5 Pro (RootAgent orchestrator); Gemini 2.5 Flash (extractor + classifier workers); Gemini Code Execution (`tools: [{codeExecution: {}}]`) for on-stage arithmetic.
- **RAG:** Vertex AI Search (primary) over three scheme PDFs; Plan B collapses to Gemini 2.5 Pro inline-PDF grounding.
- **Schema:** Pydantic v2 models for `Profile`, `SchemeMatch`, `Packet`, and rule-engine thresholds.
- **PDF generator:** WeasyPrint (Cloud Run container needs `libpango`, `libcairo`, `libgdk-pixbuf`).

### Infrastructure & Tooling

- **Deploy target:** Google Cloud Run. Frontend via `gcloud run deploy --source .`; backend via `adk deploy cloud_run --with_ui`. Both with `--min-instances=1 --cpu-boost` at least 1 hour before the demo slot. Region candidate: `asia-southeast1`.
- **Secrets:** GCP Secret Manager (`gemini-api-key`). Injected via `--set-secrets=GEMINI_API_KEY=gemini-api-key:latest`. Cloud Run service account holds `roles/secretmanager.secretAccessor` and the minimum Vertex AI roles.
- **APIs required:** Vertex AI, Cloud Run, Artifact Registry, Secret Manager, Discovery Engine (Vertex AI Search).
- **CI/CD:** `.github/workflows/` placeholder — workflows land during Phase 1 hardening.
- **Data layout:** Scheme PDFs at `backend/data/schemes/` (versioned in git); one-time seed via `backend/scripts/seed_vertex_ai_search.py` (exact path subject to backend-layout decision). No application database.

---

## Commands

```bash
# Frontend (from repo root)
pnpm install                    # install deps
pnpm dev                        # start Next.js dev server on :3000
pnpm lint                       # ESLint
pnpm build                      # production build check
pnpm format                     # prettier --write .
pnpm exec prettier --write <files>

# Husky hook runs on every commit
pnpm lint-staged                # ESLint on staged ts/tsx/js/jsx; Prettier on staged md/json/css

# shadcn/ui (once scaffolded)
pnpm dlx shadcn@latest add <component>

# Google Cloud (do NOT run in Phase 0)
gcloud auth login
gcloud config set project <project-id>
gcloud services enable run.googleapis.com aiplatform.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com discoveryengine.googleapis.com
gcloud secrets create gemini-api-key --replication-policy=automatic
gcloud run deploy layak-frontend --source . --region asia-southeast1 --min-instances=1 --cpu-boost --allow-unauthenticated
adk deploy cloud_run --with_ui     # backend deploy

# Git
git status
git log --oneline -10
git push origin main
```

---

## Code Style

- **Naming:** `camelCase` for TS/JS variables and functions; `PascalCase` for React components and TS types; `snake_case` for Python modules, functions, and Pydantic field aliases only if required for external schemas.
- **Imports:** Use the `@/*` alias for intra-frontend imports; keep component folder structure flat under `src/components/<domain>/`. shadcn/ui primitives live at `src/components/ui/`.
- **Server vs client components:** Default to server components; mark client components explicitly with `"use client"` at the top.
- **Types:** No `any`. Prefer `unknown` + narrowing. Prefer Zod / Pydantic schemas at boundary points.
- **Error handling:** Validate at system boundaries (user uploads, Gemini responses, Vertex AI Search hits). Do not wrap internal framework calls in try/catch.
- **Comments:** Default to none. Only write a comment when the _why_ is non-obvious (hidden constraint, subtle invariant, workaround for a specific bug). Never describe _what_ the code does.
- **File length:** No hard cap, but split a file when two unrelated responsibilities coexist.

---

## Working Conventions

- **CLI-first.** Configure everything via `gcloud`, `pnpm`, `gh`, `git`. Avoid GUI setup unless there is no CLI equivalent.
- **For this project, agent commits are allowed via Conventional Commits. Human reviews before push.**
- **Commit often.** One commit per meaningful unit (per kickoff step in Phase 0; per feature/bugfix afterwards). See Git Commit Convention below.
- **Log progress.** After every meaningful milestone, append a dated one-paragraph entry to `docs/progress.md`. Tick completed items in `docs/plan.md`.
- **No secrets in repo.** `.env.example` committed, `.env` gitignored. `GEMINI_API_KEY` lives in Secret Manager in production. No credentials in README, logs, or UI strings.
- **Respect freeze points.** Past the Phase 1 feature freeze (21 Apr 18:00 MYT / sprint hour 20/24), no new endpoints, pages, or flows. Bug fixes only until code freeze (21 Apr 21:00 MYT).
- **Plan B trigger.** If Vertex AI Search is not green by sprint hour 12, collapse to the inline-PDF grounding plan (`docs/trd.md` §8). P1 calls the trigger.

---

## Critical Do-Nots

- **Do not** run `pnpm install` on a massive dependency without flagging it to the user first.
- **Do not** `git push --force`, rewrite published history, or delete branches.
- **Do not** deploy to Cloud Run in the Phase 0 scaffolding task — deployment is a Phase 1 milestone.
- **Do not** wire up any Gemini or Vertex AI call until the backend stack is confirmed at sprint start.
- **Do not** create `docs/architecture.md` — architecture lives in `docs/trd.md` as ASCII diagrams.
- **Do not** introduce a database, GCS bucket, Firestore collection, or any persistence layer in v1 — Layak is stateless.
- **Do not** use Firebase Genkit-Python — it is Alpha with a documented warm-instance bug (`genkit-ai/genkit#4925`). The orchestrator is **ADK-Python v1.31 GA**.
- **Do not** submit anything to a real government portal. Every output is a DRAFT packet the user submits manually.
- **Do not** use a real MyKad image. Synthetic only, watermarked "SYNTHETIC — FOR DEMO ONLY" on every page, fictional IC number, no holographic or chip replication.

---

## Re-Read Discipline

Start every new session by reading, in this order:

1. `docs/roadmap.md` — current phase + freeze points.
2. `docs/progress.md` — most recent dated entry (tail only).
3. `docs/roadmap.md` Decision log — what the PO has locked.
4. `docs/plan.md` — current task breakdown and which checkboxes are ticked.
5. `docs/prd.md` and `docs/trd.md` only when touching the matching domain.

Do not rely on memory from prior sessions — always reconfirm against the files above.

---

## Git Commit Convention

All commit messages **must** follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) with these constraints:

- **Format:** `<type>[optional scope]: <description>`
- **No body or footer** — the description line is the entire commit message.
- **Single sentence**, imperative mood, no trailing period.
- **Allowed types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`
- **Scopes:** `admin`, `creator`, `editor`, `consumer`, `auth`, `lambda`, `infra`, `ui`, `db`, `frontend`

### Agent Reminder Rule

After completing any **major implementation or significant change** (i.e., something worth a standalone Git commit), the agent **must** suggest a ready-to-use commit message to the user in this format:

> **Suggested commit:** `feat(scope): brief description of what was done`

Do **not** suggest a commit for minor tweaks, formatting-only changes, or doc-only updates unless explicitly asked.

---

## Agent Workflow & Documentation Protocol

1. Write or find `/docs/plan.md` for the next task before implementing anything.
2. Reference `/docs/trd.md` for architecture decisions, API contracts, data models, and pipeline details.
3. Reference `/docs/prd.md` for product requirements and acceptance criteria.
4. Reference `/docs/roadmap.md` for the development phase timeline only.
5. After completing work, update `/docs/progress.md` with a dated summary.
6. If tests were run, record results in `/docs/progress.md`.
7. Tick completed items (`- [x]`) in `/docs/plan.md`.

---

## Documentation Format

### 1. PROGRESS.md

```markdown
## [DD/MM/YY] - Implemented Task Name

- Brief description of change.
```

### 2. PLAN.md

```markdown
## TODO Tasks

### n. Refinement/Testing/Bug/Feature: Task Name

**Purpose/Issue:** The description in brief.

**Implementation:**

- [x] Task 1
- [ ] Task 2
```

---
