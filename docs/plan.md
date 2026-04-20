# PLAN (AGENT ONLY)

> Refer to `docs/trd.md` for architecture, data models, API contracts, and code-level details.
> Refer to `docs/prd.md` for product requirements and acceptance criteria.
> Refer to `docs/roadmap.md` for the phase timeline overview.

---

## Phase 0: Scaffolding

> Covers everything from 20 Apr idea-lock through the pre-sprint handoff. Target exit: tomorrow morning the team can open the repo, run `pnpm dev`, and start on Phase 1 without untangling scaffolding.

### 1. Feature: Read and Orient

**Purpose/Issue:** Audit existing repo state, confirm `docs/project-idea.md` has real content, and surface convention conflicts (commit permission, `architecture.md` vs `trd.md`, AGENT-ONLY template) before decomposing anything.

**Implementation:**

- [x] Inventory `docs/`, `.claude/`, `src/`, `.github/` with `ls -la`.
- [x] Confirm branch is `main` and the tree is clean enough to proceed.
- [x] Read `docs/project-idea.md`, `docs/roadmap.md`, `docs/roles.md`, and the placeholder `docs/{prd,trd,plan,progress,diagrams,test}.md`.
- [x] Read `.claude/CLAUDE.md` and `.claude/settings.json`; list `.claude/skills/` contents.
- [x] Report findings and blockers to the PO before proceeding.

### 2. Feature: Decompose project-idea into PRD / TRD

**Purpose/Issue:** Turn `docs/project-idea.md` into a product contract (`docs/prd.md`), a technical contract (`docs/trd.md`), and roadmap updates that reflect the locked decisions. Apply the PO's overrides: ADK-Python v1.31 GA (not Genkit), Vertex AI Search primary with inline 1M-context as Plan B at sprint hour 12, Aisyah locked as Form B filer, stateless architecture (no DB / no GCS / no Firestore in v1), and a hard feature freeze at hour 20/24.

**Implementation:**

- [x] Write `docs/prd.md` (problem, aim, persona, FR-1…FR-10 with falsifiable acceptance criteria, NFRs, scope, emergency de-scope plan, disclaimers).
- [x] Write `docs/trd.md` (architecture overview, ASCII diagrams, component table, 10-step data flow, handbook stack alignment, external dependencies, security, Plan B, open questions).
- [x] Patch `docs/roadmap.md` (project name, Phase 0 milestone `architecture.md` → `trd.md`, decision log, non-goals).
- [x] Tick `docs/plan.md` items and append a dated summary to `docs/progress.md`.
- [x] Commit `docs: decompose project-idea into prd, trd, and roadmap updates`.

### 3. Feature: Initialize `.claude/` for shared agentic coding

**Purpose/Issue:** Fill `.claude/CLAUDE.md` with project-specific conventions (one-liner, tech stack snapshot, working conventions including agent-commit permission, re-read discipline) and inventory `.claude/skills/` to surface duplicates and gaps. No new skills are created in this task — gaps are reported only.

**Implementation:**

- [x] Update `.claude/CLAUDE.md` with project one-liner, current-phase reference, tech-stack snapshot, working conventions, critical do-nots, and re-read discipline.
- [x] Add the agent-commit permission note under working conventions, per PO override.
- [x] Inventory every `.claude/skills/<skill>/SKILL.md` with a one-line summary; flag duplicates for human review.
- [x] Report gaps for this project (Next.js + shadcn scaffolding, Cloud Run deploy, Gemini API calling conventions, PDF generation). Do not create skills.
- [x] Confirm `.claude/` is tracked in git; if `.gitignore` excludes it, remove the exclusion.
- [x] Commit `chore(claude): initialize project-specific CLAUDE.md and inventory skills`.

### 4. Feature: Scaffold Next.js frontend tooling

**Purpose/Issue:** Bring the repo to a state where the team can start building UI tomorrow morning — Next.js 16 + React 19 + Tailwind 4 + shadcn/ui + Lucide + Husky + Prettier, with WSL-friendly webpack HMR polling and a stub landing page. Do not touch backend; no AI wiring; no Cloud Run deploy.

**Implementation:**

