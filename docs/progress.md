# PROGRESS (AGENT ONLY)

> Refer to `docs/plan.md` when recording completed tasks.

---

## [20/04/26] - Phase 1 Task 2 commit 2: SSE consumer hook, pipeline stepper, Aisyah fixture

- Wrote `frontend/src/lib/agent-types.ts` — TS mirror of `backend/app/schema/*.py` Pydantic models (`Profile`, `HouseholdClassification`, `SchemeMatch`, `RuleCitation`, `Packet`, `AgentEvent` discriminated union). Field names stay snake_case to match the JSON wire format. Exported `PIPELINE_STEPS` and `STEP_LABELS` constants.
- Wrote `frontend/src/fixtures/aisyah-response.ts` — canned replay mirroring `backend/app/fixtures/aisyah.py` verbatim (STR RM1,200 + JKM RM7,200 + LHDN RM1,008 = RM9,408/yr). Adds forward-looking fixtures the backend doesn't emit yet: `AISYAH_CLASSIFICATION`, `AISYAH_UPSIDE` (Python snippet + stdout), `AISYAH_PACKET`. `AISYAH_MOCK_EVENTS` is a 11-event ordered replay totalling ~3.8 s end-to-end.
- Wrote `frontend/src/lib/sse-client.ts` — `useAgentPipeline()` hook exposing `{state, start, reset}`. `start({mode:"mock"})` replays the fixture via staggered `setTimeout`s; `start({mode:"real", files})` POSTs multipart `FormData` to `${NEXT_PUBLIC_BACKEND_URL}/api/agent/intake` and consumes the `text/event-stream` body via `ReadableStream` + manual `data: …\n\n` chunk parser. `NEXT_PUBLIC_USE_MOCK_SSE=1` env flag forces mock for all real submissions. `AbortController` + `setTimeout` handles cleaned up on unmount or `reset()`. Reducer (`applyEvent`) is split out so the same logic drives both paths.
- Wrote `frontend/src/components/pipeline/pipeline-stepper.tsx` — shadcn `Progress` bar (percent complete) over an `<ol>` of five labelled rows. Each row carries a status icon (spinner / check / red alert / empty circle) and a textual state label. Active row picks up a `primary/5` tint, errored row a `destructive/5` tint. `aria-current="step"` on the active row for assistive tech.
- Rewrote `frontend/src/components/home/home-client.tsx` — derives display phase from `state.phase` (eliminates a `set-state-in-effect` ESLint error from the first pass). Submit + demo-mode handlers both call `start(...)`; `handleReset` clears fixture state and returns to landing. Results phase renders a placeholder with the total RM upside (real ranked list + provenance panel land in commit 3).
- `pnpm run lint` clean (after one correction). `pnpm run build` clean — 4.5 s compile, two routes prerendered static.
- Deferred to commit 3: `ranked-list.tsx`, `scheme-card.tsx`, `provenance-panel.tsx`, "Why I qualify" expander (FR-9), click-through source PDFs dialog (FR-7), out-of-scope "Checking… (v2)" cards (PRD §6.2).

---

## [20/04/26] - Phase 1 Task 2 commit 1: landing view, upload widget, demo-mode banner

- Flipped root `.env.example` `NEXT_PUBLIC_BACKEND_URL` from `:8000` to `:8080` to match `backend/app/main.py:13` (uvicorn `--port 8080`) and Cloud Run's default `PORT=8080`. Frontend branch only; backend untouched.
- Wrote `frontend/src/components/upload/upload-widget.tsx` — three separately-labelled file inputs (IC, payslip, utility) with `accept="image/*,application/pdf"`, mobile `capture="environment"`, controlled per-slot state, per-slot clear button, inline validation (`aria-invalid` + linked `aria-describedby`) rejecting files > 10 MB and non-image/non-PDF MIME types. "Continue" button disabled until all three slots are valid; "Use Aisyah sample documents" button sits adjacent (responsive row on sm+). Covers FR-2.
- Wrote `frontend/src/components/home/demo-mode-banner.tsx` — shadcn `Alert` in amber with `Sparkles` icon and copy "Running against Aisyah — a synthetic Grab driver …". Light + dark mode palette.
- Wrote `frontend/src/components/home/home-client.tsx` — `'use client'` orchestrator holding a three-phase state (`landing` | `processing` | `results`) and `isDemoMode` flag. Submit + "Use Aisyah" handlers both flip phase to `processing`; banner surfaces only in demo mode. Real SSE trigger + fixture replay land in Task 2 commit 2.
- Replaced `frontend/src/app/page.tsx` stub with a server component wrapping `HomeClient` inside shadcn `Card` + `CardContent`; copy references the extract → classify → match → rank → generate pipeline and the DRAFT invariant.
- `pnpm run lint` clean. `pnpm run build` clean — compiled in 8.5 s, two routes prerendered (`/`, `/_not-found`).
- Deferred to commit 2: `frontend/src/fixtures/aisyah-response.ts`, SSE consumer hook (`sse-client.ts`), pipeline stepper. Deferred to commit 3: ranked-list + scheme-card + provenance panel.

