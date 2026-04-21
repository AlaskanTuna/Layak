# PLAN (AGENT ONLY)

> Refer to `docs/trd.md` for architecture, data models, API contracts, and code-level details.
> Refer to `docs/prd.md` for product requirements and acceptance criteria.
> Refer to `docs/roadmap.md` for the phase timeline overview.

---

## Phase 0: Scaffolding

> Covers the initial setup and handoff before Phase 1. Keep the repo simple enough that the team can open it, run `pnpm dev`, and start building without untangling scaffolding.

### 1. Feature: Read and Orient

**Purpose/Issue:** Audit existing repo state, confirm `docs/project-idea.md` has real content, and surface convention conflicts (commit permission, `architecture.md` vs `trd.md`, AGENT-ONLY template) before decomposing anything.

**Implementation:**

- [x] Inventory `docs/`, `.claude/`, `src/`, `.github/` with `ls -la`.
- [x] Confirm branch is `main` and the tree is clean enough to proceed.
- [x] Read `docs/project-idea.md`, `docs/roadmap.md`, `docs/roles.md`, and the placeholder `docs/{prd,trd,plan,progress,diagrams,test}.md`.
- [x] Read `.claude/CLAUDE.md` and `.claude/settings.json`; list `.claude/skills/` contents.
- [x] Report findings and blockers to the PO before proceeding.

### 2. Feature: Decompose project-idea into PRD / TRD

**Purpose/Issue:** Turn `docs/project-idea.md` into a product contract (`docs/prd.md`), a technical contract (`docs/trd.md`), and roadmap updates that reflect the locked decisions. Apply the PO's overrides: ADK-Python v1.31 GA (not Genkit), Vertex AI Search primary with inline 1M-context as Plan B, Aisyah locked as Form B filer, and stateless architecture (no DB / no GCS / no Firestore in v1).

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

**Purpose/Issue:** Bring the repo to a state where the team can start building UI — Next.js 16 + React 19 + Tailwind 4 + shadcn/ui + Lucide + Husky + Prettier, with WSL-friendly webpack HMR polling and a stub landing page.

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

**Purpose/Issue:** Push all scaffolding commits to `origin/main` and produce the handoff report the team can pick up from.

**Implementation:**

- [x] `git push origin main`.
- [x] Produce the report: docs changes, `.claude/` changes, frontend changes, versions (`pnpm`, `node`, `next`), skills inventory + flagged gaps, warnings encountered, next task under Phase 1, and decisions still blocked on the PO (backend stack, GCP project ID, Vertex AI Search data store, Cloud Run region).

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

**Purpose/Issue:** The Phase 1 rule engine (task 4) and Vertex AI Search seed script (task 3) both read from the six source PDFs catalogued in `docs/trd.md` §6.1. Downloading and committing them removes a dependency for PO1 backend work. Some `gov.my` URLs bot-block automated fetches (see `docs/trd.md` §6 gotcha list); manual browser download is the documented fallback.

**Implementation:**

- [x] Download the six PDFs into `backend/data/schemes/` (committed as `risalah-str-2026.pdf`, `bk-01.pdf`, `jkm18.pdf`, `pr-no-4-2024.pdf`, `explanatory-notes-be2025.pdf`, `rf-filing-programme-for-2026.pdf`; canonical URLs in `docs/trd.md` §6.1).
- [x] Verify each file: size ≥ 1 KB, first four bytes are the `%PDF` magic header.
- [x] For any URL that returns an error page or bot-block, report it so the human can browser-download and drop the file in.
- [x] Delete `backend/data/schemes/.gitkeep` once at least one real PDF lands.
- [x] Tick these items in `docs/plan.md`; append a dated summary to `docs/progress.md`.
- [x] Commit `chore(db): commit scheme source PDFs`.

---

## Phase 1: Core Build

> Maps to `docs/roadmap.md` Phase 1 — "One critical user journey. End-to-end. On Cloud Run. No side quests." Ownership follows `docs/prd.md` §0 phase matrix; file paths below are suggestions that can be refined in-flight.

> **Phase 1 readiness checklist:**
>
> - [x] GCP project live; Vertex AI, Cloud Run, Artifact Registry, Secret Manager, Discovery Engine APIs enabled (Phase 0, PO1).
> - [x] `GEMINI_API_KEY` in GCP Secret Manager as `gemini-api-key`; also in local `.env.local` for dev (PO1).
> - [x] Six scheme PDFs present under `backend/data/schemes/` (Phase 0 task 7 — **done**, commit `9138113`).
> - [x] Both laptops can `gcloud auth login` + `pnpm run dev` successfully.

### 1. Feature: Backend data models and agent wiring

**Owner:** PO1 (Hao). **Depends on:** Phase 0 skeleton (`backend/`), PDFs committed (Phase 0 task 7), GCP live, `GEMINI_API_KEY` accessible locally.

**Purpose/Issue:** Stand up the minimum backend the frontend can talk to — Pydantic data contract, a FastAPI SSE endpoint, an ADK `SequentialAgent` with 2 stubbed `FunctionTool`s that emit a deterministic event stream. No Vertex AI Search yet (task 3), no real rule engine (task 4), no packet generation (task 5).

**Implementation — PO1 (Hao):**

- [x] Scaffold the Python package: `backend/pyproject.toml`, `backend/app/{__init__.py,main.py}`, `backend/app/schema/`, `backend/app/agents/`. Install `fastapi`, `uvicorn`, `google-adk==1.31.*`, `google-genai`, `pydantic==2.*`, `python-multipart`.
- [x] Define Pydantic v2 models in `backend/app/schema/`: `Profile`, `SchemeMatch` (with `rule_citations[]`), `Packet`, `ProvenanceRecord`. Follow `docs/trd.md` §3. (Named `RuleCitation` to match TRD §3 field name `rule_citations`; the term `ProvenanceRecord` in the plan and `RuleCitation` in the code are aliases for the same model.)
- [x] FastAPI entry at `backend/app/main.py`: `POST /api/agent/intake` accepts three `UploadFile` params (`ic`, `payslip`, `utility`); returns an SSE stream (`starlette.responses.EventSourceResponse` or manual `text/event-stream`). (Manual `text/event-stream` via `starlette.responses.StreamingResponse`.)
- [x] ADK `SequentialAgent` in `backend/app/agents/root_agent.py` with 2 `FunctionTool`s for this task:
  - `extract_profile(ic, payslip, utility)` → returns a canned Aisyah `Profile` fixture (real Gemini wiring arrives in task 3).
  - `match_schemes(profile)` → returns 3 canned `SchemeMatch` objects (real rule engine arrives in task 4).
- [x] SSE event shape (lock this now — the frontend depends on it): `step_started {step}`, `step_result {step, data}`, `done {packet}`, `error {step, message}`. Discriminator key is `type` (e.g. `{"type":"step_started","step":"extract"}`) — documented at the top of `backend/app/schema/events.py` and `backend/app/main.py`.
- [x] Local smoke test: `curl -N -F ic=@fixtures/ic.pdf -F payslip=@fixtures/payslip.pdf -F utility=@fixtures/tnb.pdf http://localhost:8080/api/agent/intake` emits at least 4 events in under 3s and terminates cleanly. **Result: 5 events in 573 ms** (2 × `step_started` + 2 × `step_result` + 1 × `done`).
- [x] Commit `feat(lambda): scaffold fastapi and adk sequentialagent with stub functiontools` (commit `a48f77c`).

**Exit criteria:** service stands up on `:8080`; smoke-test curl streams a full SSE response with stubbed data; SSE event shape documented in a one-line comment in `backend/app/main.py` so PO2 can consume it.

---

### 2. Feature: Frontend scaffolding with mock data

**Owner:** PO2 (Adam). **Depends on:** Phase 0 frontend scaffold (done).

**Purpose/Issue:** Build every screen the Aisyah flow needs against mock data so the UI is visually complete. When task 1 is ready, integration collapses to a one-line SSE endpoint swap, not a UI debug session. Covers FR-1 through FR-10 except live extraction.

**Implementation:**