- [x] Verify `pnpm` (10.33.0), `node` (v24.14.0), and `git` (2.43.0) versions.
- [x] Scaffold Next.js 16 App Router (TypeScript, Tailwind 4, ESLint 9, `src/` dir, `@/*` alias, `--no-turbopack`, pnpm) into a temp dir and merge into repo root, preserving `docs/`, `.claude/`, `.git/`, `README.md`, and existing configs.
- [x] Initialize shadcn/ui (Tailwind 4 auto-detected; `base-nova` default preset, CSS variables in `src/app/globals.css`) and add 12 components: alert, badge, button, card, dialog, input, label, progress, separator, sonner, tabs, textarea. (`toast` is deprecated in favour of `sonner`; `form` wrapper did not land — react-hook-form + zod installed for manual composition.)
- [x] Install `lucide-react`.
- [x] Install Husky + lint-staged; write `.husky/pre-commit` → `pnpm lint-staged`; add `lint-staged` block to `package.json` (ESLint `--fix` on ts/tsx/js/jsx; Prettier `--write` on md/json/css).
- [x] Install Prettier + `prettier-plugin-tailwindcss` (Prettier was already present).
- [x] Configure WSL webpack HMR polling in `next.config.ts` (poll=800ms, aggregateTimeout=300ms, ignore `node_modules`); force `--webpack` in dev/build scripts since Next.js 16 defaults to Turbopack.
- [x] Confirm existing `.gitignore` already covers `.env`, `.env.local`, `.next/`, `node_modules/`, `dist/`, `*.log`, `.DS_Store`, `coverage/` — no edit needed; `.claude/` remains tracked.
- [x] Create `.env.example` at repo root with `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `VERTEX_AI_SEARCH_DATA_STORE` placeholders.
- [x] Create stub landing page at `src/app/page.tsx` (single "Layak" card + disabled Lucide `Play` icon "Start" button, 27 lines).
- [x] Run `pnpm lint` (clean) and `pnpm build --webpack` (clean — two routes `/` and `/_not-found` prerendered static).
- [x] Commit `chore(frontend): scaffold Next.js + Tailwind + shadcn + Husky + Lucide` with lockfile.

### 5. Feature: Push and handoff

**Purpose/Issue:** Push all scaffolding commits to `origin/main` and produce the handoff report the team can pick up from tomorrow morning. No further code changes after this task.

**Implementation:**

- [x] `git push origin main`.
- [x] Produce the report: docs changes, `.claude/` changes, frontend changes, versions (`pnpm`, `node`, `next`), skills inventory + flagged gaps, warnings encountered, tomorrow's first task under roadmap Phase 1, and decisions still blocked on the PO (backend stack, GCP project ID, Vertex AI Search data store, Cloud Run region).

### 6. Refinement: Refactor into frontend/ + backend/ workspace layout

**Purpose/Issue:** Post-kickoff PO-requested refactor for clean monorepo structure. The flat Next.js-at-root layout conflated frontend framework concerns with repo-wide tooling and made it unclear where the Phase 1 Python backend should land. Move the scaffolded Next.js app into `frontend/` as a pnpm workspace package, create the `backend/` skeleton with the layout locked in `docs/trd.md` §3 and §6, consolidate Husky / Prettier / lint-staged at the root as a thin orchestrator, delete the redundant root `CLAUDE.md` the Next.js scaffold shipped, and move `AGENTS.md` into `frontend/` so its Next.js 16 warning is properly scoped.

**Implementation:**

- [x] Create `frontend/` dir; `git mv` all Next.js files into it (`src/`, `public/`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `AGENTS.md`, `.env.example`).
- [x] Delete redundant root `CLAUDE.md` (1-line pointer to `AGENTS.md` shipped by the Next.js scaffold); the real project instructions stay in `.claude/CLAUDE.md`.
- [x] Create `backend/` skeleton: `data/schemes/.gitkeep`, `scripts/.gitkeep`, `README.md` that pins the Phase 1 layout from `docs/trd.md`.
- [x] Split `package.json`: root keeps husky + lint-staged + prettier + prettier-plugin-tailwindcss + concurrently; `frontend/package.json` keeps Next.js deps, renamed to `layak-frontend`.
- [x] Create root `pnpm-workspace.yaml` listing `frontend` as the single workspace package; move `ignoredBuiltDependencies` (sharp, unrs-resolver) here and delete the scaffold's nested `frontend/pnpm-workspace.yaml`.
- [x] Delete root `pnpm-lock.yaml` and `node_modules/`; run `pnpm install` at root to regenerate a single workspace lockfile.
- [x] Update `.husky/pre-commit` to run `pnpm -C frontend lint-staged` (ESLint on frontend) followed by `pnpm lint-staged` (Prettier on root docs).
- [x] Pin workspace TypeScript in `.vscode/settings.json` (`typescript.tsdk: "frontend/node_modules/typescript/lib"` + `enablePromptUseWorkspaceTsdk: true`) so VSCode uses the pinned `typescript@5.9.3` instead of its bundled version.
- [x] Verify `pnpm run lint` and `pnpm run build` still pass via the workspace forward.
- [x] Update `docs/trd.md` §6.3 (current versions), §6.4 (repo layout), §9.4 (close the backend-layout open question) and `.claude/CLAUDE.md` (Architecture, Tech Stack paths, Commands block, Code Style paths).
- [x] Commit `refactor(infra): split into frontend/ and backend/ pnpm workspace`.

### 7. Feature: Commit scheme source PDFs

**Purpose/Issue:** The Phase 1 rule engine (task 4) and Vertex AI Search seed script (task 3) both read from the six source PDFs catalogued in `docs/trd.md` §6.1. Downloading and committing them tonight removes a dependency for tomorrow's PO1 backend work — no GCP, no backend scaffold needed. Some `gov.my` URLs bot-block automated fetches (see `docs/trd.md` §6 gotcha list); manual browser download is the documented fallback.

**Implementation:**

- [x] Download the six PDFs into `backend/data/schemes/` (committed as `risalah-str-2026.pdf`, `bk-01.pdf`, `jkm18.pdf`, `pr-no-4-2024.pdf`, `explanatory-notes-be2025.pdf`, `rf-filing-programme-for-2026.pdf`; canonical URLs in `docs/trd.md` §6.1).
- [x] Verify each file: size ≥ 1 KB, first four bytes are the `%PDF` magic header.
- [x] For any URL that returns an error page or bot-block, report it so the human can browser-download and drop the file in.
- [x] Delete `backend/data/schemes/.gitkeep` once at least one real PDF lands.
- [x] Tick these items in `docs/plan.md`; append a dated summary to `docs/progress.md`.
- [x] Commit `chore(db): commit scheme source PDFs`.

---

## Phase 1: Core Build

> Maps to `docs/roadmap.md` Phase 1 — "One critical user journey. End-to-end. On Cloud Run. No side quests." Six tasks from 08:30 to 18:00 on 21 Apr (sprint hour 0 → 10). **Feature freeze at 18:00 / sprint hour 10.** Ownership follows `docs/prd.md` §0 phase matrix; file paths below are suggestions that can be refined in-flight.

> **Before you start Phase 1 (08:00 standup checklist):**
>
> - [x] GCP project live; Vertex AI, Cloud Run, Artifact Registry, Secret Manager, Discovery Engine APIs enabled (Phase 0, PO1).
> - [x] `GEMINI_API_KEY` in GCP Secret Manager as `gemini-api-key`; also in local `.env.local` for dev (PO1).
> - [x] Six scheme PDFs present under `backend/data/schemes/` (Phase 0 task 7 — **done**, commit `9138113`).
> - [x] Both laptops can `gcloud auth login` + `pnpm run dev` successfully.

### 1. Feature: Backend data models and agent wiring

**Owner:** PO1 (Hao). **Roadmap block:** 21 Apr 08:30 → 10:30 MYT. **Depends on:** Phase 0 skeleton (`backend/`), PDFs committed (Phase 0 task 7), GCP live, `GEMINI_API_KEY` accessible locally.

**Purpose/Issue:** Stand up the minimum backend the frontend can talk to during the 12:30 wiring block — Pydantic data contract, a FastAPI SSE endpoint, an ADK `SequentialAgent` with 2 stubbed `FunctionTool`s that emit a deterministic event stream. No Vertex AI Search yet (task 3), no real rule engine (task 4), no packet generation (task 5).

**Implementation — PO1 (Hao):**

- [x] Scaffold the Python package: `backend/pyproject.toml`, `backend/app/{__init__.py,main.py}`, `backend/app/schema/`, `backend/app/agents/`. Install `fastapi`, `uvicorn`, `google-adk==1.31.*`, `google-genai`, `pydantic==2.*`, `python-multipart`.
- [x] Define Pydantic v2 models in `backend/app/schema/`: `Profile`, `SchemeMatch` (with `rule_citations[]`), `Packet`, `ProvenanceRecord`. Follow `docs/trd.md` §3. (Named `RuleCitation` to match TRD §3 field name `rule_citations`; the term `ProvenanceRecord` in the plan and `RuleCitation` in the code are aliases for the same model.)
- [x] FastAPI entry at `backend/app/main.py`: `POST /api/agent/intake` accepts three `UploadFile` params (`ic`, `payslip`, `utility`); returns an SSE stream (`starlette.responses.EventSourceResponse` or manual `text/event-stream`). (Manual `text/event-stream` via `starlette.responses.StreamingResponse`.)
- [x] ADK `SequentialAgent` in `backend/app/agents/root_agent.py` with 2 `FunctionTool`s for this task:
  - `extract_profile(ic, payslip, utility)` → returns a canned Aisyah `Profile` fixture (real Gemini wiring arrives in task 3).
  - `match_schemes(profile)` → returns 3 canned `SchemeMatch` objects (real rule engine arrives in task 4).
- [x] SSE event shape (lock this now — the frontend depends on it): `step_started {step}`, `step_result {step, data}`, `done {packet}`, `error {step, message}`. Discriminator key is `type` (e.g. `{"type":"step_started","step":"extract"}`) — documented at the top of `backend/app/schema/events.py` and `backend/app/main.py`.
- [x] Local smoke test: `curl -N -F ic=@fixtures/ic.pdf -F payslip=@fixtures/payslip.pdf -F utility=@fixtures/tnb.pdf http://localhost:8080/api/agent/intake` emits at least 4 events in under 3s and terminates cleanly. **Result: 5 events in 573 ms** (2 × `step_started` + 2 × `step_result` + 1 × `done`).
- [ ] Commit `feat(lambda): scaffold fastapi and adk sequentialagent with stub functiontools`.