---

## [20/04/26] - Scaffolded backend: Pydantic schemas, FastAPI SSE endpoint, ADK SequentialAgent with 2 stub FunctionTools

- Installed Python 3.12.8 user-scope at `C:\Users\User\AppData\Local\Programs\Python\Python312` (TRD §6.3 pins 3.12; only 3.10 was present locally). Backend venv at `backend/.venv/`, gitignored via the existing `.venv/` rule (`.gitignore` line 133).
- Declared deps in `backend/pyproject.toml`: `fastapi>=0.115`, `uvicorn[standard]>=0.30`, `pydantic>=2.7`, `python-multipart>=0.0.9`, `google-adk>=1.31,<1.32`, `google-genai>=1.0`. Optional `dev` extras: `pytest`, `pytest-asyncio`, `httpx`, `ruff`. Installed versions landed at `google-adk 1.31.0`, `google-genai 1.73.1`, `fastapi 0.136.0`, `pydantic 2.13.2`, `uvicorn 0.44.0`.
- Wrote Pydantic v2 schemas under `backend/app/schema/`: `profile.py` (`Profile`, `Dependant`, `HouseholdFlags`, `HouseholdClassification`, `FormType`, `IncomeBand`, `Relationship`), `scheme.py` (`SchemeMatch`, `RuleCitation`, `SchemeId`), `packet.py` (`Packet`, `PacketDraft`), `events.py` (`StepStartedEvent`, `StepResultEvent`, `DoneEvent`, `ErrorEvent`, `ExtractResult`, `ClassifyResult`, `MatchResult`, `ComputeUpsideResult`, `GenerateResult`, discriminated `AgentEvent`). Every model uses `ConfigDict(extra="forbid")`. Privacy invariant enforced at the schema level — `Profile.ic_last4` is `Field(pattern=r"^\d{4}$")`, the only IC representation that may leave request-scope memory (NFR-3).
- Locked SSE wire shape with `type` discriminator: `{"type":"step_started","step":...}`, `{"type":"step_result","step":...,"data":...}`, `{"type":"done","packet":...}`, `{"type":"error","step":...,"message":...}`. Documented at the top of `backend/app/schema/events.py` and `backend/app/main.py` so PO2's frontend SSE consumer reads the exact format.
- Wrote the two stub FunctionTools under `backend/app/agents/tools/`: `extract.py` (`extract_profile(ic_bytes, payslip_bytes, utility_bytes) -> Profile`) and `match.py` (`match_schemes(profile) -> list[SchemeMatch]`). Both return the canned Aisyah fixture regardless of input. Real Gemini 2.5 Flash wiring lands in Phase 1 Task 3; real rule engine lands in Task 4.
- Wrote canned fixture at `backend/app/fixtures/aisyah.py` — `AISYAH_PROFILE` (Form B filer, RM2,800/mo, 2 children under 18, father age 70) and `AISYAH_SCHEME_MATCHES` (STR 2026 RM1,200, JKM Warga Emas RM7,200, LHDN Form B five-relief tax delta RM1,008 → total RM9,408/yr, clears plan.md Task 4 headline ≥RM7,000/yr). Every `SchemeMatch` carries ≥1 `RuleCitation` pointing at one of the six committed PDFs under `backend/data/schemes/`.
- Wrote `backend/app/agents/root_agent.py`: 2 `FunctionTool` instances wrapping the stubs, a `SequentialAgent` shell (`layak_root_agent`) with 2 placeholder `LlmAgent` sub-agents (no `model` set — structural stand-ins for Task 3's Gemini-backed replacements), and `stream_agent_events()` — a direct async orchestrator that bypasses `SequentialAgent.run_async()` and yields ordered SSE events from the stubs. Task 3 swaps this for the real ADK runner.
- Wrote `backend/app/main.py` with `POST /api/agent/intake` (multipart `ic` + `payslip` + `utility`) streaming SSE via `StreamingResponse` with `Cache-Control: no-cache`, `X-Accel-Buffering: no`. CORS pinned to `http://localhost:3000` for dev wiring against the frontend Next.js origin. Also added `GET /healthz`.
- Used `Annotated[UploadFile, File()]` instead of default-arg `File(...)` to satisfy `ruff B008` while keeping FastAPI's multipart detection.
- **Ruff: `check` clean, `format --check` clean** across the 14 app files.
- **Smoke test passed: 5 SSE events in 573 ms** (target ≥4 events in <3 s). Sequence: `step_started(extract)` → `step_result(extract, profile=Aisyah)` → `step_started(match)` → `step_result(match, 3 SchemeMatch)` → `done(empty Packet)`. Endpoint closes cleanly.
- Deferred to matching tasks: `classify_household`, `compute_upside`, `generate_packet` tools (Task 3 / 5); `app/rules/` module (Task 4); WeasyPrint deps (Task 5); Dockerfile + Cloud Run deploy (Task 6).

---

## [20/04/26] - Added indexed tables of contents to PRD and TRD

- Added linked tables of contents to `docs/prd.md` and `docs/trd.md` so the section structure is easier to scan and jump between.
- Kept the existing content unchanged; this was a navigation-only docs update.

---

## [20/04/26] - Committed scheme source PDFs

- Downloaded 6 of 6 PDFs into `backend/data/schemes/` (committed via `9138113` with scaffold filenames; renamed to lowercase kebab-case in a follow-up commit): `risalah-str-2026.pdf` (533 KB), `bk-01.pdf` (418 KB), `jkm18.pdf` (1.1 MB), `pr-no-4-2024.pdf` (524 KB), `explanatory-notes-be2025.pdf` (846 KB), `rf-filing-programme-for-2026.pdf` (557 KB).
- Each verified: size ≥ 1 KB, `%PDF` magic header confirmed on all six files.
- Removed placeholder `backend/data/schemes/.gitkeep`.
- No URLs failed; all six `gov.my` / `hasil.gov.my` / `jkm.gov.my` endpoints responded HTTP 200 without bot-blocking.

---

## [20/04/26] - Refactored into frontend/ + backend/ pnpm workspace

- Moved the Next.js scaffold from repo root into `frontend/` as a pnpm workspace package `layak-frontend`. Preserved git rename history via `git mv`. Files moved: `src/`, `public/`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `AGENTS.md`, `.env.example`, `next-env.d.ts`.
- Created `backend/` skeleton with `data/schemes/.gitkeep`, `scripts/.gitkeep`, and a `README.md` pinning the Phase 1 layout from `docs/trd.md` (FastAPI + ADK-Python + WeasyPrint, stateless, repo-is-the-bucket).
- Split `package.json`: root is now a thin workspace orchestrator (husky, lint-staged, prettier, prettier-plugin-tailwindcss, concurrently); `frontend/package.json` keeps all Next.js / React / Tailwind / shadcn deps. Root scripts forward via `pnpm -C frontend <cmd>` for dev, build, start, lint.
- Created root `pnpm-workspace.yaml` listing `frontend` as the workspace package; moved `ignoredBuiltDependencies` (sharp, unrs-resolver) here and deleted the scaffold-shipped nested `frontend/pnpm-workspace.yaml`.
- Deleted root `pnpm-lock.yaml` + `node_modules/`; reran `pnpm install` at root to regenerate a single workspace lockfile.
- Deleted the root `CLAUDE.md` shipped by the Next.js scaffold (1-liner `@AGENTS.md`) — redundant with `.claude/CLAUDE.md`. `AGENTS.md` moved into `frontend/` where its Next.js 16 warning is properly scoped.
- Updated `.husky/pre-commit` to run `pnpm -C frontend lint-staged` (ESLint on frontend ts/tsx) followed by `pnpm lint-staged` (Prettier on root docs).
- Verified `pnpm run lint` and `pnpm run build` still pass via the workspace forward. Noted that the bare `pnpm lint` hits a pnpm v10 workspace shortcut that bypasses our script — canonical invocation is `pnpm run lint`.
- Updated `docs/trd.md` §6.3 (current versions), §6.4 (repo layout diagram), §9.4 (closed the backend-layout open question); updated `.claude/CLAUDE.md` Architecture, Tech Stack paths, Commands block, Code Style paths.
- Pinned workspace TypeScript in `.vscode/settings.json` (`typescript.tsdk: "frontend/node_modules/typescript/lib"`, `enablePromptUseWorkspaceTsdk: true`) so VSCode users see the workspace's `typescript@5.9.3` instead of the editor's bundled version. First time VSCode opens a `.ts` file it prompts to switch — accept once.

---

## [20/04/26] - Scaffolded Next.js 16 frontend tooling

- Scaffolded Next.js 16.2.4 + React 19.2.4 + Tailwind 4.2.2 + ESLint 9 flat config into the repo via a temp-dir merge (preserved `docs/`, `.claude/`, `.git/`, existing `.prettierrc`/`.prettierignore`/`README.md`). Renamed package to `layak`; dropped legacy `.eslintrc.cjs` and `src/.gitkeep`.
- Installed `lucide-react`, Husky (9.1.7) with pre-commit `pnpm lint-staged`, lint-staged (16.4.0), `prettier-plugin-tailwindcss`, and scaffold defaults.
- Ran `pnpm dlx shadcn@latest init -d` (Tailwind 4 auto-detected, `base-nova` preset) and added 12 shadcn components: alert, badge, button, card, dialog, input, label, progress, separator, sonner, tabs, textarea. `toast` is deprecated in favour of `sonner`; `form` wrapper component did not land under the base-nova preset — react-hook-form + @hookform/resolvers + zod installed for manual composition.
- Configured webpack HMR polling in `next.config.ts` (poll=800ms, aggregateTimeout=300ms, ignore `node_modules`); forced `--webpack` in dev/build scripts so WSL polling runs. Next.js 16 defaults to Turbopack; we keep Turbopack as a one-flag-flip option if polling becomes unnecessary.
- Added `.env.example` with `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `VERTEX_AI_SEARCH_DATA_STORE` placeholders. Existing `.gitignore` already covers `.env`/`.next/`/`node_modules/`/etc. and keeps `.claude/` tracked.
- Replaced scaffold default `src/app/page.tsx` with a 27-line Layak stub (shadcn Card + disabled Lucide Play-icon button). Updated `layout.tsx` metadata title/description.
- `pnpm lint` clean. `pnpm build --webpack` clean — two routes prerendered static (`/`, `/_not-found`).
- Updated `docs/prd.md`, `docs/trd.md`, and `.claude/CLAUDE.md` to reflect the Next.js 16 / React 19 / Tailwind 4 / ESLint 9 stack bump (kickoff `@latest` delivered newer than the PRD's "Next.js 14" note — PO confirmed "use latest release").

---

## [20/04/26] - Initialized project-specific .claude/CLAUDE.md and inventoried skills

- Filled `.claude/CLAUDE.md` Project, Current Phase, Architecture (points to trd.md), Tech Stack (frontend locked, backend pending, infra on Cloud Run), Commands, and Code Style sections.
- Added new Working Conventions section including the PO-dictated agent-commit permission line; Critical Do-Nots (no Genkit-Python, no architecture.md, no persistence layer, no real portal submission, no real MyKad); Re-Read Discipline (session-start reading order).
- Preserved Git Commit Convention, Agent Reminder Rule, Agent Workflow Protocol, and Documentation Format verbatim.
- Inventoried 7 skills under `.claude/skills/` (brainstorming, frontend-slides, gemini-document-scanner, humanizer, project-scaffolding, web-testing, writing-plans). Flagged 6 project-specific skill gaps (Next.js+shadcn scaffold, Cloud Run deploy, ADK-Python, Gemini API conventions, WeasyPrint, Vertex AI Search) for human review — no skills created.
- Restructured `docs/plan.md` into Phase 0 (scaffolding, 5 tasks) / Phase 1 (core build, 6 tasks) / Phase 2 (submission, 4 tasks).

---

## [20/04/26] - Decomposed project-idea into prd.md and trd.md

- Populated `docs/prd.md` with problem statement, aim + objectives, Aisyah persona (Form B filer, locked), ten functional requirements (FR-1 through FR-10) with falsifiable acceptance criteria, six non-functional requirements, scope boundaries, emergency de-scope plan (hour 20/24 feature freeze), and disclaimers.
- Populated `docs/trd.md` with architecture overview, two ASCII diagrams (system topology + agent tool-call flow), component responsibility table, ten-step data flow narrative, Google AI ecosystem integration with handbook-stack-alignment subsection, external dependencies (cached scheme PDFs at `backend/data/schemes/`, seed script at `backend/scripts/seed_vertex_ai_search.py`, no DB / no GCS in v1), security & secrets, Plan B (Vertex AI Search → inline 1M-context grounding at sprint hour 12), and open questions (handbook orchestrator mismatch, GCP infra pins, JKM rate fallback).
- Patched `docs/roadmap.md`: project name Layak, Phase 0 milestone table now references `docs/trd.md` instead of `docs/architecture.md`, added decision log and non-goals sections at end of file.
- Ticked Phase 0 task 1 items 1 and 2 in `docs/plan.md`.

---