- [x] Replace `frontend/src/app/page.tsx` stub with the real landing view (upload widget above the fold + trust copy "We store nothing. Draft only — you submit manually.").
- [x] **Upload widget (FR-2)**: `frontend/src/components/upload/upload-widget.tsx` — three separately-labelled inputs (IC, payslip, utility) with `accept="image/*,application/pdf"` and `capture="environment"` for mobile camera. Reject files > 10 MB and non-image/non-PDF MIME types inline (not via toast).
- [x] **"Use Aisyah sample documents" button (FR-10)**: loads `frontend/src/fixtures/aisyah-response.ts` and skips the upload step; renders a "DEMO MODE" banner.
- [x] **SSE consumer (shared infra)**: `frontend/src/lib/sse-client.ts` — `useAgentPipeline()` hook handles both mock replay and real `fetch` SSE streaming, parses `step_started | step_result | done | error`, exposes `{state: {phase, stepStates, profile, classification, matches, upside, packet, error}, start, reset}`.
- [x] **Pipeline stepper (FR-3/4/5 visual)**: `frontend/src/components/pipeline/pipeline-stepper.tsx` — renders the five steps with shadcn `Progress` + labels; each step lights up on `step_started`, checkmarks on `step_result`, and goes red on `error`.
- [x] **Ranked scheme list (FR-6) + "Why I qualify" (FR-9)**: `scheme-card.tsx` (shadcn `Card` with RM/year, agency badge, summary, "Why I qualify" expander carrying the justification + ProvenancePanel + agency portal link) and `ranked-list.tsx` (descending by annual RM; total annual RM banner in header; eight out-of-scope schemes from PRD §6.2 as greyed "Checking… (v2)" cards in a grid).
- [x] **Provenance panel (FR-7)**: `provenance-panel.tsx` — each rule citation renders as `rule_id → source PDF (page_ref)` in a clickable card; click opens shadcn `Dialog` with the passage text as a blockquote plus a "Open source PDF" external link. Bonus: `code-execution-panel.tsx` renders Gemini Code Execution Python + stdout as a paired `<pre>` block on the results view (advance-wires Task 3 PO2 sync point).
- [x] **Mock SSE mode**: `NEXT_PUBLIC_USE_MOCK_SSE=1` env flag replays events from `aisyah-response.ts` with staggered `setTimeout`s so the UI animation rhythm is testable without the backend.
- [ ] **Responsiveness smoke**: eyeball 375 / 768 / 1440 in Chrome DevTools. No horizontal scroll. (Deferred to Task 6 responsiveness pass.)
- [x] Commit in 2–3 chunks: `feat(ui): add upload widget and demo-mode banner` (`2443838`), `feat(ui): add pipeline stepper and sse consumer hook` (`fe07710`), `feat(ui): add results view with ranked list and provenance panel` (`ef1c3f0`).

**Exit criteria:** load page → click "Use Aisyah sample documents" → full 5-step pipeline plays out visually → ranked list + provenance panel + total RM render, all from mock data with no backend running; three viewports render clean.

---

### 3. Feature: Orchestration layer (5-step agent + Vertex AI Search)

**Owner:** PO1 drives; PO2 wires new SSE event labels at sync points. **Depends on:** Task 1, Phase 0 task 7 (**six** scheme PDFs committed — all six passed verification in commit `9138113`), GCP project with Discovery Engine API enabled.

**Purpose/Issue:** Upgrade the 2-tool stub from task 1 to the full five-step pipeline, with **Vertex AI Search** grounding every rule lookup against a passage + URL from the committed PDFs. This is the agentic moment the demo sells — all five steps emit visible SSE events, performance budget < 10s total end-to-end.

**Implementation — PO1 (Hao):**

> **Path 1 (scaffolding-only, landed in commit prior to sprint start per CLAUDE.md "no Gemini/Vertex calls until sprint start" guardrail):** structural 5-tool pipeline + seed-script skeleton. `Path 2` below replaces the stubs with real Gemini calls + live Vertex AI Search indexing at sprint start.