**Exit criteria:** service stands up on `:8080`; smoke-test curl streams a full SSE response with stubbed data; SSE event shape documented in a one-line comment in `backend/app/main.py` so PO2 can consume it.

---

### 2. Feature: Frontend scaffolding with mock data

**Owner:** PO2 (Adam). **Roadmap block:** 21 Apr 08:30 → 12:00 MYT (can start tonight — no backend needed). **Depends on:** Phase 0 frontend scaffold (done).

**Purpose/Issue:** Build every screen the Aisyah flow needs against mock data so the UI is visually complete before the 12:30 wiring block. When task 1 is ready, integration collapses to a one-line SSE endpoint swap, not a UI debug session. Covers FR-1 through FR-10 except live extraction.

**Implementation — PO2 (Adam):**

- [x] Replace `frontend/src/app/page.tsx` stub with the real landing view (upload widget above the fold + trust copy "We store nothing. Draft only — you submit manually.").
- [x] **Upload widget (FR-2)**: `frontend/src/components/upload/upload-widget.tsx` — three separately-labelled inputs (IC, payslip, utility) with `accept="image/*,application/pdf"` and `capture="environment"` for mobile camera. Reject files > 10 MB and non-image/non-PDF MIME types inline (not via toast).
- [x] **"Use Aisyah sample documents" button (FR-10)**: loads `frontend/src/fixtures/aisyah-response.ts` and skips the upload step; renders a "DEMO MODE" banner.
- [x] **SSE consumer (shared infra)**: `frontend/src/lib/sse-client.ts` — `useAgentPipeline()` hook handles both mock replay and real `fetch` SSE streaming, parses `step_started | step_result | done | error`, exposes `{state: {phase, stepStates, profile, classification, matches, upside, packet, error}, start, reset}`.
- [x] **Pipeline stepper (FR-3/4/5 visual)**: `frontend/src/components/pipeline/pipeline-stepper.tsx` — renders the five steps with shadcn `Progress` + labels; each step lights up on `step_started`, checkmarks on `step_result`, and goes red on `error`.
- [x] **Ranked scheme list (FR-6) + "Why I qualify" (FR-9)**: `scheme-card.tsx` (shadcn `Card` with RM/year, agency badge, summary, "Why I qualify" expander carrying the justification + ProvenancePanel + agency portal link) and `ranked-list.tsx` (descending by annual RM; total annual RM banner in header; eight out-of-scope schemes from PRD §6.2 as greyed "Checking… (v2)" cards in a grid).
- [x] **Provenance panel (FR-7)**: `provenance-panel.tsx` — each rule citation renders as `rule_id → source PDF (page_ref)` in a clickable card; click opens shadcn `Dialog` with the passage text as a blockquote plus a "Open source PDF" external link. Bonus: `code-execution-panel.tsx` renders Gemini Code Execution Python + stdout as a paired `<pre>` block on the results view (advance-wires Task 3 PO2 sync point).
- [x] **Mock SSE mode**: `NEXT_PUBLIC_USE_MOCK_SSE=1` env flag replays events from `aisyah-response.ts` with staggered `setTimeout`s so the UI animation rhythm is testable without the backend.
- [ ] **Responsiveness smoke**: eyeball 375 / 768 / 1440 in Chrome DevTools. No horizontal scroll.
- [ ] Commit in 2–3 chunks: `feat(ui): add upload widget and demo-mode banner`, `feat(ui): add pipeline stepper and sse consumer hook`, `feat(ui): add results view with ranked list and provenance panel`.

**Exit criteria:** load page → click "Use Aisyah sample documents" → full 5-step pipeline plays out visually → ranked list + provenance panel + total RM render, all from mock data with no backend running; three viewports render clean.

---

### 3. Feature: Orchestration layer (5-step agent + Vertex AI Search)

**Owner:** PO1 drives; PO2 wires new SSE event labels at sync points. **Roadmap block:** 21 Apr 10:30 → 12:00 MYT + partial afternoon. **Depends on:** Task 1, Phase 0 task 7 (**six** scheme PDFs committed — all six passed verification in commit `9138113`), GCP project with Discovery Engine API enabled.

**Purpose/Issue:** Upgrade the 2-tool stub from task 1 to the full five-step pipeline, with **Vertex AI Search** grounding every rule lookup against a passage + URL from the committed PDFs. This is the agentic moment the demo sells — all five steps emit visible SSE events, performance budget < 10s total end-to-end.

**Implementation — PO1 (Hao):**

> **Path 1 (scaffolding-only, landed in commit prior to sprint start per CLAUDE.md "no Gemini/Vertex calls until sprint start" guardrail):** structural 5-tool pipeline + seed-script skeleton. `Path 2` below replaces the stubs with real Gemini calls + live Vertex AI Search indexing at sprint start.

- [x] **Vertex AI Search seed**: `backend/scripts/seed_vertex_ai_search.py` — reads the six PDFs from `backend/data/schemes/`, creates a Discovery Engine data store `layak-schemes-v1` in `asia-southeast1`, uploads + indexes all six, waits for indexing to complete. Idempotent; safe to re-run. _(Path 1: script written, dry-run works showing all 6 PDFs and canary queries; `--execute` opt-in flag gates real API calls, deferred to Path 2. `asia-southeast1` not available for Discovery Engine data stores in v1 — defaulting to `global` with a note in the script docstring; Cloud Run still lives in `asia-southeast1`.)_
- [x] **Canary query test**: `search("STR 2026 household income threshold")` returns at least one passage from `risalah-str-2026.pdf`; same for JKM and LHDN. Assert in the seed script. _(Path 1: defined in `CANARY_QUERIES` in the seed script; runs after indexing when `--execute` is passed.)_
- [x] **Expand FunctionTools from 2 to 5**: _(Path 1: all 5 present as stubs with stable wire-shape outputs. Path 2 swaps each stub for the real Gemini call.)_
  - `extract_profile` → Gemini 2.5 Flash multimodal with `Profile` as structured output. Replace the stub. _(Path 1: returns canned Aisyah fixture.)_
  - `classify_household` → Gemini 2.5 Flash → `{has_children_under_18, has_elderly_dependant, income_band}`. _(Path 1: derived directly from `Profile.household_flags` + computed per-capita + 5 human-readable notes.)_
  - `match_schemes` → for each of {STR, JKM, LHDN}, queries Vertex AI Search, then delegates to the rule engine (task 4); until task 4 lands, stub with `qualifies=True`. _(Path 1: delegates to Task 4 rule engine, sorts descending by `annual_rm`, filters non-qualifying. Vertex AI Search retrieval added in Path 2.)_
  - `compute_upside` → Gemini Code Execution (`tools: [{codeExecution: {}}]`) runs Python computing annual RM per scheme + total; emit the Python snippet + stdout as a `step_result` payload so the UI shows it on stage. _(Path 1: stub synthesises a syntactically-valid Python snippet and its stdout deterministically from the `SchemeMatch` list; `ComputeUpsideResult.python_snippet` + `.stdout` payload shape is stable.)_
  - `generate_packet` → stubbed; WeasyPrint lands in task 5. _(Path 1: returns filename-only `PacketDraft`s slugged by `profile.ic_last4` — `BK-01-STR2026-draft-4321.pdf`, `JKM18-warga-emas-draft-4321.pdf`, `LHDN-form-b-relief-summary-4321.pdf`. `blob_bytes_b64` stays `None` until Task 5.)_