- [x] **Vertex AI Search seed**: `backend/scripts/seed_vertex_ai_search.py` — reads the six PDFs from `backend/data/schemes/`, creates a Discovery Engine data store `layak-schemes-v1` in `asia-southeast1`, uploads + indexes all six, waits for indexing to complete. Idempotent; safe to re-run. _(Path 1: script written, dry-run works showing all 6 PDFs and canary queries; `--execute` opt-in flag gates real API calls, deferred to Path 2. `asia-southeast1` not available for Discovery Engine data stores in v1 — defaulting to `global` with a note in the script docstring; Cloud Run still lives in `asia-southeast1`.)_
- [x] **Canary query test**: `search("STR 2026 household income threshold")` returns at least one passage from `risalah-str-2026.pdf`; same for JKM and LHDN. Assert in the seed script. _(Path 1: defined in `CANARY_QUERIES` in the seed script; runs after indexing when `--execute` is passed.)_
- [x] **Expand FunctionTools from 2 to 5**: _(Path 1: all 5 present as stubs with stable wire-shape outputs. Path 2 swaps each stub for the real Gemini call.)_
  - `extract_profile` → Gemini 2.5 Flash multimodal with `Profile` as structured output. Replace the stub. _(**Path 2 ✓ real Gemini 2.5 Flash** multimodal call; documents sent as `Part.from_bytes` with magic-byte MIME detection; `response_mime_type="application/json"` + client-side `Profile.model_validate_json` — server-side `response_schema=Profile` rejected by Gemini because Pydantic's `extra="forbid"` emits `additional_properties`, so schema is conveyed via the instruction and validated client-side. `temperature=0.0` for deterministic demo reruns. Privacy invariant preserved by explicit instruction that `ic_last4` must be last 4 digits only.)_
  - `classify_household` → Gemini 2.5 Flash → `{has_children_under_18, has_elderly_dependant, income_band}`. _(**Path 2 ✓ real Gemini 2.5 Flash** structured call taking the extracted Profile JSON and returning a HouseholdClassification with per-capita RM + 3-5 plain-English notes.)_
  - `match_schemes` → for each of {STR, JKM, LHDN}, queries Vertex AI Search, then delegates to the rule engine (task 4); until task 4 lands, stub with `qualifies=True`. _(**Path 2 partial** — rule engine delegation done since Task 4. Vertex AI Search enrichment deferred as a follow-up: requires `gcloud auth application-default login` + `seed_vertex_ai_search.py --execute` run, both of which are blocked on the user completing the interactive ADC OAuth flow. Rule engine's hardcoded citations act as Plan B grounding until VAIS is live.)_
  - `compute_upside` → Gemini Code Execution (`tools: [{codeExecution: {}}]`) runs Python computing annual RM per scheme + total; emit the Python snippet + stdout as a `step_result` payload so the UI shows it on stage. _(**Path 2 ✓ real Gemini 2.5 Flash** with `Tool(code_execution=ToolCodeExecution())` enabled. `_extract_exec_parts()` walks `response.candidates[].content.parts[]` pulling `executable_code.code` and `code_execution_result.output`. **Downgraded from 2.5 Pro to 2.5 Flash** because the free-tier demo key returns `429 RESOURCE_EXHAUSTED` on Pro; Flash supports the same tool with identical payload shape and is safely under quota. `total_annual_rm` + `per_scheme_rm` computed server-side as authoritative values regardless of Gemini's script output.)_
  - `generate_packet` → stubbed; WeasyPrint lands in task 5. _(Path 1 stub retained — returns filename-only `PacketDraft`s slugged by `profile.ic_last4`. `blob_bytes_b64` stays `None` until Task 5.)_
- [ ] **Plan B trigger**: if Vertex AI Search setup isn't green or canary queries return empty, flip to inline-PDF grounding per `docs/trd.md` §8 — drop the Search client, replace with a local `{pdf_name → pages}` lookup that Gemini 2.5 Pro reads inline (~80K tokens, well under the 200K cheap tier). ADK and the five-step pipeline stay intact.

**Implementation — PO2 (Adam), sync points:**

- [x] When PO1 confirms `step_started: "classify"` and `"compute_upside"` events are live, extend `pipeline-stepper.tsx` labels. (Generic SSE hook + `PIPELINE_STEPS` / `STEP_LABELS` in `agent-types.ts` already handle all five steps — no change needed on label arrival; delivered as part of Task 2 commit `fe07710`.)
- [x] Render Code Execution stdout (Python snippet + output) inside the `compute_upside` step-result panel in a small `<pre>` — this is the judge-trust moment. (`CodeExecutionPanel.tsx` in Task 2 commit `ef1c3f0`.)
- [x] Render provenance passages from `match_schemes` in the panel; click-through links point at `/api/schemes/<filename>` (PO1 exposes as static route) or the public source URL from `docs/trd.md` §6.1. (`ProvenancePanel.tsx` in Task 2 commit `ef1c3f0` — uses `source_url` from `RuleCitation` directly; no static-route dependency.)

- [x] Commit (PO1): `feat(lambda): add vertex ai search seed and expand to 5 functiontools`.
- [x] Commit (PO2): `feat(ui): render classify and compute_upside steps with code execution trace`.

**Exit criteria:** `POST /api/agent/intake` with Aisyah fixtures emits a full SSE stream (5 × `step_started` + `step_result`, one `done`); Vertex AI Search canary queries return non-empty for STR / JKM / LHDN **or** Plan B collapse was called cleanly; Code Execution step shows a Python snippet + numeric output in the UI.

---

### 4. Feature: Rule engine (STR, JKM Warga Emas, 5 LHDN reliefs)

**Owner:** PO1 (Hao). **Depends on:** Phase 0 task 7 (scheme PDFs committed).

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

**Owner:** Both (Adam + Hao), paired at one machine. **Depends on:** Tasks 1, 2, 3, 4 all landed and local-smoke-green.

**Purpose/Issue:** Pull frontend out of mock mode onto the real backend. Every SSE event lands correctly in the UI; every provenance citation renders with a working click-through; WeasyPrint drafts download. End of block: local end-to-end happy path against the Aisyah fixtures is demo-ready.

**Implementation — Both, paired:**

- [x] `NEXT_PUBLIC_BACKEND_URL=http://localhost:8080` in root `.env` (default value already in root `.env.example`; reaches Next.js via the `frontend/.env.local -> ../.env` symlink auto-created by `pnpm dev`).
- [x] `frontend/src/lib/sse-client.ts` points at `${NEXT_PUBLIC_BACKEND_URL}/api/agent/intake`; remove the mock-mode flag (or move it behind a dev-only toggle).
- [x] **Happy path**: upload Aisyah fixtures via the widget → five SSE events fire → ranked list + provenance + total RM render → Code Execution panel shows Python → draft packet downloads.

**Implementation — PO1 (Hao):**

- [x] WeasyPrint packet generator in `backend/app/agents/tools/generate_packet.py` — reads three Jinja HTML templates (`backend/app/templates/bk01.html.jinja`, `jkm18.html.jinja`, `lhdn.html.jinja`), renders with profile + matches, watermarks "DRAFT — NOT SUBMITTED" on every page. _(Done in commit `6ff2b64`. Shared `_base.html.jinja` with `@page` + fixed watermark layer; 3 scheme-specific child templates. In-process smoke: 3 PDFs at 23-27 KB each, `%PDF-` magic, `DRAFT` + `NOT SUBMITTED` verified via pypdf text extraction, Aisyah name + IC last-4 rendered, no full-IC leak.)_
- [x] Decide delivery: base64-embed in `done` event. _(`PacketDraft.blob_bytes_b64` carried in `DoneEvent.packet` — stateless, consistent with `docs/trd.md` §6.5. No `/api/agent/packet/{id}` endpoint.)_
- [x] Dockerfile / container config: install `libpango`, `libcairo`, `libgdk-pixbuf` (WeasyPrint system deps). _(Done: `backend/Dockerfile` on `python:3.12-slim` installs pango/pangoft2/harfbuzz/cairo/gdk-pixbuf + dejavu + liberation fonts + shared-mime-info via apt. Windows dev needs GTK+ Windows runtime — documented in the module docstring.)_

**Implementation:**

- [x] `frontend/src/components/results/packet-download.tsx` — renders one row per `PacketDraft` with a `Download PDF` button; base64-decode + `Blob` + `URL.createObjectURL` download when `blob_bytes_b64` is populated, else a disabled "Pending backend" button with explanatory copy. Surfaces `drafts.length` in the header and the DRAFT-watermark invariant in the description. Replaces the ZIP-vs-links decision with "whichever the backend delivers" — works for both delivery shapes.
- [x] **Error surface**: `frontend/src/components/home/error-recovery-card.tsx` — `destructive`-tinted card rendered when `state.phase === 'error'`, showing the SSE error message plus two actions: `Try with sample documents` (triggers mock replay) and `Start over` (resets). Covers FR-3 AC.
- [x] Mobile polish pass on the upload widget (375px): no-op required — the widget already stacks the three inputs vertically on every breakpoint (`flex flex-col gap-4`), so no "side-by-side" squeeze exists. Bonus: tightened `scheme-card.tsx` header to stack vertically below `sm` (`flex-col sm:flex-row`) so the RM amount doesn't crowd long scheme names on 375px; `Badge` constrained to `w-fit`; title gets `break-words`.

- [x] Commit (paired): `feat(ui): wire real sse stream and packet download to backend`.

**Exit criteria:** live happy path runs against Aisyah fixtures in under 10 seconds locally (warm); three draft PDFs download and are visibly watermarked; no hardcoded secrets; no console errors on the happy path.

---

### 6. Feature: Cloud Run deploy, frontend refinement, and demo rehearsal

**Owner:** PO1 deploys; PO2 handles frontend refinement after deployment; Both rehearse. **Depends on:** Task 5 (e2e happy path green locally), GCP live with required APIs, `gemini-api-key` in Secret Manager.

**Purpose/Issue:** Put the live URL in front of a stranger browser. Cloud Run deploy is a Project 2030 submission requirement (handbook).

**Implementation — PO1 (Hao), deploy:**

- [x] Confirm APIs enabled on the GCP project: Cloud Run, Artifact Registry, Discovery Engine, Secret Manager, Vertex AI. _(6 APIs verified enabled.)_
- [x] Push `gemini-api-key` to Secret Manager; grant `roles/secretmanager.secretAccessor` to the Cloud Run runtime service account. _(Default Compute SA `297019726346-compute@…` bound at secret scope.)_
- [x] Create `.github/workflows/cloud-run-deploy.yml` for GitHub Actions to deploy the Cloud Run services from `main`. _(Un-deferred after the 24 April deadline extension. Keyless auth via Workload Identity Federation: pool `github-actions`, OIDC provider `github` with `attribute.repository=='AlaskanTuna/myai-future-hackathon'` condition, SA `github-actions-deployer` holding `run.admin` + `cloudbuild.builds.editor` + `artifactregistry.writer` + `storage.admin` at project scope plus `iam.serviceAccountUser` narrowed to the Compute SA, and `iam.workloadIdentityUser` binding restricted to the repo principalSet. Workflow triggers on push to `main` with `backend/**` / `frontend/**` paths filter plus `workflow_dispatch` (choice input: both / backend / frontend). `dorny/paths-filter@v3` gates per-service jobs so only the changed service redeploys. Backend flags mirror current manual deploy (`--set-secrets GEMINI_API_KEY=gemini-api-key:latest`); frontend bakes `NEXT_PUBLIC_BACKEND_URL` + six `NEXT_PUBLIC_FIREBASE_\*`values via`--set-build-env-vars`— Firebase Web SDK values are public by design. Follow-up: when PO1 lands Task 2 Firebase Admin secret, extend the backend`--set-secrets`with`FIREBASE*ADMIN_KEY=firebase-admin-key:latest` in the same commit that adds the secret.)*
- [x] **Backend deploy** (from `backend/`): `gcloud run deploy layak-backend --source backend --region asia-southeast1 --min-instances 1 --cpu-boost --allow-unauthenticated --set-secrets GEMINI_API_KEY=gemini-api-key:latest --memory 1Gi --timeout 300`. Live at `https://layak-backend-297019726346.asia-southeast1.run.app`. _(Used `gcloud run deploy` over `adk deploy cloud_run` — the latter wraps a different entrypoint; direct deploy of our FastAPI+ADK image via the committed Dockerfile is more predictable.)_
- [x] **Frontend deploy** (from `frontend/`): `gcloud run deploy layak-frontend --source frontend --region asia-southeast1 --min-instances 1 --cpu-boost --allow-unauthenticated --set-build-env-vars NEXT_PUBLIC_BACKEND_URL=<backend-url>`. Live at `https://layak-frontend-297019726346.asia-southeast1.run.app`. _(Used `--set-build-env-vars` — `NEXT_PUBLIC_\*`bakes at`next build`, not runtime.)\_
- [x] **Post-deploy incognito check**: `/health` → 200 JSON; `POST /api/agent/intake` streams `step_started(extract)` then surfaces a validated error on empty-PDF input; frontend SSR renders `<title>Layak</title>`.
- [x] Backend hardening (second pass): CORS **pinned** to the two Layak frontend URLs + localhost regex (attacker `*.run.app` origins now rejected with 400); `/healthz` renamed to `/health` (Cloud Run GFE intercepts `/healthz` before it reaches the container); `.gcloudignore` excludes `.venv`/`tests/`/`scripts/` so test fixtures never ship.
- [x] Commit config tweaks under `feat(infra)` scope.

**Implementation — PO2 (Adam), frontend refinement:**

- [ ] Frontend refinement pass after deploy: responsiveness at **375 / 768 / 1440** (Chrome DevTools device toolbar), accessibility smoke, and plain-English copy polish in `scheme-card.tsx` expanders — no horizontal scroll, no clipped text, no legalese.

**Implementation — Both, rehearsal:**

- [ ] Three clean back-to-back demo rehearsals from the live URL. Keep `--min-instances=1` active during rehearsals.
- [ ] Note any flake; if non-critical, log for Phase 2 polish. If it kills the demo, fix it promptly.
- [ ] Set a reminder to curl the frontend URL before the live check.

**Exit criteria:** frontend Cloud Run URL loads in incognito from another network; full happy path completes in < 10s (warm); three viewports clean; three back-to-back rehearsals hit the same RM-upside number and all five visible steps.

---

### 7. Refinement: Width-consistency pass

**Owner:** PO2 (Adam). **Depends on:** Phase 1 task 2 landing shell and the current dashboard routes.

**Purpose/Issue:** Normalize authenticated screens under one width shell so the app reads as one product instead of a patchwork of per-page widths. The shared `(app)` layout should own the sizing contract; individual pages should stop fighting it.

**Implementation:**

- [x] Set `frontend/src/app/(app)/layout.tsx` to the shared shell: `max-w-5xl mx-auto px-4 md:px-6`. _(AppShell `main` now owns `mx-auto w-full max-w-5xl`.)_
- [x] Remove page-level width overrides from `frontend/src/app/(app)/**` so dashboard, evaluation, results, schemes, and settings all inherit the same container. _(Dropped page-level `mx-auto`/`max-w-*` wrappers from the authed pages.)_
- [x] Keep the visual rhythm consistent across `/dashboard`, `/dashboard/evaluation`, `/dashboard/evaluation/upload`, `/dashboard/evaluation/results/[id]`, `/dashboard/schemes`, and `/settings`. _(Dashboard, evaluation, schemes, and settings now inherit one shell width.)_

**Exit criteria:** every authenticated route uses the same shell width and no page introduces its own competing max-width.

### 8. Refactor: Move How It Works content to landing page

**Owner:** PO2 (Adam). **Depends on:** Phase 1 task 2 landing page and the dashboard nav/link set.

**Purpose/Issue:** Make the marketing landing self-contained by bringing the explanatory pipeline visual onto `/` and retiring the old dashboard route. Users should understand the flow before they authenticate.

**Implementation:**

- [x] Inline the How It Works pipeline visual into `frontend/src/app/page.tsx` and keep the section on the public landing. _(Inline `#how-it-works` now renders on the landing page.)_
- [x] Delete `frontend/src/app/(app)/dashboard/how-it-works/page.tsx` and any route wiring that still points at `/dashboard/how-it-works`. _(Deleted both dashboard How It Works page files and retired the route.)_
- [x] Remove stale links or breadcrumbs in `frontend/src/components/layout/sidebar.tsx` and related nav code so `/` is the only How It Works destination. _(Sidebar entry removed; header/footer now point to `/#how-it-works`, breadcrumb label dropped.)_

**Exit criteria:** the landing page shows the full How It Works content inline and `/dashboard/how-it-works` is gone.

### 9. Refinement: Remove draft-control copy from landing

**Owner:** PO2 (Adam). **Depends on:** Phase 1 task 2 landing copy.

**Purpose/Issue:** Delete the redundant trust line that says the packets are drafts and the user stays in control. The packet watermark already carries that invariant.

**Implementation:**

- [x] Remove the `"DRAFT packets only — you stay in control"` copy from `frontend/src/app/page.tsx`. _(Removed the ShieldCheck badge and duplicate draft-control sentence from `landing-hero.tsx`.)_
- [x] Check the landing CTA and nearby trust copy for any duplicate wording and trim it to the watermark invariant. _(Audited CTA/features; no duplicate draft-control copy remained.)_
- [x] Leave the packet watermark text untouched; the landing page should stop restating it. _(Backend `DRAFT — NOT SUBMITTED` watermark stayed untouched.)_

**Exit criteria:** the landing page no longer repeats the draft-control line and the invariant is implied by the packet watermark only.

---

## Phase 2: SaaS Foundation (Auth + Firestore wiring)

> Goal: signed-in user reaches `/dashboard` with a verified Firebase token; `users/{userId}` exists.

### 1. Feature: Firebase project + Firestore setup

**Owner:** PO1 (Hao). **Depends on:** Firebase project access, Firestore enabled in `asia-southeast1`, and a writable Secret Manager target for backend credentials.

**Purpose/Issue:** Lock the Firebase-backed data model before any feature work starts. The app needs a single auth provider, a known Firestore schema, and the history/rate-limit index in place so later tasks can read and write with confidence.

**Implementation — PO1 (Hao):**

- [x] Wire the Firestore contract in `firestore.rules` and `firestore.indexes.json` for `users/{userId}`, `evaluations/{evalId}`, and `waitlist/{autoId}`. _(Repo-root `firestore.rules` + `firestore.indexes.json`, glued together by `firebase.json`.)_
- [x] Define the `evaluations(userId ASC, createdAt DESC)` composite index explicitly so history queries and rate-limit counts use the same shape. _(Single composite index in `firestore.indexes.json`; `collectionGroup: evaluations`, `userId` ASC + `createdAt` DESC.)_
- [x] Record the rollout command in the runbook: `gcloud firestore indexes composite create ...` for the `evaluations` history window, then deploy rules and indexes with the repo's Firebase deploy path. _(New `docs/runbook.md` §1: preferred path `firebase deploy --only firestore:rules,firestore:indexes`; gcloud fallback for the composite index; verification via `gcloud firestore indexes composite list`.)_

**Exit criteria:** the repo has checked-in Firestore rules and index definitions for the `users`, `evaluations`, and `waitlist` collections, including the `userId + createdAt` composite index.

### 2. Feature: Backend auth middleware + Admin SDK init + security rules deploy

**Owner:** PO1 (Hao). **Depends on:** Phase 2 task 1 Firestore contract and a Firebase service account key in Secret Manager.

**Purpose/Issue:** Make every backend request prove identity. The backend should verify Firebase ID tokens, lazy-create user docs, and keep client-side writes blocked by rules while the Admin SDK handles server-side persistence.

**Implementation — PO1 (Hao):**

- [x] Add `backend/app/auth.py` with Firebase Admin initialization, `verify_id_token`, and a `current_user` dependency that injects `uid` as `request.user_id`. _(Lazy-init `firebase_admin` from `FIREBASE_ADMIN_KEY`; `verify_firebase_id_token` wraps the SDK; `current_user` parses `Authorization: Bearer`, raises 401 on missing/invalid/expired tokens and 503 when the service-account key env is missing or malformed; `request.state.user_id` is set for downstream middleware; `CurrentUser` Annotated alias exposed for routes.)_
- [x] Update `backend/app/main.py` and the dashboard route modules to require `Depends(current_user)` on authed endpoints. _(Intake now takes `user: CurrentUser` as its first parameter. Note: Starlette parses the multipart body before dep resolution runs, so a bad token still pays the upload cost — acceptable for v1 demo volume; revisit with middleware-level gating if abuse surfaces. Dashboard route modules land in Phase 3; the contract they inherit is exactly this.)_
- [x] Lazy-create `users/{userId}` on first authenticated request with `tier="free"`, `createdAt`, `lastLoginAt`, and Google profile fields. _(`_upsert_user_doc` checks `.exists` and either creates with the full spec §3.3 shape (email / displayName / photoURL / tier / createdAt / lastLoginAt / pdpaConsentAt=null) or updates only `lastLoginAt`; race between concurrent first-touches is acceptable per spec §3.5.)_
- [x] Deploy the backend with `--set-secrets=FIREBASE_ADMIN_KEY=firebase-admin-key:latest` and keep `firestore.rules` client-only access locked to the owner. _(PO2 landed on PO1's behalf. SA `layak-firebase-admin@…` created with `roles/firebaseauth.admin` + `roles/datastore.user`; JSON key minted under `umask 077`, uploaded to Secret Manager as `firebase-admin-key` v1, local copy shredded. Compute SA granted `roles/secretmanager.secretAccessor` on the new secret. Workflow `--set-secrets` line extended to `GEMINI_API_KEY=gemini-api-key:latest,FIREBASE_ADMIN_KEY=firebase-admin-key:latest`. Redeploy driven through GitHub Actions `workflow_dispatch` with `services=both` — frontend redeploys alongside so the v2 sign-in flow and the auth-enforcing backend cut over together. `firestore.rules` already deployed via `firebase deploy --only firestore:rules,firestore:indexes` during Phase 2 Task 3 infra bring-up; client writes on `users/{userId}` and `evaluations/{evalId}` stay server-only per the committed ruleset.)_

**Exit criteria:** a valid Firebase ID token reaches the backend, the user doc is created on first touch, and unauthenticated client writes remain blocked by Firestore rules.

### 3. Feature: Frontend Firebase SDK + `<AuthGuard>` + sign-in/up pages + ID-token fetch wrapper

**Owner:** PO2 (Adam). **Depends on:** Phase 2 task 1 Firestore contract and Phase 2 task 2 backend auth boundary.

**Purpose/Issue:** Give the browser a real auth client and route guard so authenticated screens can rely on a stable session. The frontend should sign in with Google, persist the ID token, and attach it to every backend call.

**Implementation — PO2 (Adam):**

- [x] Create `frontend/src/lib/firebase.ts` for `initializeApp`, `getAuth`, Google provider setup, and the fetch wrapper that injects `Authorization: Bearer <id-token>`. _(Lazy app/auth init via `getFirebaseApp` + `getFirebaseAuth`; `signInWithGoogle` uses `signInWithPopup` with `prompt: 'select_account'`; `authedFetch` attaches bearer iff `currentUser` exists and passes through otherwise so unauthed preview traffic still reaches the pre-auth backend revision.)_
- [x] Add `frontend/src/components/auth/auth-guard.tsx` and wrap `frontend/src/app/(app)/layout.tsx` so dashboard routes redirect to `/sign-in` when no Firebase session exists. _(Client-only `<AuthGuard>` renders a Loader while `onAuthStateChanged` is pending, then `router.replace('/sign-in')` for anons; route group `(app)/layout.tsx` now wraps `<AppShell>` in `<AuthGuard>`; `<AuthProvider>` mounted in root `layout.tsx` inside `ThemeProvider` so `(auth)` and `(marketing)` also see auth state for the signed-in-redirect case.)_
- [x] Implement `frontend/src/app/sign-in/page.tsx` and `frontend/src/app/sign-up/page.tsx` with the shared "Continue with Google" flow and the PDPA consent checkbox on sign-up. _(Actual paths are `(auth)/sign-in/page.tsx` and `(auth)/sign-up/page.tsx` — plan was stale from the route-group refactor. Thin re-exports point at `src/app/pages/auth/sign-{in,up}-page.tsx`, which render `SignInForm` / `SignUpForm`. Both forms: remove v1 "Continue as guest" / disabled email-password inputs, replace with Google button + multi-color G icon, redirect to `/dashboard` on success, surface error text under the button. Sign-up adds a PDPA consent checkbox gating the Google button with `Privacy` / `Terms` links; persistence of `pdpaConsentAt` deferred to Phase 5 Task 3 per the v2 SaaS pivot spec. Old "Guest" badge in `user-menu.tsx` replaced with `user.displayName` / `user.email` + real `signOut()`. `use-agent-pipeline.ts` now calls `authedFetch(...)` instead of `fetch(...)` so the bearer lands on `POST /api/agent/intake` once PO1 redeploys Task 2.)_
- [x] Add `NEXT_PUBLIC_FIREBASE_*` env plumbing in `frontend/.env.example` and the local `frontend/.env.local` flow so the client SDK boots cleanly in dev and prod. _(Repo-root `.env` / `.env.example` own the contract — `frontend/.env.local` is already a symlink to `../.env` via the `predev` hook. Populated all six `NEXT_PUBLIC_FIREBASE_\*`keys plus the future`FIREBASE*ADMIN_KEY`placeholder for PO1's backend cutover. Web App registered via`firebase apps:create WEB "Layak Web"`→ App ID`1:297019726346:web:8399534a56cf8ea5dc5df3`; config pulled via `firebase apps:sdkconfig WEB`.)*

**Exit criteria:** a signed-in browser reaches `/dashboard`, the ID token is attached to backend requests, and the frontend redirects anonymous users to the auth page.

### 4. Feature: Integration smoke test

**Owner:** Both (Adam + Hao). **Depends on:** Phase 2 tasks 1-3 landing locally and on the deployed preview.

**Purpose/Issue:** Prove the auth path works end to end before any persisted-evaluation work lands. This is the first check that the browser, backend, and Firestore are all talking to each other as one system.

**Implementation — Both:**

- [x] **Automated backend smoke** (PO1) — `docs/runbook.md` §3.1 captures four curl checks + one Firestore REST check: `/health` → 200; `/api/agent/intake_manual` without bearer → **401**; with malformed bearer → **401**; multipart `/api/agent/intake` without bearer → **401**; `users` collection is reachable via `gcloud auth print-access-token` + Firestore REST API `https://firestore.googleapis.com/v1/projects/.../documents/users` (empty `{}` on fresh project). All checks pass post-deploy.
- [x] **Auth gate re-enable + redeploy** (PO1) — removed the `PHASE-2-TASK-3-BRIDGE` block in `backend/app/main.py` and restored `user: CurrentUser` on both `/api/agent/intake` and `/api/agent/intake_manual`. Restored the `test_intake_manual_rejects_missing_auth` 401 assertion. Pushed to `main`; CI/CD (`cloud-run-deploy.yml`) auto-deployed the auth-gated backend revision. Live smoke confirms no-auth requests now return 401 (they streamed the full pipeline before the cleanup).
- [ ] **Live browser check** (Both — Adam + Hao) — five manual checkboxes captured in `docs/runbook.md` §3.3: fresh-browser sign-in → `/dashboard` renders without refresh → gcloud confirms `users/{uid}` doc populated → DevTools Network shows Bearer-authed `POST /api/agent/intake_manual` returns 200 SSE stream → sign-out redirects back to `/sign-in`. **Owns by both; tick when executed jointly pre-demo.** _(Pre-flight blocker fixed 21 Apr 2026: Cloud Run host `layak-frontend-297019726346.asia-southeast1.run.app` was not on the Firebase Authorized-domains list, so `signInWithPopup` was throwing `auth/unauthorized-domain`. Patched via Identity Toolkit Admin REST — recipe at `docs/runbook.md` §3.5. PO2 (Adam) then verified solo on incognito: sub-steps 1+2 (sign-in → `/dashboard` auto-redirect, no refresh); sub-step 3 (Firestore REST confirms `users/XpCMZJ1IHChOoVpLFvNDe2dArho2` doc with `email`, `displayName`, `photoURL`, `tier=free`, `createdAt`/`lastLoginAt`, `pdpaConsentAt=null` — `createTime` matched the intake-call second, proving `_upsert_user_doc` ran on the auth dependency); sub-step 4 via CLI proxy (curl `POST /api/agent/intake` with Bearer + 3 multipart PDFs → `HTTP/2 200 text/event-stream`; control unauthed POST → `HTTP 401`). Still owed jointly: in-browser DevTools Network confirmation against `/api/agent/intake_manual` (the new JSON intake) and sub-step 5 sign-out → `/sign-in` redirect.)_

**Exit criteria:** fresh browser → Google sign-in → `/dashboard` renders → user doc exists → authed fetch succeeds.

---

## Phase 3: Persisted Evaluations + Rate Limiting

> Goal: signed-in user runs an evaluation, it persists to Firestore, the results page lives at `/results/[id]`, free-tier caps at 5/24 h.

### 1. Feature: Backend eval persistence + list/get-by-id + packet regeneration

**Owner:** PO1 (Hao). **Depends on:** Phase 2 auth middleware and Firestore contract.

**Purpose/Issue:** Persist every evaluation in Firestore so history, deep links, and packet regeneration all work off the same source of truth. The backend should write the lifecycle once and let the UI read it back later.

**Implementation — PO1 (Hao):**

- [x] Extend `backend/app/agents/root_agent.py` so each step write lands in `evaluations/{evalId}` alongside the SSE event stream. _(Kept `stream_agent_events` narrow; factored the mirroring into a new `backend/app/services/evaluation_persistence.py` with `persist_event_stream` — wraps the event generator, forwards every event to the client, and writes the corresponding Firestore update as each event passes through. Firestore failures mid-stream are logged + swallowed so SSE never hangs.)_
- [x] Add `backend/app/routes/evaluations.py` for list, get-by-id, and `GET /api/evaluations/{id}/packet`. _(Three endpoints. `GET /api/evaluations` paginates the caller's evals newest-first via the `(userId ASC, createdAt DESC)` composite index. `GET /api/evaluations/{id}` validates the full doc through the `EvaluationDoc` model. `GET /api/evaluations/{id}/packet` regenerates the ZIP on-the-fly via `generate_packet(profile, matches)`. All three enforce owner-gating at the route layer — 404-for-other-user, not 403, to avoid leaking existence.)_
- [x] Mirror the Firestore shape in `backend/app/schema/` models for `UserDoc`, `EvaluationDoc`, and embedded step-state data. _(New `backend/app/schema/firestore.py`: `UserDoc` / `EvaluationDoc` / `StepStates` / `EvaluationError` / `EvaluationStatus` / `Tier` / `StepState` literals. `extra="forbid"` on all models. Field names use Firestore's camelCase (`userId`, `createdAt`, `totalAnnualRM`) with `# noqa: N815` suppressing ruff's naming lint — the wire shape has to match Firestore and the frontend.)_
- [x] Regenerate packets from stored profile + matches in `backend/app/agents/tools/generate_packet.py`; do not persist PDFs in Firestore or GCS. _(Persistence layer deliberately strips packet bytes from the `generate` step's Firestore update — test `test_persist_step_result_generate_does_not_store_packet_bytes` asserts this invariant. `GET /api/evaluations/{id}/packet` re-runs `generate_packet` against the stored `profile` + `matches` and zips the three draft PDFs with `ZIP_DEFLATED`; `Content-Disposition: attachment; filename="layak-packet-{id}.zip"`.)_
- [x] Wire extensions: added optional `eval_id` to `DoneEvent` + `ErrorEvent` (backend + frontend type mirror) so the UI can route to `/dashboard/evaluation/results/[id]` on done. Added public `get_firestore()` re-export in `app/auth.py` to address the Phase 3 forward-compat audit's first Gap.
- [x] Tests: 25 new cases across two files — `backend/tests/test_evaluation_persistence.py` (13 unit tests covering every event-type → Firestore update mapping, privacy sanitisation on the error path, Firestore-failure swallow) and `backend/tests/test_evaluations_routes.py` (12 cases covering list + get-by-id + packet regen, owner-gating at 404, auth wall). Updated `test_manual_entry.py`'s client fixture to mock the evaluations collection and asserted `eval_id` stamps onto the terminal `done` event. **Backend suite: 113/113 green, ruff clean.**

**Exit criteria:** one evaluation creates a Firestore doc, list/get-by-id endpoints read it back, and packet download is regenerated on demand from stored data.

### 2. Feature: Rate-limit check before SSE opens

**Owner:** PO1 (Hao). **Depends on:** Phase 2 auth middleware, Phase 3 task 1 Firestore writes, and the `evaluations(userId ASC, createdAt DESC)` index.

**Purpose/Issue:** Enforce the free-tier cap before the backend starts streaming. The quota check has to happen up front so a blocked request never consumes model time or opens an SSE connection.

**Implementation — PO1 (Hao):**

- [x] Add the preflight quota check in `backend/app/main.py` or a dedicated service layer before `/api/agent/intake` starts streaming. _(Landed as `backend/app/services/rate_limit.py::enforce_quota(db, user)` — called from both `/api/agent/intake` and `/api/agent/intake_manual` AFTER `CurrentUser` resolves but BEFORE `create_running_evaluation` writes anything. Returns `JSONResponse` 429 when capped; returns `None` when allowed and the route proceeds. Pro tier bypasses the Firestore call entirely.)_
- [x] Query `evaluations` with `userId == uid` over the rolling 24-hour window and return HTTP 429 with `X-RateLimit-Reset` when the cap is hit. _(Uses `.where("userId","==",uid).where("createdAt",">=",now-24h).count().get()` via the existing `(userId ASC, createdAt DESC)` composite index. `X-RateLimit-Reset` (unix seconds), `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` all emitted. `_extract_count` descends up to three levels so both documented Firestore SDK response shapes handle. Fail-open on Firestore errors per spec §3.6 race-condition note — quota is a UX guardrail, not a billing boundary.)_
- [x] Keep the rate-limit response shaped for the frontend waitlist modal and `QuotaMeter` reset timer. _(JSON body: `{error:"rate_limit", tier:"free", limit:5, windowHours:24, resetAt:<ISO-8601>, message}`. `resetAt` = oldest-eval-in-window `+ 24h`; falls back to `now + 24h` if the oldest-eval lookup fails. Extended `UserInfo` with `tier: str = "free"` — sourced from `users/{uid}.tier` during `_upsert_user_doc`'s existing snapshot read, no extra Firestore round-trip. Audit followup: fixed stale 403/404 docstrings in `routes/evaluations.py` — they claimed 403 but the code correctly returns 404 to avoid leaking existence.)_

**Exit criteria:** the 6th evaluation inside 24 hours returns 429 before SSE opens and includes a reset time.

**Tests:** `backend/tests/test_rate_limit.py` (10 cases) — Pro bypass (asserts no Firestore call), free under cap, free at zero, 429 body + headers shape, 429 above cap, reset-time fallback when oldest-lookup empty, reset-time fallback on Firestore exception, fail-open on count-query outage, count-shape tolerance, plus an integration test hitting `/api/agent/intake_manual` end-to-end with a mocked at-cap count asserting the route never creates the evaluations doc. Backend suite: **123/123** green; ruff clean.

### 3. Feature: Frontend 3-route split

**Owner:** PO2 (Adam). **Depends on:** Phase 2 auth guard, Phase 2 Firebase client, and Phase 3 task 1 evaluation read endpoints.

**Purpose/Issue:** Break the single dashboard flow into stable routes so summary/history, intake, and results each have their own URL and loading state. That makes deep links, refreshes, and redirects predictable.

**Implementation — PO2 (Adam):**

- [ ] Split the dashboard workflow into `frontend/src/app/(app)/dashboard/evaluation/page.tsx`, `frontend/src/app/(app)/dashboard/evaluation/upload/page.tsx`, and `frontend/src/app/(app)/dashboard/evaluation/results/[id]/page.tsx`.
- [ ] Update navigation and breadcrumbs in `frontend/src/components/layout/topbar.tsx` and related route helpers so `Results` resolves cleanly.
- [ ] Hydrate the results route from Firestore first, then fall back to live updates while `status === "running"`.

**Exit criteria:** summary, upload, and results each have their own route and refresh/deep-link behavior is stable.

### 4. Feature: `QuotaMeter` + 429 handling with waitlist modal

**Owner:** PO2 (Adam). **Depends on:** Phase 3 task 2 rate-limit responses and Phase 2 auth client.

**Purpose/Issue:** Show quota before the user hits the wall and give them a recovery path when the backend rejects a request. The UI should explain the cap, expose the reset time, and route blocked users into the waitlist flow.

**Implementation — PO2 (Adam):**

- [ ] Add `frontend/src/components/dashboard/quota-meter.tsx` to read the rolling 24-hour count and render the free/pro badge state.
- [ ] Wire 429 handling in the upload flow so the waitlist modal opens with the backend reset timestamp.
- [ ] Connect the quota state to the dashboard CTA and the `UpgradeWaitlistModal` trigger path.

**Exit criteria:** free users see live quota state, a blocked request shows the reset time, and the waitlist modal opens from the 429 path.

### 5. Feature: Real uploads with bundled Aisyah fixtures

**Owner:** PO2 (Adam). **Depends on:** Phase 3 task 3 route split and the backend intake endpoint.

**Purpose/Issue:** Stop treating the sample path as a mock-only demo. The bundled PDFs should travel through the real upload stack so Firestore history and results are populated from the same path as a normal run.

**Implementation — PO2 (Adam):**

- [ ] Move the sample PDFs into `frontend/public/fixtures/` and point the "Use Aisyah sample documents" button at the real intake flow.
- [x] Keep `NEXT_PUBLIC_USE_MOCK_SSE` as a dev-only replay toggle in `frontend/src/fixtures/aisyah-response.ts`.
- [ ] Ensure `frontend/src/components/upload/upload-widget.tsx` posts the real files through `frontend/src/lib/firebase.ts` and the backend intake endpoint.

**Exit criteria:** the sample-documents button uses the real upload path and still works when mock SSE is disabled.

### 6. Feature: Manual Entry Mode (privacy alternative to document upload)

**Owner:** PO1 (Hao). **Depends on:** Phase 1 Task 4 rule engine (stable), Phase 1 Task 5 classify/match/compute_upside/generate tools accepting a fully-populated `Profile` (stable). **Does NOT depend on** Phase 2 Task 4 or any later Phase 3/4 task — self-contained parallel track.

**Purpose/Issue:** Privacy-cautious users bounce at the "upload MyKad / payslip / TNB" step. This task adds an intake-page toggle that swaps the three upload cards for a structured form collecting the same data the OCR step would produce, weakening the privacy invariant from "we briefly touch the documents" to "we never touch them at all." Design spec: `docs/superpowers/specs/2026-04-21-manual-entry-mode-design.md`. PRD: FR-21.

**Implementation — PO1 (Hao):**

_Backend:_

- [x] Add `backend/app/schema/manual_entry.py` — a Pydantic `ManualEntryPayload` model matching §3.4 of the design spec (name, date_of_birth, ic_last4, monthly_income_rm, employment_type, address, dependants).
- [x] Add `backend/app/agents/tools/build_profile.py` with two helpers: `derive_household_flags` (income-band thresholds transcribed from `extract.py:42-47`) and `build_profile_from_manual_entry` (plus `_age_from_dob` + `_classify_income_band` module-privates). Aisyah (RM2,800 + 2 children + 1 elderly parent) returns `income_band="b40_household_with_children"`, `has_children_under_18=True`, `has_elderly_dependant=True`. Name is stripped but NOT uppercased — deviates from the design spec to match `AISYAH_PROFILE` which stores mixed-case; changing the fixture would ripple through the frontend demo UI.
- [x] Refactor `backend/app/agents/root_agent.py::stream_agent_events` to accept either `uploads` **or** `prebuilt_profile` (XOR). When `prebuilt_profile` is passed, the Gemini OCR call is skipped but the synthetic `step_started/step_result: extract` pair still fires so the frontend stepper is unchanged.
- [x] Add `POST /api/agent/intake_manual` to `backend/app/main.py` — JSON body, same SSE response format as `/api/agent/intake`, inherits `CurrentUser` so v2 auth policy applies identically.
- [x] Unit tests `backend/tests/test_manual_entry.py` — 33 tests covering: `_classify_income_band` parametrised across all six bands, `derive_household_flags` (Aisyah + edge cases at age 18 / age 59), `_age_from_dob` (pre/on/after birthday), `build_profile_from_manual_entry(aisyah_payload) == AISYAH_PROFILE` (deterministic round-trip), `match_schemes(built)` equals `AISYAH_SCHEME_MATCHES`, validation boundaries (empty name, bad IC, negative income, unknown employment type, extra fields, > 15 dependants, bad relationship enum), and SSE route integration (missing auth → 401, malformed body → 422, Aisyah payload → full 11-event stream). Full backend suite: 88/88 green; ruff clean.

_Frontend:_

- [x] Add `frontend/src/components/evaluation/intake-mode-toggle.tsx` — segmented toggle with `"upload"` (default) and `"manual"` states; `?mode=manual` query preloads the manual tab on first paint.
- [x] Add `frontend/src/components/evaluation/manual-entry-form.tsx` — react-hook-form + zod (v4) schema mirroring the backend validation rules; four sections (Identity / Income / Address / Household) with a dynamic dependants list via `useFieldArray`. Zod schema uses plain `z.number()` + RHF `valueAsNumber: true` (not `z.coerce.number()`) to sidestep a resolver-type mismatch between `@hookform/resolvers@5` and `zod@4`.
- [x] Extend `frontend/src/lib/agent-types.ts` with `ManualEntryPayload`, `DependantInput`, `EmploymentType`, and `Profile.address?: string | null` to match the (previously un-typed) backend field.
- [x] Update `frontend/src/hooks/use-agent-pipeline.ts` — extended `StartOptions` with `{ mode: 'manual'; payload: ManualEntryPayload }` and added a `startManual` path that POSTs JSON to `/api/agent/intake_manual`. Factored a shared `streamFromResponse` helper so upload and manual share the same SSE consumer + abort + error handling.
- [x] Update `frontend/src/components/evaluation/pipeline-stepper.tsx` with a `labelOverrides` prop; manual mode passes `{ extract: 'Profile prepared' }` to make the step label accurate.
- [x] Update `frontend/src/components/evaluation/evaluation-upload-client.tsx` to host the toggle, route between UploadWidget and ManualEntryForm, and pass the label overrides down. `?mode=manual` query param honoured on initial render.
- [x] Wire "Use Aisyah sample data" inside `ManualEntryForm` — resets the form to the Aisyah defaults (DOB 1992-03-24 → age 34 for any 2026 reference date after 24 Mar) and notifies the parent to flip the demo banner, matching the upload path's behaviour.
- [x] Commit — landed as a single chunk `feat(ui): add manual-entry intake mode as alternative to document upload` after the MVP rewrite; two-commit split rejected because the backend + frontend changes are tightly co-dependent (payload shape + SSE contract + type mirror).

**Sizing (actual):** ~3 hours end-to-end — schema (~15 min) + build_profile (~30 min) + stream_agent_events refactor (~15 min) + route + tests (~45 min) + frontend toggle + form + hook + wire + label (~60 min) + zod/resolver friction fix (~15 min). The "6-10h" original estimate padded polish (comprehensive 422 tests, dynamic `useFieldArray` rows, Aisyah pre-fill, stepper label override) — those were all built and still fit inside 3h because react-hook-form + zod were already on the dep list and the pipeline's `stream_agent_events` was already well-factored.

**Exit criteria:** landing page shows the toggle; typing the Aisyah values into the manual form and clicking **Generate packet** produces the same ranked-scheme list, total RM upside, and provenance citations as the upload path against the Aisyah fixture documents; no full IC number crosses the wire; all tests green; ruff clean.

---

## Phase 4: Dashboard UX (History, Stats, Settings)

> Goal: paid-feeling dashboard.

### 1. Feature: EvaluationHistoryTable + pagination + empty state

**Owner:** PO2 (Adam). **Depends on:** Phase 3 task 1 list endpoint and the Firestore history index.

**Purpose/Issue:** Give users a readable history view that scales past a single evaluation. The history list should be paginated, predictable, and useful when empty.

**Implementation — PO2 (Adam):**

- [ ] Add `frontend/src/components/history/evaluation-history-table.tsx` with 20-per-page pagination and row links to `/dashboard/evaluation/results/[id]`.
- [ ] Wire the summary page in `frontend/src/app/(app)/dashboard/evaluation/page.tsx` to the table and its empty state.
- [ ] Keep the empty state explicit: no history yet, with a CTA back to the upload route.

**Exit criteria:** the history page paginates, deep-links to results, and shows a clear empty state.

### 2. Feature: AggregateStatsCards

**Owner:** PO2 (Adam). **Depends on:** Phase 3 task 1 stored evaluations and the history query.

**Purpose/Issue:** Surface the dashboard metrics that make the product feel alive: total evaluations, total RM identified, and unique schemes qualified.

**Implementation — PO2 (Adam):**

- [ ] Add `frontend/src/components/history/aggregate-stats-cards.tsx` above the history table.
- [ ] Derive the metrics from the Firestore-backed evaluation data already returned by the history query.
- [ ] Keep the cards responsive and consistent with the dashboard shell.

**Exit criteria:** the dashboard summary shows the three aggregate stats from persisted data.

### 3. Feature: Settings page (profile, tier card, danger zone)

**Owner:** PO2 (Adam). **Depends on:** Phase 2 auth profile fields and Phase 4 task 4 PDPA endpoints.

**Purpose/Issue:** Provide a place for account metadata, tier visibility, and destructive actions. The settings screen should expose the user’s identity, tier state, and PDPA controls without mixing them into the dashboard.

**Implementation — PO2 (Adam):**

- [ ] Build `frontend/src/app/(app)/settings/page.tsx` with profile, tier, and danger-zone sections.
- [ ] Reuse `frontend/src/components/layout/user-menu.tsx` and `TierBadge` so the tier reads the same everywhere.
- [ ] Wire the export/delete actions to the backend endpoints once Phase 4 task 4 lands.

**Exit criteria:** settings shows the signed-in Google profile, tier state, and the export/delete actions.

### 4. Feature: Backend PDPA endpoints

**Owner:** PO1 (Hao). **Depends on:** Phase 2 auth boundary and Firestore persistence from Phase 3.

**Purpose/Issue:** Give users the access and deletion rights required by the PDPA posture. Export must bundle the user record and evaluation history; delete must cascade cleanly through Firestore and Firebase Auth.

**Implementation — PO1 (Hao):**

- [ ] Add `backend/app/routes/user.py` with `GET /api/user/export` and `DELETE /api/user`.
- [ ] Read `users/{userId}` plus all matching `evaluations` records and return them as a downloadable JSON attachment for export.
- [ ] Cascade-delete `evaluations`, delete `users/{userId}`, and call `firebase_admin.auth.delete_user(uid)` on account removal.

**Exit criteria:** export downloads the user bundle and delete removes the Firestore records plus the Firebase Auth account.

### 5. Feature: Waitlist Firestore collection + `UpgradeWaitlistModal`

**Owner:** PO2 (Adam). **Depends on:** Phase 2 Firestore contract and Phase 3 429 handling.

**Purpose/Issue:** Capture Pro interest without billing or checkout. The modal should write a waitlist entry and the Firestore collection should make the manual tier-flip flow easy to manage.

**Implementation — PO2 (Adam):**

- [ ] Write `waitlist/{autoId}` entries from `frontend/src/components/settings/upgrade-waitlist-modal.tsx`.
- [ ] Include `email`, `userId`, and `createdAt` in the waitlist write so the manual approval flow has enough context.
- [ ] Keep the modal reusable from quota exhaustion, settings, and any other Pro gate.

**Exit criteria:** waitlist submissions persist to Firestore and the modal can be launched from every Pro gate.

---

## Phase 5: Marketing Landing + Legal

> Goal: an anonymous visitor at `/` reads the pitch, pricing, and How It Works; signs up with PDPA consent.

### 1. Feature: Landing page rewrite

**Owner:** PO2 (Adam). **Depends on:** Phase 1 landing work and Phase 1 appendages 8-10.

**Purpose/Issue:** Turn `/` into the public pitch page for the SaaS pivot. The landing page should carry the hero, inline How It Works, pricing, and the primary Google CTA.

**Implementation — PO2 (Adam):**

- [ ] Rewrite `frontend/src/app/page.tsx` to hold the hero, inline How It Works pipeline visual, pricing cards, and footer links.
- [ ] Keep the CTA pointed at `/sign-in` and make the Free/Pro cards match the v2 launch story.
- [ ] Ensure the landing page stays the public entry point for the product story, not a dashboard teaser.

**Exit criteria:** anonymous visitors land on a complete marketing page with hero, How It Works, pricing, and Google sign-in CTA.

### 2. Feature: `/privacy` + `/terms` static pages

**Owner:** PO2 (Adam). **Depends on:** the PDPA posture defined in the spec.

**Purpose/Issue:** Publish the legal pages needed for the sign-up flow and footer links. These pages should be static, simple, and easy to maintain.

**Implementation — PO2 (Adam):**

- [ ] Add `frontend/src/app/privacy/page.tsx` with the PDPA-compliant privacy notice.
- [ ] Add `frontend/src/app/terms/page.tsx` with the terms of use content.
- [ ] Link both pages from the landing footer and the sign-up consent copy.

**Exit criteria:** `/privacy` and `/terms` render as static pages and are reachable from the public UI.

### 3. Feature: Sign-up PDPA consent gate wiring

**Owner:** PO2 (Adam). **Depends on:** Phase 2 auth pages and the privacy notice content.

**Purpose/Issue:** Make consent explicit before the Google OAuth popup opens. The sign-up flow needs a real checkbox gate and a stored timestamp so the PDPA posture is enforced, not implied.

**Implementation — PO2 (Adam):**

- [ ] Update `frontend/src/app/sign-up/page.tsx` so the checkbox must be ticked before the Google button opens OAuth.
- [ ] Persist `pdpaConsentAt` on the user doc through the auth flow in `backend/app/auth.py`.
- [ ] Keep the sign-up copy aligned with the `/privacy` notice and the footer links.

**Exit criteria:** sign-up refuses OAuth until consent is checked and the consent timestamp is stored.

### 4. Feature: Auth page polish

**Owner:** PO2 (Adam). **Depends on:** Phase 2 auth pages.

**Purpose/Issue:** Make sign-in and sign-up look like intentional product surfaces instead of dev scaffolding. The auth screens should be clean, single-purpose, and forgiving on failure.

**Implementation — PO2 (Adam):**

- [ ] Share the full-viewport card layout between `frontend/src/app/sign-in/page.tsx` and `frontend/src/app/sign-up/page.tsx`.
- [ ] Keep the loading spinner and error toast behavior consistent across both auth pages.
- [ ] Route successful auth back to `/dashboard` without a detour.

**Exit criteria:** the auth pages look polished, handle failure cleanly, and return the user to the dashboard on success.

---

## Phase 6: Production Cutover

> Goal: live at `https://layak.tech` with nightly prune; submission package refreshed.

### 1. Feature: Cloud Scheduler + nightly prune Cloud Run Job

**Owner:** PO1 (Hao). **Depends on:** Phase 2 Firestore schema and Phase 3 persisted evaluations.

**Purpose/Issue:** Enforce the free-tier retention policy automatically. The prune job must remove stale free-tier evaluations every night without touching Pro history.

**Implementation — PO1 (Hao):**

- [ ] Implement `backend/scripts/prune_free_tier.py` against the `users` and `evaluations` collections.
- [ ] Deploy the job as `layak-prune-free-tier` and schedule it nightly via Cloud Scheduler.
- [ ] Keep the job logging the deleted-doc count to Cloud Logging so retention runs are visible.

**Exit criteria:** the nightly prune job runs on schedule and deletes only free-tier evaluations older than 30 days.

### 2. Feature: `.tech` domain claim via Student Copilot + Cloud Run custom-domain mapping + DNS

**Owner:** PO2 (Adam). **Depends on:** the frontend Cloud Run service and the domain approval path.

**Purpose/Issue:** Put the product on the real domain the team will demo and share. DNS and custom-domain mapping need to be in place before the submission package is refreshed.

**Implementation — PO2 (Adam):**

- [ ] Claim `layak.tech` through Student Copilot and map it to the frontend Cloud Run service.
- [ ] Update DNS records for the custom domain and verify the mapping resolves from a fresh browser.
- [ ] Keep the public URL in the README, video script, and submission copy aligned with the new domain.

**Exit criteria:** `layak.tech` resolves to the frontend and is usable from a fresh device.

### 3. Feature: Firebase service account in Secret Manager; prod deploy with `--min-instances=1 --cpu-boost` on both services

**Owner:** PO1 (Hao). **Depends on:** Phase 2 auth boundary and Phase 6 task 2 domain mapping.

**Purpose/Issue:** Finish the production deployment with the right secrets and warm instances. The backend needs the Firebase service account, and both services should stay warm through the demo window.

**Implementation — PO1 (Hao):**

- [ ] Store `firebase-admin-key` in Secret Manager and mount it as `FIREBASE_ADMIN_KEY` for the backend.
- [ ] Deploy the backend with `adk deploy cloud_run --with_ui --region asia-southeast1 --min-instances 1 --cpu-boost --set-secrets GEMINI_API_KEY=gemini-api-key:latest --set-secrets FIREBASE_ADMIN_KEY=firebase-admin-key:latest`.
- [ ] Deploy the frontend with `gcloud run deploy layak-frontend --source . --region asia-southeast1 --min-instances 1 --cpu-boost --allow-unauthenticated --set-env-vars NEXT_PUBLIC_API_URL=<backend-url>`.

**Exit criteria:** both Cloud Run services are deployed with warm-instance settings and the backend can read the Firebase admin key from Secret Manager.

### 4. Feature: Prod smoke from a fresh device

**Owner:** Both (Adam + Hao). **Depends on:** Phase 6 tasks 1-3 deployed live.

**Purpose/Issue:** Prove the live stack works from the outside world before handing off the submission package. This is the final end-to-end check on the real domain and the real auth flow.

**Implementation — Both:**

- [ ] Open `layak.tech` in incognito from another network and confirm the Google sign-in flow still works.
- [ ] Run one full evaluation end to end and confirm the history view reflects it afterward.
- [ ] Capture any prod-only flake before the submission package is frozen.

**Exit criteria:** `layak.tech` works end-to-end from a fresh device and the history view updates after a live evaluation.

### 5. Feature: Submission package refresh

**Owner:** Both (Adam + Hao). **Depends on:** the live domain, the final demo flow, and the finished landing/legal pages.

**Purpose/Issue:** Refresh the submission artifacts so they match the SaaS pivot instead of the hackathon demo. The README, video, deck, and form submission all need to reflect the new product shape.

**Implementation — Both:**

- [ ] Update `README.md` for the v2 SaaS flow, the Firebase-backed architecture, and the new live URL.
- [ ] Re-record the demo video so it matches the signed-in workflow and the persisted history screens.
- [ ] Update the deck, export `pitch.pdf`, and resubmit the Google Form.

**Exit criteria:** the repo contains refreshed submission artifacts and the final form is resubmitted.

---

## Phase X: Submission Package

> Covers the final submission artifacts. Keep it simple and complete.

### 1. Feature: UI polish and README final pass

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Copy review, empty states, obvious-bug sweep.
- [ ] README final pass: features, setup, AI disclosure (names Claude Code per Rules §4.2), architecture overview with ASCII diagrams from `docs/trd.md`.

### 2. Feature: 3-minute demo video

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Script and two takes of the Aisyah flow.
- [ ] Edit and caption if needed.
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
- [ ] Resubmit if anything breaks.

---