- [ ] **Plan B trigger (sprint hour 12 ≈ 14:30 MYT)**: if Vertex AI Search setup isn't green or canary queries return empty by 14:30, flip to inline-PDF grounding per `docs/trd.md` §8 — drop the Search client, replace with a local `{pdf_name → pages}` lookup that Gemini 2.5 Pro reads inline (~80K tokens, well under the 200K cheap tier). ADK and the five-step pipeline stay intact. PO1 calls the trigger; both accept without re-debate.

**Implementation — PO2 (Adam), sync points:**

- [ ] When PO1 confirms `step_started: "classify"` and `"compute_upside"` events are live, extend `pipeline-stepper.tsx` labels. (The generic SSE hook from task 2 should already handle them.)
- [ ] Render Code Execution stdout (Python snippet + output) inside the `compute_upside` step-result panel in a small `<pre>` — this is the judge-trust moment.
- [ ] Render provenance passages from `match_schemes` in the panel; click-through links point at `/api/schemes/<filename>` (PO1 exposes as static route) or the public source URL from `docs/trd.md` §6.1.

- [ ] Commit (PO1): `feat(lambda): add vertex ai search seed and expand to 5 functiontools`.
- [ ] Commit (PO2): `feat(ui): render classify and compute_upside steps with code execution trace`.

**Exit criteria:** `POST /api/agent/intake` with Aisyah fixtures emits a full SSE stream (5 × `step_started` + `step_result`, one `done`); Vertex AI Search canary queries return non-empty for STR / JKM / LHDN **or** Plan B collapse was called cleanly before 14:30; Code Execution step shows a Python snippet + numeric output in the UI.

---

### 4. Feature: Rule engine (STR, JKM Warga Emas, 5 LHDN reliefs)

**Owner:** PO1 (Hao). **Roadmap block:** 21 Apr 10:30 → 12:00 MYT (parallel to task 3 if time allows). **Depends on:** Phase 0 task 7 (scheme PDFs committed).

**Purpose/Issue:** Encode the three scheme rulesets as Pydantic v2 models. Every threshold must be sourced from a cached PDF under `backend/data/schemes/` and covered by a unit test asserting the numeric value matches the PDF. This is the credibility differentiator — no judge can challenge a number on stage if every number cites its source page.

**Implementation — PO1 (Hao):**

- [x] `backend/app/rules/__init__.py` — re-exports `str_2026`, `jkm_warga_emas`, `lhdn_form_b`.
- [x] `backend/app/rules/str_2026.py` — household-with-children tier table from `risalah-str-2026.pdf`. Function: `match(profile) -> SchemeMatch`.
- [x] `backend/app/rules/jkm_warga_emas.py` — per-capita means test: `household_income / household_size ≤ food-PLI RM1,236` (DOSM 2024). Default rate RM600/month (Budget 2026); fallback copy RM500/month if the gazetted rate can't be confirmed in JKM18.
- [x] `backend/app/rules/lhdn_form_b.py` — five YA2025 reliefs per `pr-no-4-2024.pdf`: individual RM9,000; parent medical up to RM8,000; child #16a RM2,000 × 2; EPF+life #17 up to RM7,000; lifestyle #9 up to RM2,500. Reject any `ya != "ya_2025"` at import time. (Implemented as a module-level `SUPPORTED_YA = "ya_2025"` guarded by an `if`/`raise ImportError` so an edit to any other value trips at import.)
- [x] **Each rule returns** `SchemeMatch.rule_citations[]` as `{rule_id, source_pdf, page_ref, passage_anchor}` — the frontend provenance panel consumes this verbatim. (Field is `passage` on `RuleCitation`, aligned with `docs/trd.md §3`; `passage_anchor` and `passage` are the same concept under different names in plan.md vs trd.md.)
- [x] **Unit tests** in `backend/tests/`:
  - `test_str_2026.py` — asserts every tier threshold and child-count multiplier matches the PDF; Aisyah profile lands in the expected band.
  - `test_jkm_warga_emas.py` — Aisyah's father (age 70, household RM2,800 / 4 members = RM700/capita) qualifies.
  - `test_lhdn_form_b.py` — each relief returns its gazetted cap; Aisyah (two children + gig income + parent in household) triggers all five.
- [x] Run `pytest -q` from `backend/`; ensure green. **Result: 34 passed in 2.75 s**, grew to **39 passed in 2.71 s** after audit follow-up (`5b072b8`, `956065b`).
- [x] Commit `feat(lambda): encode str jkm lhdn rule engine with unit tests` (commit `5b072b8`, followed by audit-fix commit `956065b`).

**Exit criteria:** all three modules expose `match(profile) -> SchemeMatch` with populated `rule_citations`; `pytest` green; Aisyah's combined matches sum to ≥ RM7,000/year (PRD headline sanity target); `match_schemes` FunctionTool from task 3 delegates here instead of stubs.

_All four exit-criteria items met: Aisyah total = **RM8,208/year** (STR RM450 + JKM Warga Emas RM7,200 + LHDN Form B RM558); `backend/app/agents/tools/match.py` now delegates to the rule engine, sorts descending by `annual_rm`, and filters non-qualifying matches out._

---

### 5. Feature: Wire frontend ↔ backend end-to-end

**Owner:** Both (Adam + Hao), paired at one machine. **Roadmap block:** 21 Apr 12:30 → 14:30 MYT. **Depends on:** Tasks 1, 2, 3, 4 all landed and local-smoke-green.

**Purpose/Issue:** Pull frontend out of mock mode onto the real backend. Every SSE event lands correctly in the UI; every provenance citation renders with a working click-through; WeasyPrint drafts download. End of block: local end-to-end happy path against the Aisyah fixtures is demo-ready.

**Implementation — Both, paired:**

- [ ] `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` in root `.env` (default value already in root `.env.example`; reaches Next.js via the `frontend/.env.local -> ../.env` symlink auto-created by `pnpm dev`).
- [ ] `frontend/src/lib/sse-client.ts` points at `${NEXT_PUBLIC_BACKEND_URL}/api/agent/intake`; remove the mock-mode flag (or move it behind a dev-only toggle).
- [ ] **Happy path**: upload Aisyah fixtures via the widget → five SSE events fire → ranked list + provenance + total RM render → Code Execution panel shows Python → draft packet downloads.

**Implementation — PO1 (Hao):**

- [ ] WeasyPrint packet generator in `backend/app/agents/tools/generate_packet.py` — reads three Jinja HTML templates (`backend/app/templates/bk01.html.jinja`, `jkm18.html.jinja`, `lhdn.html.jinja`), renders with profile + matches, watermarks "DRAFT — NOT SUBMITTED" on every page.
- [ ] Decide delivery: `GET /api/agent/packet/{id}` returns a ZIP of the three PDFs **OR** base64-embed the packet in the final `done` SSE event (keeps the service stateless — consistent with `docs/trd.md` §6.5).
- [ ] Dockerfile / container config: install `libpango`, `libcairo`, `libgdk-pixbuf` (WeasyPrint system deps).

**Implementation — PO2 (Adam):**

- [ ] `frontend/src/components/results/packet-download.tsx` — download button appears after `done`; click triggers ZIP save or renders three separate PDF links.
- [ ] **Error surface**: on `error` SSE event, show a recovery card with "Use sample documents" button (FR-3 AC) — avoid a dead-end.
- [ ] Mobile polish pass on the upload widget (375px — consider a stepper if three side-by-side inputs feel cramped).

- [ ] Commit (paired): `feat(ui): wire real sse stream and packet download to backend`.

**Exit criteria:** live happy path runs against Aisyah fixtures in under 10 seconds locally (warm); three draft PDFs download and are visibly watermarked; no hardcoded secrets; no console errors on the happy path.

---

### 6. Feature: Cloud Run deploy, responsiveness, and demo rehearsal

**Owner:** PO1 deploys; PO2 owns responsiveness; Both rehearse. **Roadmap block:** 21 Apr 14:30 → 17:30 MYT. **🔒 Feature freeze at 18:00.** **Depends on:** Task 5 (e2e happy path green locally), GCP live with required APIs, `gemini-api-key` in Secret Manager.

**Purpose/Issue:** Put the live URL in front of a stranger browser. Cloud Run deploy is a Project 2030 submission requirement (handbook). Every minute past 16:00 eats rehearsal time; every minute past 17:30 risks feature-freeze slip.

**Implementation — PO1 (Hao), deploy:**

- [ ] Confirm APIs enabled on the GCP project: Cloud Run, Artifact Registry, Discovery Engine, Secret Manager, Vertex AI.
- [ ] Push `gemini-api-key` to Secret Manager; grant `roles/secretmanager.secretAccessor` to the Cloud Run runtime service account.
- [ ] **Backend deploy** (from `backend/`): `adk deploy cloud_run --with_ui --region asia-southeast1 --min-instances 1 --cpu-boost --set-secrets GEMINI_API_KEY=gemini-api-key:latest`.
- [ ] **Frontend deploy** (from `frontend/`): `gcloud run deploy layak-frontend --source . --region asia-southeast1 --min-instances 1 --cpu-boost --allow-unauthenticated --set-env-vars NEXT_PUBLIC_API_URL=<backend-url>`.
- [ ] **Post-deploy incognito check**: happy path runs against production from a fresh tab.
- [ ] Backend hardening (second pass): structured 4xx/5xx error responses; request-scoped logging with **no PII** (no IC, no name, no document bytes); CORS pinned to the frontend origin; rate-limit on `/api/agent/intake`.

**Implementation — PO2 (Adam), responsiveness + polish:**

- [ ] Responsiveness pass at **375 / 768 / 1440** (Chrome DevTools device toolbar). Upload widget, stepper, results view, provenance panel, download CTA — no horizontal scroll, no clipped text.
- [ ] Accessibility smoke: tab-through reaches every interactive element; screen-reader labels on the three file inputs; alt text on icons; WCAG 2.1 AA colour contrast on body copy.
- [ ] Copy polish: plain-English explanations in `scheme-card.tsx` expanders — no legalese, no "pursuant to."

**Implementation — Both, rehearsal:**

- [ ] Three clean back-to-back 90-second demo rehearsals from the live URL. Keep `--min-instances=1` active through the rehearsal window.
- [ ] Note any flake; if non-critical, log for Phase 2 polish. If it kills the demo, fix it before 17:30.
- [ ] Set a reminder to curl the frontend URL one hour before the actual demo slot to pre-warm.

- [ ] Commit config tweaks under `chore(infra)` scope.

**Exit criteria:** frontend Cloud Run URL loads in incognito from another network; full happy path completes in < 10s (warm); three viewports clean; three back-to-back rehearsals hit the same RM-upside number and all five visible steps; **feature freeze declared at 18:00** — any work after that is bug-fix-only until code freeze at 21:00.

---

## Phase 2: Submission Package

> Maps to `docs/roadmap.md` Phase 2 — ship clean, complete artifacts. Tasks below are picked up on demo-day evening, post feature-freeze.

### 1. Feature: UI polish and README final pass

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Copy review, empty states, obvious-bug sweep.
- [ ] README final pass: features, setup, AI disclosure (names Claude Code per Rules §4.2), architecture overview with ASCII diagrams from `docs/trd.md`.

### 2. Feature: 3-minute demo video

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Script and two takes of the 90-second Aisyah flow.
- [ ] Edit, caption if time permits.
- [ ] Upload unlisted to YouTube; submission-form URL copied.

### 3. Feature: Pitch deck (≤15 slides)

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Canva deck: problem → user → solution → demo → architecture → tech → impact → business model → team.
- [ ] Export PDF; commit to repo root as `pitch.pdf`.

### 4. Feature: Final submission

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Fill and submit the Google Form against every required field (repo URL, Cloud Run URL, video URL, deck PDF, GitHub profile links, track + category).
- [ ] Verify each link in the confirmation email.
- [ ] Resubmit if anything breaks during the 23:00–23:59 buffer.

---

## Phase X: ...

---
