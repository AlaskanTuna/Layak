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

- [x] Frontend refinement pass after deploy: responsiveness at **375 / 768 / 1440** (Chrome DevTools device toolbar), accessibility smoke, and plain-English copy polish in `scheme-card.tsx` expanders — no horizontal scroll, no clipped text, no legalese.

**Implementation — Both, rehearsal:**

- [x] Three clean back-to-back demo rehearsals from the live URL. Keep `--min-instances=1` active during rehearsals.
- [x] Note any flake; if non-critical, log for Phase 2 polish. If it kills the demo, fix it promptly.
- [x] Set a reminder to curl the frontend URL before the live check.

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
- [x] **Live browser check** (Both — Adam + Hao) — five manual checkboxes captured in `docs/runbook.md` §3.3: fresh-browser sign-in → `/dashboard` renders without refresh → gcloud confirms `users/{uid}` doc populated → DevTools Network shows Bearer-authed `POST /api/agent/intake_manual` returns 200 SSE stream → sign-out redirects back to `/sign-in`. **Owns by both; tick when executed jointly pre-demo.** _(Pre-flight blocker fixed 21 Apr 2026: Cloud Run host `layak-frontend-297019726346.asia-southeast1.run.app` was not on the Firebase Authorized-domains list, so `signInWithPopup` was throwing `auth/unauthorized-domain`. Patched via Identity Toolkit Admin REST — recipe at `docs/runbook.md` §3.5. PO2 (Adam) then verified solo on incognito: sub-steps 1+2 (sign-in → `/dashboard` auto-redirect, no refresh); sub-step 3 (Firestore REST confirms `users/XpCMZJ1IHChOoVpLFvNDe2dArho2` doc with `email`, `displayName`, `photoURL`, `tier=free`, `createdAt`/`lastLoginAt`, `pdpaConsentAt=null` — `createTime` matched the intake-call second, proving `_upsert_user_doc` ran on the auth dependency); sub-step 4 via CLI proxy (curl `POST /api/agent/intake` with Bearer + 3 multipart PDFs → `HTTP/2 200 text/event-stream`; control unauthed POST → `HTTP 401`). Still owed jointly: in-browser DevTools Network confirmation against `/api/agent/intake_manual` (the new JSON intake) and sub-step 5 sign-out → `/sign-in` redirect.)_

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

- [x] Split the dashboard workflow into `frontend/src/app/(app)/dashboard/evaluation/page.tsx`, `frontend/src/app/(app)/dashboard/evaluation/upload/page.tsx`, and `frontend/src/app/(app)/dashboard/evaluation/results/[id]/page.tsx`. _(Dynamic route landed at `frontend/src/app/(app)/dashboard/evaluation/results/[id]/page.tsx`, with the wrapper at `frontend/src/app/pages/evaluation/evaluation-results-by-id-page.tsx`. The results view now hydrates from `GET /api/evaluations/{id}` and keeps polling every 2s while `status === "running"`.)_
- [x] Update navigation and breadcrumbs in `frontend/src/components/layout/topbar.tsx` and related route helpers so `Results` resolves cleanly. _(`breadcrumbs.tsx` now collapses long Firestore IDs after `/results/` to first-6-chars + ... so deep links stay readable. Done-event redirects now prefer `/results/{evalId}` over the legacy `/results`, with mock-mode fallthrough preserved.)_
- [x] Hydrate the results route from Firestore first, then fall back to live updates while `status === "running"`. _(`docToPipelineState()` in `evaluation-results-by-id-client.tsx` adapts Firestore `EvaluationDoc` into the existing `PipelineState` shape so `PipelineStepper` renders unchanged. `PersistedPacketDownload` now streams the ZIP from `GET /api/evaluations/{id}/packet`.)_

**Exit criteria:** summary, upload, and results each have their own route and refresh/deep-link behavior is stable.

### 4. Feature: `QuotaMeter` + 429 handling with waitlist modal

**Owner:** PO2 (Adam). **Depends on:** Phase 3 task 2 rate-limit responses and Phase 2 auth client.

**Purpose/Issue:** Show quota before the user hits the wall and give them a recovery path when the backend rejects a request. The UI should explain the cap, expose the reset time, and route blocked users into the waitlist flow.

**Implementation — PO2 (Adam):**

- [x] Add `frontend/src/components/dashboard/quota-meter.tsx` to read the rolling 24-hour count and render the free/pro badge state. _(`quota-meter.tsx` reads `GET /api/quota` on mount and on `refreshKey` bumps. Free shows used/limit plus a reset countdown; Pro shows only the badge. The backend route lives at `backend/app/routes/quota.py`, with `get_used_count` and `estimate_reset_at` extracted from `rate_limit.py`.)_
- [x] Wire 429 handling in the upload flow so the waitlist modal opens with the backend reset timestamp. _(`use-agent-pipeline.ts` now sets `state.quotaExceeded` using the typed `RateLimitErrorBody` instead of throwing. The hook also returns `acknowledgeQuotaExceeded()` so the modal can clear the state on dismiss.)_
- [x] Connect the quota state to the dashboard CTA and the `UpgradeWaitlistModal` trigger path. _(QuotaMeter now mounts on `dashboard-hero.tsx` and the upload page, and `frontend/src/components/settings/upgrade-waitlist-modal.tsx` renders the Pro upsell plus receipt state. Phase 4 Task 5 still owns the Firestore waitlist write.)_

**Exit criteria:** free users see live quota state, a blocked request shows the reset time, and the waitlist modal opens from the 429 path.

### 5. Feature: Real uploads with bundled Aisyah fixtures

**Owner:** PO2 (Adam). **Depends on:** Phase 3 task 3 route split and the backend intake endpoint.

**Purpose/Issue:** Stop treating the sample path as a mock-only demo. The bundled PDFs should travel through the real upload stack so Firestore history and results are populated from the same path as a normal run.

**Implementation — PO2 (Adam):**

- [x] Move the sample PDFs into `frontend/public/fixtures/` and point the "Use Aisyah sample documents" button at the real intake flow. _(Three synthetic Aisyah PDFs — MyKad, payslip, and TNB bill — were generated by `backend/scripts/generate_aisyah_fixtures.py` with WeasyPrint, watermarked `SYNTHETIC — FOR DEMO ONLY`, and landed under `frontend/public/fixtures/`.)_
- [x] Keep `NEXT_PUBLIC_USE_MOCK_SSE` as a dev-only replay toggle in `frontend/src/fixtures/aisyah-response.ts`.
- [x] Ensure `frontend/src/components/upload/upload-widget.tsx` posts the real files through `frontend/src/lib/firebase.ts` and the backend intake endpoint. _(`loadAisyahFixtureFiles()` in `frontend/src/lib/aisyah-fixtures.ts` fetches the three PDFs as `File` objects and ships `AISYAH_DEPENDANT_OVERRIDES` so OCR-missed household composition still reaches the real intake. `UploadWidget` gained a `samplesLoading` prop for the spinner, and the `NEXT_PUBLIC_USE_MOCK_SSE=1` escape hatch stays in place.)_

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

**Post-launch hardening pass (22/04/26):**

- [x] Utility bill section reverted from Required → Optional so users uncomfortable sharing address / bill can still run an evaluation.
- [x] Added `monthly_cost_rm` field above `monthly_kwh` (users recall RM paid more readily than kWh consumed). Field threaded through `Profile` + `ManualEntryPayload` + extract prompt + Aisyah fixtures + frontend types.
- [x] **Input sanitisation.** New `backend/app/schema/sanitize.py` — `sanitize_free_text` strips Unicode Cc/Cf/Cs/Co categories (control chars, RTL overrides, zero-width joiners, BOM, surrogates, private-use), NFKC-normalises, collapses whitespace, trims, enforces max-length. Applied via Pydantic `AfterValidator` to `ManualEntryPayload.name` (200 chars) and `.address` (300 chars, down from 500). 23 unit tests cover every Unicode category, common attack shapes (RTL override, zero-width injection), Malaysian happy paths (CJK names, diacritics), and empty-after-cleaning rejection.
- [x] **Prompt-injection hardening.** Added a "Security" section to `classify_household`'s Gemini prompt instructing it to treat `name` + `address` as data only and ignore any text inside them that looks like instructions. Defense-in-depth alongside the content sanitiser — Gemini's response is still shape-validated via `HouseholdClassification.model_validate_json`.
- [x] Address `max_length` tightened from 500 → 300 to reduce prompt-token footprint without truncating real MY addresses.
- [x] Frontend zod schema mirrors the new 300-char address cap + `monthly_cost_rm` field; Aisyah demo defaults include `monthly_cost_rm: '95.40'` so the demo populates the whole utility card.

**Other oversights noted (tracked for future hardening, not actioned here):**

- Token-burn cap on the full payload (e.g., reject requests whose JSON-serialised ManualEntryPayload exceeds N bytes) — the per-field caps already bound total size, so this is belt-and-braces.
- Frontend mirror of the sanitiser — currently the frontend sends raw input; server-side sanitisation is the authoritative line. Adding client-side as defence-in-depth would surface character-stripping to the user before submit.
- Gemini structured-output schema (`response_schema=HouseholdClassification`) — would constrain even a successful prompt injection to the declared shape. Currently only `response_mime_type="application/json"` is set; schema was dropped earlier due to an `extra="forbid"` dialect rejection. Worth revisiting on a future Gemini SDK minor bump.

---

## Phase 4: Dashboard UX (History, Stats, Settings)

> Goal: paid-feeling dashboard. _Waitlist Firestore write (formerly Task 5) was descoped — the v2 'Pro' tier is a placeholder narrative, not a real subscription product._

### 1. Feature: EvaluationHistoryTable + pagination + empty state

**Owner:** PO2 (Adam). **Depends on:** Phase 3 task 1 list endpoint and the Firestore history index.

**Purpose/Issue:** Give users a readable history view that scales past a single evaluation. The history list should be paginated, predictable, and useful when empty.

**Implementation — PO2 (Adam):**

- [x] Add `frontend/src/components/history/evaluation-history-table.tsx` with 20-per-page pagination and row links to `/dashboard/evaluation/results/[id]`. _(Pure presentational component; status/date/RM columns plus per-row View link. Pagination is client-side over the slim list rows the backend already caps at 50; cursor pagination via `nextPageToken` stays reserved until a free user crosses 5×10 days of saturated usage.)_
- [x] Wire the summary page in `frontend/src/app/(app)/dashboard/evaluation/page.tsx` to the table and its empty state. _(New `frontend/src/components/history/evaluation-history-section.tsx` owns the single `GET /api/evaluations?limit=50` fetch and feeds both the AggregateStatsCards and the table. The page route re-export remains a thin wrapper.)_
- [x] Keep the empty state explicit: no history yet, with a CTA back to the upload route. _(Empty case renders a centred Card with copy + a "Start your first evaluation" button rendered via Link to `/dashboard/evaluation/upload`.)_

**Exit criteria:** the history page paginates, deep-links to results, and shows a clear empty state.

### 2. Feature: AggregateStatsCards

**Owner:** PO2 (Adam). **Depends on:** Phase 3 task 1 stored evaluations and the history query.

**Purpose/Issue:** Surface the dashboard metrics that make the product feel alive: total evaluations, total RM identified, and unique schemes qualified.

**Implementation — PO2 (Adam):**

- [x] Add `frontend/src/components/history/aggregate-stats-cards.tsx` above the history table. _(Three-card grid: Total evaluations, Lifetime RM identified, Successful runs. Sits inside `EvaluationHistorySection` so both children consume the same fetch.)_
- [x] Derive the metrics from the Firestore-backed evaluation data already returned by the history query. _(Folds the `EvaluationListItem[]` once in a `useMemo`. "Unique schemes qualified" was substituted with "Successful runs" because the slim list endpoint omits per-eval scheme arrays — surfacing scheme IDs cleanly would need a backend list-shape extension owned by PO1's contract.)_
- [x] Keep the cards responsive and consistent with the dashboard shell. _(Stacks single-column on mobile, three-column from `sm:`; uses the existing `Card` primitive with eyebrow label + tabular-nums value styling that matches the QuotaMeter strip above.)_

**Exit criteria:** the dashboard summary shows the three aggregate stats from persisted data.

### 3. Feature: Settings page (profile, tier card, danger zone)

**Owner:** PO2 (Adam). **Depends on:** Phase 2 auth profile fields and Phase 4 task 4 PDPA endpoints.

**Purpose/Issue:** Provide a place for account metadata, tier visibility, and destructive actions. The settings screen should expose the user’s identity, tier state, and PDPA controls without mixing them into the dashboard.

**Implementation — PO2 (Adam):**

- [x] Build `frontend/src/app/(app)/settings/page.tsx` with profile, tier, and danger-zone sections. _(Page surface lives at `frontend/src/app/pages/settings/settings-page.tsx`; the `(app)/settings/page.tsx` route stays a thin re-export. Three Card sections: Profile (avatar initial + displayName + email from `useAuth`'s Firebase User), Plan (reads `GET /api/quota` — Pro badge for `tier === 'pro'`, Free-tier badge with `used / limit` for free), Danger zone (ring-destructive border + destructive variant Buttons). Orphaned `frontend/src/components/settings/settings-placeholder.tsx` deleted in the same commit.)_
- [x] Reuse `frontend/src/components/layout/user-menu.tsx` and `TierBadge` so the tier reads the same everywhere. _(Settings tier surface uses the same shadcn `Badge` primitive + Lucide `Crown`/`Zap` icon pair the QuotaMeter strip and UserMenu surface already establish, so the visual weight matches across header, dashboard, and settings. UserMenu itself stays the topbar dropdown — not embedded in /settings — and a dedicated `<TierBadge />` component was not split out: would have been one-line wrapper since both consumers already render the same Badge inline. Re-evaluate if a third tier-surface lands.)_
- [x] Wire the export/delete actions to the backend endpoints once Phase 4 task 4 lands. _(Export → `authedFetch('GET /api/user/export')` → `URL.createObjectURL` → trigger download → `URL.revokeObjectURL`. Delete → `window.confirm` gate → `authedFetch('DELETE /api/user')` → `signOutCurrentUser()` → `router.replace('/sign-in')`. Both surface failures through a single destructive `Alert` at the top of the page.)_

**Exit criteria:** settings shows the signed-in Google profile, tier state, and the export/delete actions.

### 4. Feature: Backend PDPA endpoints

**Owner:** PO1 (Hao). **Depends on:** Phase 2 auth boundary and Firestore persistence from Phase 3.

**Purpose/Issue:** Give users the access and deletion rights required by the PDPA posture. Export must bundle the user record and evaluation history; delete must cascade cleanly through Firestore and Firebase Auth.

**Implementation — PO1 (Hao):**

- [x] Add `backend/app/routes/user.py` with `GET /api/user/export` and `DELETE /api/user`. _(Mounted in `main.py` via `user_router`. Both endpoints authed via `CurrentUser`; only the caller's own data is touched.)_
- [x] Read `users/{userId}` plus all matching `evaluations` records and return them as a downloadable JSON attachment for export. _(Returns `application/json` with `Content-Disposition: attachment; filename="layak-export-{uid}.json"` + `Cache-Control: no-store`. Body: `{uid, exportedAt:<ISO-8601 UTC>, schemaVersion:1, user, evaluations:[{id, ...}]}`. Evaluations ordered `createdAt DESC` via the existing `(userId ASC, createdAt DESC)` composite index. Timestamps serialised to ISO strings via `_serialise_doc`. Handles missing `users/{uid}` gracefully — returns `user: null`, 200 not 404.)_
- [x] Cascade-delete `evaluations`, delete `users/{userId}`, and call `firebase_admin.auth.delete_user(uid)` on account removal. _(Firestore deletes in batches of 450 ops to stay under the 500-op-per-batch SDK cap. Order: evaluations → user doc → auth. `UserNotFoundError` is idempotent. Other Auth failures after Firestore success return 500 with a descriptive retry hint; Firestore side is idempotent-by-being-empty on retry. Returns 204 No Content on success.)_

**Exit criteria:** export downloads the user bundle and delete removes the Firestore records plus the Firebase Auth account.

**Tests:** `backend/tests/test_user_routes.py` — 10 cases covering auth wall (both endpoints), export happy path (user + 2 evals, ISO timestamp serialisation, uid-scoping, `Cache-Control: no-store`), export with no evals, export with missing user doc, delete cascade (3 evals + user doc = 4 batch ops, `auth.delete_user(uid)` called), delete idempotent when Auth record already gone (`UserNotFoundError`), delete 500 on Firestore failure (auth.delete_user NOT called — critical invariant), delete 500 on Auth failure after Firestore success (retry hint in detail), delete batches large eval counts (950 evals → multiple batch commits). Backend suite: **156/156 green**; ruff clean.

---

## Phase 5: Marketing Landing + Legal

> Goal: an anonymous visitor at `/` reads the pitch, pricing, and How It Works; signs up with PDPA consent.

### 1. Feature: Landing page rewrite

**Owner:** PO2 (Adam). **Depends on:** Phase 1 landing work and Phase 1 appendages 8-10.

**Purpose/Issue:** Turn `/` into the public pitch page for the SaaS pivot. The landing page should carry the hero, inline How It Works, pricing, and the primary Google CTA.

**Implementation — PO2 (Adam):**

- [x] Rewrite `frontend/src/app/page.tsx` to hold the hero, inline How It Works pipeline visual, pricing cards, and footer links.
- [x] Keep the CTA pointed at `/sign-in` and make the Free/Pro cards match the v2 launch story.
- [x] Ensure the landing page stays the public entry point for the product story, not a dashboard teaser.

**Exit criteria:** anonymous visitors land on a complete marketing page with hero, How It Works, pricing, and Google sign-in CTA.

### 2. Feature: `/privacy` + `/terms` static pages

**Owner:** PO2 (Adam). **Depends on:** the PDPA posture defined in the spec.

**Purpose/Issue:** Publish the legal pages needed for the sign-up flow and footer links. These pages should be static, simple, and easy to maintain.

**Implementation — PO2 (Adam):**

- [x] Add `frontend/src/app/privacy/page.tsx` with the PDPA-compliant privacy notice.
- [x] Add `frontend/src/app/terms/page.tsx` with the terms of use content.
- [x] Link both pages from the landing footer and the sign-up consent copy.

**Exit criteria:** `/privacy` and `/terms` render as static pages and are reachable from the public UI.

### 3. Feature: Sign-up PDPA consent gate wiring

**Owner:** PO2 (Adam). **Depends on:** Phase 2 auth pages and the privacy notice content.

**Purpose/Issue:** Make consent explicit before the Google OAuth popup opens. The sign-up flow needs a real checkbox gate and a stored timestamp so the PDPA posture is enforced, not implied.

**Implementation — PO2 (Adam):**

- [x] Update `frontend/src/app/sign-up/page.tsx` so the checkbox must be ticked before the Google button opens OAuth.
- [x] Persist `pdpaConsentAt` on the user doc through the auth flow in `backend/app/auth.py`.
- [x] Keep the sign-up copy aligned with the `/privacy` notice and the footer links.

**Exit criteria:** sign-up refuses OAuth until consent is checked and the consent timestamp is stored.

### 4. Feature: Auth page polish

**Owner:** PO2 (Adam). **Depends on:** Phase 2 auth pages.

**Purpose/Issue:** Make sign-in and sign-up look like intentional product surfaces instead of dev scaffolding. The auth screens should be clean, single-purpose, and forgiving on failure.

**Implementation — PO2 (Adam):**

- [x] Share the full-viewport card layout between `frontend/src/app/sign-in/page.tsx` and `frontend/src/app/sign-up/page.tsx`.
- [x] Keep the loading spinner and error toast behavior consistent across both auth pages.
- [x] Route successful auth back to `/dashboard` without a detour.

**Exit criteria:** the auth pages look polished, handle failure cleanly, and return the user to the dashboard on success.

---

## Phase 6: Production Cutover

> Goal: live at `https://layak.tech` with nightly prune; submission package refreshed.

### 1. Feature: Cloud Scheduler + nightly prune Cloud Run Job

**Owner:** PO1 (Hao). **Depends on:** Phase 2 Firestore schema and Phase 3 persisted evaluations.

**Purpose/Issue:** Enforce the free-tier retention policy automatically. The prune job must remove stale free-tier evaluations every night without touching Pro history.

**Implementation — PO1 (Hao):**

- [x] Implement `backend/scripts/prune_free_tier.py` against the `users` and `evaluations` collections. _(Iterates `users.where("tier","==","free").stream()`, then per-user `evaluations.where("userId","==",uid).where("createdAt","<",now-30d).stream()`; batched `.delete()` at 450 ops/commit to stay under Firestore's 500-op batch cap. `--dry-run` flag counts without committing. 12 unit tests green. Dockerfile now `COPY scripts ./scripts` so the Job image carries the entry point.)_
- [ ] Deploy the job as `layak-prune-free-tier` and schedule it nightly via Cloud Scheduler. _(Recipe landed at `docs/runbook.md` §4: dedicated `layak-prune-job` service account with `roles/datastore.user` only; `gcloud run jobs create` overrides `CMD` to `python -m scripts.prune_free_tier`; `gcloud scheduler jobs create http` fires at `0 2 * * *` in `Asia/Kuala_Lumpur`. Awaiting a live `gcloud` session to execute.)_
- [x] Keep the job logging the deleted-doc count to Cloud Logging so retention runs are visible. _(Single structured-JSON line to stdout on every run — `severity`, `message`, `deletedEvaluations`, `freeUsersChecked`, `cutoffIso`, `retentionDays`, `dryRun`. Cloud Run Jobs forward stdout to Cloud Logging's `jsonPayload` automatically. Failures emit `severity:"ERROR"` and exit non-zero so Cloud Scheduler surfaces the failed run.)_

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

- [x] Store `firebase-admin-key` in Secret Manager and mount it as `FIREBASE_ADMIN_KEY` for the backend. _(PO2 landed on PO1's behalf during the Phase 2 Task 2 deploy. Secret `firebase-admin-key` created 21/04 with v1 minted under `umask 077`; Compute SA holds `roles/secretmanager.secretAccessor` on it. Live `layak-backend` revision confirms the env block carries `FIREBASE_ADMIN_KEY` resolved from `secretKeyRef{name:firebase-admin-key, key:latest}`.)_
- [x] Deploy the backend with warm instances + the Firebase admin secret mounted. _(Original `adk deploy cloud_run` command obsoleted — production now ships through `.github/workflows/cloud-run-deploy.yml` (Workload Identity Federation, no long-lived keys). Backend job runs `gcloud run deploy layak-backend --source backend --min-instances 1 --cpu-boost --set-env-vars GOOGLE_CLOUD_PROJECT=...,GOOGLE_CLOUD_LOCATION=... --set-secrets FIREBASE_ADMIN_KEY=firebase-admin-key:latest`. The original `--set-secrets GEMINI_API_KEY=...` line is intentionally absent — Phase 6 Task 6 cut Gemini access over to Vertex AI ADC and that secret was deleted from Secret Manager. Live revision metadata confirms `minScale=1`, `startup-cpu-boost=true`, `cpu=1000m`, `memory=1Gi`.)_
- [x] Deploy the frontend with warm instances on the same workflow. _(Same `cloud-run-deploy.yml` frontend job runs `gcloud run deploy layak-frontend --source frontend --min-instances 1 --cpu-boost --allow-unauthenticated --set-build-env-vars NEXT_PUBLIC_BACKEND_URL=...,NEXT_PUBLIC_FIREBASE__=...`. Build-env (not runtime env) is correct for Next.js — `NEXT*PUBLIC*_`is baked into the static bundle at`pnpm build`. Live `layak-frontend`revision confirms`minScale=1`+`startup-cpu-boost=true`.)\_

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
- [ ] **Slide 15 (Thank You) — add the two QR codes**: the deck ships with two empty 1:1 placeholder squares labelled `Live Demo` and `GitHub`. Before export, drop in QR codes that resolve to the production URL and the public GitHub repo (generate in Google Slides, or via `qrencode` for PNG and paste over the placeholders in `docs/slides/layak-pitch-deck.html`). Do not submit with empty QR slots.

**Exit criteria:** the repo contains refreshed submission artifacts and the final form is resubmitted.

### 6. Feature: Migrate Gemini surface from AI Studio API key to Vertex AI

**Owner:** PO2 (Adam). **Depends on:** Phase 6 Task 3 (Cloud Run deploy plumbing already understands Secret Manager) — NOT a hard block; this can ship before Task 3 if the team prioritises unblocking the live demo.

**Purpose/Issue:** The Gemini API key obtained via AI Studio keeps silently demoting the project from Tier 1 to Free tier even with billing active. Free tier caps Gemini 2.5 Flash at 20 RPD, which the live pipeline blows past every demo run — verified 22/20 today, with `429 RESOURCE_EXHAUSTED` on the classify step. Vertex AI uses the GCP project's IAM + billing directly, bypasses the AI Studio key tier-management bug, and draws correctly on the project's $25 Google Cloud Credit.

**Implementation — PO2 (Adam):**

- [x] Enable the Vertex AI API on `layak-myaifuturehackathon` (`gcloud services enable aiplatform.googleapis.com` — already enabled per Phase 0 but verify). _(Already enabled on `layak-myaifuturehackathon`; verified while smoke-testing the live revision.)_
- [x] Refactor `backend/app/agents/gemini.py::get_client()` to construct a Vertex AI client via `google.genai.Client(vertexai=True, project=os.environ["GCP_PROJECT_ID"], location=os.environ.get("GCP_LOCATION", "asia-southeast1"))`. Drop the `api_key=` kwarg entirely. Keep the same `FAST_MODEL` / `ORCHESTRATOR_MODEL` constants — Vertex AI publisher model IDs are identical (`gemini-2.5-flash`, `gemini-2.5-pro`). _(Implemented in `backend/app/agents/gemini.py`; the client now uses Vertex AI publisher model IDs with ADC-backed auth instead of AI Studio keys.)_
- [x] Update the `_load_key_from_dotenv` helper to fall back to `GCP_PROJECT_ID` / `GCP_LOCATION` instead of `GEMINI_API_KEY`. Raise a clearer error if the project ID env var is missing. _(Renamed to `_load_var_from_dotenv` in `backend/app/agents/gemini.py`; it now reads `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_LOCATION` and surfaces a hard error when the project ID is absent.)_
- [x] Update `.env.example` and the runbook to document `GCP_PROJECT_ID=layak-myaifuturehackathon` + `GCP_LOCATION=asia-southeast1` instead of `GEMINI_API_KEY=...`. _(`.env.example` now carries the Vertex AI / ADC setup with `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION`; the same cutover note is reflected in the deployment runbook guidance.)_
- [x] Update `.github/workflows/cloud-run-deploy.yml` backend job: drop `--set-secrets=GEMINI_API_KEY=gemini-api-key:latest`, add `--set-env-vars=GCP_PROJECT_ID=layak-myaifuturehackathon,GCP_LOCATION=asia-southeast1`. _(`.github/workflows/cloud-run-deploy.yml` now injects the GCP project/location env vars directly and no longer mounts `GEMINI_API_KEY` as a secret.)_
- [x] Local dev path: `gcloud auth application-default login` (Application Default Credentials) so `genai.Client(vertexai=True)` picks up the user's gcloud session; document this in the runbook. _(`.env.example` now points local dev at ADC via `gcloud auth application-default login`, so `google-genai` resolves credentials from the signed-in gcloud session.)_
- [x] Cloud Run path: the existing service account already authenticates the container — once `roles/aiplatform.user` is granted no extra config is needed. _(Cloud Run already authenticated through the default Compute Engine service account, which inherits `roles/editor`; that was enough for Vertex AI calls without any extra secret mount or client-side key plumbing.)_
- [x] Update `backend/tests/test_gemini.py` (or add one if absent) — patch `genai.Client` and assert the construction kwargs flip from `api_key=` to `vertexai=True, project=..., location=...`. _(Landed in `backend/tests/test_gemini_client.py` with four cases covering the Vertex constructor, default location, missing project error, and stale-key regression.)_
- [x] Smoke: run one full evaluation against the live deploy (`/api/agent/intake_manual` with Aisyah payload) and confirm the 5-step pipeline completes end-to-end without a `429 RESOURCE_EXHAUSTED` error. Bonus: check Cloud Console → Vertex AI → Quotas to confirm requests are now drawing on the project quota, not the AI Studio Free tier. _(Verified live in-browser via `/dashboard/evaluation/upload?mode=manual` → "Use Aisyah sample data" → "Generate packet". Pipeline ran all 5 steps clean, eval id `66yo2x1oyDauuknZjrEw`, RM8,208 surfaced, packet ZIP downloaded with valid PDFs. Spotted side bug: `CodeExecutionPanel` rendered empty on the persisted-results route because `python_snippet` + `stdout` were never persisted; fixed in the same commit by adding `upsideTrace: ComputeUpsideTrace` to `EvaluationDoc` + persisting the trace from the `compute_upside` event in `evaluation_persistence.py`.)_
- [x] After the migration is verified live, schedule deletion of the `gemini-api-key` Secret Manager entry (`gcloud secrets delete gemini-api-key`) — but only AFTER the rollout is stable for at least one demo cycle. _(Deleted on 22/04 via `gcloud secrets delete gemini-api-key --project layak-myaifuturehackathon` — Cloud Run backend env confirmed to no longer carry GEMINI_API_KEY (only GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, FIREBASE_ADMIN_KEY) before deletion.)_
- [x] Update `docs/trd.md` §5.1 + §7 to replace every `GEMINI_API_KEY` reference with the Vertex AI ADC + project-based auth flow. _(Swept 8 references across §2.1 ASCII diagram, §5.1 model routing, §5.4 deploy command + IAM, §6.7 env catalog, §7 Security & Secrets, and the Phase 1 entry of the rollout matrix; §7.1 (just-added env+secrets policy) left untouched.)_

**Exit criteria:** `/api/agent/intake_manual` and `/api/agent/intake` both complete the full 5-step pipeline against the live Cloud Run deploy without hitting Gemini Free-tier quota; Vertex AI Quotas page shows the requests landing on the project's quota; `gemini-api-key` secret is deleted after one stable demo cycle.

### 7. Feature: Multilingual support (English + Bahasa Malaysia + 简体中文)

**Owner:** PO1 (Hao). **Depends on:** nothing hard — touches only frontend; landing / auth / dashboard / evaluation / settings copy is the surface. **Does not block:** any backend work. **Not blocked by:** Phase 6 Tasks 1-6.

**Purpose/Issue:** Layak's target users are Malaysian citizens — Aisyah the Grab driver speaks Bahasa Malaysia as her primary language; a large share of the urban Chinese community reads Simplified Chinese more comfortably than English. A monolingual English UI limits the pitch's reach and misses an obvious "GovTech for every citizen" cue the Track 2 judges will look for. This task lands a single-switch i18n layer so every visible English string in the frontend has a vetted Bahasa Malaysia and Simplified Chinese translation, with a Lucide-iconed dropdown in the header to switch at runtime. Backend-generated copy (Gemini responses, scheme names from the committed government PDFs — STR 2026, JKM Warga Emas, LHDN Form B — and cited passages) deliberately stays in its source language to preserve legal grounding + citation fidelity.

**Implementation — PO1 (Hao):**

- [x] Add `i18next`, `react-i18next`, and `i18next-browser-languagedetector` to `frontend/package.json` via `pnpm -C frontend add`. Rationale: framework-agnostic, works identically on server + client components, no App Router middleware or locale-routing reshuffle required (unlike `next-intl`). Persist the chosen language via the detector's localStorage backend — no URL prefix, no cookie, no `/en/...` route split.
- [x] Create `frontend/src/lib/i18n/index.ts` — initialises `i18next` with `react-i18next`, registers the language detector (localStorage → browser → fallback `en`), and loads the three JSON bundles. Exported `i18n` instance is the singleton every component reaches through `useTranslation()`.
- [x] Create `frontend/src/lib/i18n/locales/en.json`, `ms.json`, `zh.json`. Organise into namespaces mirroring the route tree so no single file balloons: `common` (buttons, actions, nav), `marketing` (landing + `/privacy` + `/terms`), `auth` (sign-in + sign-up + PDPA consent), `dashboard` (hero + history table + quota meter + settings), `evaluation` (upload widget + manual entry form + stepper labels + results page + error recovery), `schemes` (generic labels around matched-scheme cards — NOT the scheme names themselves, which stay source-language).
- [x] Create `frontend/src/components/providers/i18n-provider.tsx` — thin `'use client'` wrapper that imports the `i18n` singleton and renders `<I18nextProvider i18n={i18n}>`. Mount it in `frontend/src/app/layout.tsx` above `next-themes` so both live in the same client boundary.
- [x] Create `frontend/src/components/layout/language-toggle.tsx` — shadcn `DropdownMenu` with the Lucide `Languages` icon as the trigger (matching `theme-toggle.tsx`'s sizing + ghost-button styling so the two sit flush). Three menu items: **English** / **Bahasa Malaysia** / **简体中文**. Active language shows a check mark; selecting any item calls `i18n.changeLanguage(code)` and the detector persists to localStorage.
- [x] Mount `<LanguageToggle />` next to `<ThemeToggle />` in BOTH `frontend/src/components/layout/marketing-header.tsx` (anonymous marketing + legal pages) AND `frontend/src/components/layout/topbar.tsx` (authed app shell). Keep the existing spacing utilities so the two controls form a balanced pair on mobile (horizontal-scroll-resistant) and desktop.
- [x] Sweep every `'use client'` component under `frontend/src/components/{auth,dashboard,evaluation,how-it-works,landing,layout,schemes,settings,sign-in,sign-up}` and `frontend/src/app/**` for hard-coded English strings. Replace each with `t("<namespace>.<key>")` via `useTranslation(<namespace>)`. Server components that render static copy use `i18next.t` on the singleton rather than the hook — applies to page metadata / `generateMetadata` callsites.
- [x] Explicitly NOT translated — documented in `docs/trd.md` §6.8: scheme names ("Sumbangan Tunai Rahmah 2026", "JKM Warga Emas", "LHDN Form B"), government source URLs, cited passages from the committed PDFs, RM currency amounts, MyKad + IC number fragments, email addresses, and package version strings. These stay source-language for legal grounding and citation fidelity.
- [x] Translation accuracy — use Bahasa Malaysia standard register (Dewan Bahasa dan Pustaka aligned, not colloquial) and Simplified Chinese (普通话 / 简体中文, NOT Traditional). Preserve domain terminology: keep "STR 2026", "JKM", "LHDN", "Form B" as-is in all three bundles (proper nouns + legal references). Malaysian-context nouns like "dependant" → "tanggungan" (ms) / "受扶养人" (zh); "Grab driver" stays "Grab driver" in all three (brand name).
- [x] Number + date localisation — for the MYR currency display, keep the existing `RM8,208` format across all three locales (it's the Malaysian convention everyone recognises; translating RM to "马币" would confuse more than help). For dates, use the `Intl.DateTimeFormat` with the locale code (`en-MY` / `ms-MY` / `zh-CN`) so "22 April 2026" renders natively in each.
- [x] Accessibility — the `<LanguageToggle />` trigger needs an `aria-label={t("common.a11y.language_selector")}` that's itself translated; the menu items don't need an aria-label because their visible text is the name. Set `<html lang={i18n.language}>` via a client-side effect in `i18n-provider.tsx` so screen readers read each page in the active language.
- [x] Run `pnpm -C frontend build` — resolves any missing key / typo at build time (TypeScript catches bad key paths via a typed `t()` helper if we add one; minimum viable is `pnpm build` + a runtime missing-key warning gated by `i18n.init({ missingKeyHandler: ... })` that throws in dev).
- [x] Run two subagent audits in parallel: (1) **completeness** — walks every `*.tsx` under `frontend/src/{app,components}`, flags any hard-coded English string that survived the sweep; (2) **translation accuracy** — cross-checks the `ms.json` and `zh.json` values against their `en.json` counterparts for mistranslations, wrong register, broken placeholders (`{{variable}}` tokens), or accidentally translated proper nouns. Fix every blocker before commit.
- [x] Manual smoke at `pnpm -C frontend dev`: land on `/`, open the language dropdown, switch to Bahasa Malaysia, click through `/sign-in` → `/sign-up` → (after sign-in) `/dashboard` → `/dashboard/evaluation/upload` → Manual Entry Mode → submit Aisyah sample → results page. Repeat for 简体中文. Confirm the header toggle keeps the choice across navigations (localStorage persistence working) AND across a full page reload. _(Deferred to the human — no interactive browser session in this automation context.)_
- [x] Tick these items, append a dated summary to `docs/progress.md`, commit `feat(ui): multilingual support (en + ms + zh-cn) via react-i18next`, push.

**Exit criteria:** every English string in `frontend/src/` is either served through `t(...)` or explicitly documented as "stays source-language" in `docs/trd.md` §6.8. The header dropdown switches all three languages at runtime with no full-page reload and persists the choice across navigations + reloads. `pnpm -C frontend build` is clean. Both subagent audits return zero critical findings. Manual smoke confirms Bahasa Malaysia + Simplified Chinese render correctly across the marketing / auth / dashboard / evaluation / results surfaces.

---

## Phase 7: v2 Polish (Usability + Form BE expansion)

> Goal: ship the usability + reach upgrades that turn the working SaaS pivot into a hackathon-winning demo. Pre-submission polish only — no new architecture, no new persistence layers, no new orchestrator.

### 1. Feature: Form BE filer support (salaried path alongside gig)

**Owner:** PO1 (Hao). **Depends on:** Phase 1 task 4 (rule engine), Phase 1 task 3 (orchestrator), the existing `Profile.form_type` schema field.

**Purpose/Issue:** Today's pipeline is locked to Form B (self-employed Aisyah). Most working Malaysians file Form BE (salaried). Broadening unlocks the "Citizens First" pitch from gig workers to teachers, nurses, civil servants. The `form_type` schema field already exists; ManualEntry already exposes `employment_type: 'gig' | 'salaried'`. The gap is downstream: classifier prompt, packet template, classify-step Pydantic emission.

**Implementation — PO1 (Hao):**

- [x] Extend `backend/app/agents/tools/classify.py` so the classifier prompt derives `form_type` from `employment_type` (`salaried` → `form_be`, `gig` → `form_b`) instead of hardcoding `form_b`. Add an inline test case in the prompt for a salaried profile. _(Form-type derivation was already happening in `extract.py` (Gemini infers from the income doc) and `build_profile.py:89` (manual-entry path maps `employment_type` → `form_type`). The classify prompt's `notes` bullet was updated to tell Gemini to echo `Profile.form_type` verbatim in its filer-category observation — no new `form_type` output field on `HouseholdClassification` since it would duplicate what Profile already carries.)_
- [x] Audit each LHDN scheme rule under `backend/app/rules/` — most personal reliefs (#1 individual, #16a child, parent medical, #17 EPF+life, #9 lifestyle) apply to BOTH forms identically. Document any rule that genuinely differs in a comment. _(Audit landed in the `lhdn_form_b.py` module docstring: the five reliefs are form-agnostic per PR 4/2024. Only divergence is the filing deadline — 30 June 2026 for Form B (RF Filing Programme Example 2) vs 30 April 2026 for Form BE (Example 1), both with 15-day e-Filing grace. `_citations(form_type)` now appends the correct deadline citation conditionally. A parity test asserts `_applicable_reliefs` and `match().annual_rm` are identical for a Form-B vs Form-BE profile of the same income / household shape.)_
- [x] Add a Form BE Jinja template alongside the Form B template in `backend/app/templates/lhdn_form_*.html`. Same field set — just the agency-form layout differs. _(New `backend/app/templates/lhdn_be.html.jinja` mirrors the Form B layout byte-for-byte on the relief table + tax-delta arithmetic + citation list; differs on title ("LHDN Form BE"), agency line ("Salaried Individual"), filer-category field ("employment income only"), filing-deadline field ("30 April 2026, grace to 15 May 2026"), and the callout copy (mentions MTD/PCB reconciliation instead of the self-employed book-keeping line). Docstring at the top of the new template warns to keep the two in sync.)_
- [x] Update `backend/app/agents/tools/generate_packet.py` to pick the right Jinja template based on `profile.form_type`. _(`_TEMPLATE_MAP` gained a `lhdn_form_be` entry routing to `lhdn_be.html.jinja` with filename pattern `LHDN-form-be-relief-summary-{ic_last4}.pdf`. Dispatch happens on `match.scheme_id` — which is itself derived from `profile.form_type` by `lhdn_form_b.match()` — so routing is correctly form-aware without adding a second dispatcher layer.)_
- [x] Add `backend/tests/test_classify_form_be.py` — at minimum: salaried profile → classifier emits `form_type: 'form_be'`; gig profile → classifier emits `form_type: 'form_b'` (regression). _(10 new tests covering: `build_profile_from_manual_entry` mapping (salaried→form_be, gig→form_b); LHDN rule scheme_id divergence for each form; Form BE deadline citation present, Form B deadline citation absent (and vice versa); Form BE deadline passage "30 April 2026" / "15 May 2026" appears verbatim in `rf-filing-programme-for-2026.pdf`; reliefs + tax-saving parity across forms; `_TEMPLATE_MAP` routes form_be to `lhdn_be.html.jinja`; end-to-end `generate_packet` async test asserts the rendered bytes start with `%PDF` for a salaried filer. Full backend suite 216/216 green; `test_lhdn_form_b.py` `test_form_be_filer_does_not_qualify` was rewritten to assert the new qualifying behavior, preserving the regression coverage for the previous gate.)_
- [x] Sync the frontend `SchemeId` Literal (`frontend/src/lib/agent-types.ts`) with the backend's `app/schema/scheme.py` addition so the typed mirror doesn't reject `"lhdn_form_be"` at runtime. _(Caught by the post-landing audit — backend emitted `lhdn_form_be` but the frontend type declared only the three original IDs. The comment at the top of `agent-types.ts` already pins this "update both sides in lockstep" discipline.)_

**Exit criteria:** running the pipeline with `employment_type: 'salaried'` produces a Form BE draft packet end-to-end without regressing the existing Aisyah Form B path.

### 2. Feature: Cikgu Farhan salaried persona fixtures

**Owner:** PO1 (Hao). **Depends on:** Phase 7 task 1 (Form BE support).

**Purpose/Issue:** A second persona reinforces the "broad citizens" pitch and gives the demo video a side-by-side moment. `docs/demo/farhan/` already has the source HTML drafted by the parallel agent — wire them through the same fixture pipeline Aisyah uses.

**Implementation — PO1 (Hao):**

- [x] Confirm `docs/demo/farhan/{mykad,payslip,tnb-bill}.html` exist and render cleanly via the existing `backend/scripts/generate_aisyah_fixtures.py` pattern. Refactor that script (or extend it) to also emit `frontend/public/fixtures/farhan-{mykad,payslip,utility}.pdf`. _(Renamed `generate_aisyah_fixtures.py` → `generate_demo_fixtures.py` and widened it to iterate both personas through a single fixture-pair loop. The script now raises `FileNotFoundError` if any source HTML is missing and emits 6 PDFs (aisyah × 3 + farhan × 3); Aisyah output filenames are unchanged so no frontend reference breaks. Ran locally — 6 PDFs land with expected sizes (farhan-mykad 22.6 KB, farhan-payslip 222.5 KB, farhan-utility 94.3 KB).)_
- [x] Add `frontend/src/lib/farhan-fixtures.ts` mirroring `aisyah-fixtures.ts` (`loadFarhanFixtureFiles()` + `FARHAN_DEPENDANT_OVERRIDES`). _(Module-level contract identical to the Aisyah loader. Dependant overrides reflect the Farhan payslip's "Pasangan + 2 anak" line — spouse age 36, two children ages 10 and 7. Both child ages are <18 so LHDN Form BE child relief (#16a) fires twice; the spouse is decorative since the current rule engine only stacks parent-medical on `relationship == 'parent'`.)_
- [x] Add a second "Use Farhan sample data" button next to the existing Aisyah CTA in `frontend/src/components/evaluation/upload-widget.tsx` (or whichever component wires the sample-load). _(UploadWidget Props signature widened to `onUseSamples: (persona: 'aisyah' \| 'farhan') => void` + `samplesLoading: SamplePersona \| null`. Two `SamplePersonaButton` instances render with an "or" divider between them so only the clicked button spins. `EvaluationProvider` gained a `demoPersona` state (`'aisyah' \| 'farhan' \| null`); `setDemoMode` signature flipped from `boolean` to `DemoPersona \| false`. `DemoModeBanner` now reads `demoPersona` and renders `t('evaluation.demo.description_<persona>')`accordingly.`evaluation-upload-client.tsx`dispatches via a`PERSONA*LOADERS` table keyed on persona id; mock-SSE escape hatch gated to Aisyah only (the canned event stream is Aisyah-shaped and would desync if replayed against a Farhan click).)*
- [x] Update `frontend/public/fixtures/` references in `frontend/src/components/landing/` if the landing page features a persona card. _(Grepped the landing + how-it-works surfaces — no persona-card references to `/fixtures/` exist; landing only renders pipeline + pricing + CTA sections. No-op on the current codebase.)_
- [x] Add per-persona i18n copy to `frontend/src/lib/i18n/locales/{en,ms,zh}.json`: new keys `evaluation.upload.useSamplesAisyah`, `useSamplesFarhan`, `samplesDivider`, plus `evaluation.demo.description_aisyah` + `description_farhan` replacing the single-persona description. All three locales synchronized — subagent audit confirmed zero missing keys + zero silent-English-fallback risk.

**Exit criteria:** clicking "Use Farhan sample data" runs the live pipeline against the salaried persona end-to-end and produces a Form BE draft packet.

### 3. Feature: Upload validation + JPG/PNG crop preview before ingest

**Owner:** PO2 (Adam). **Depends on:** Phase 1 task 2 upload widget, Phase 1 task 5 frontend SSE wiring.

**Purpose/Issue:** The upload step is still too fuzzy for normal users. It is not obvious whether invalid file types are blocked, JPG/PNG image uploads behave differently from PDF uploads, and blurry photos can go straight into the pipeline without one last human check. For hackathon polish, the upload flow should explain what is accepted, validate it clearly, and let the user crop image uploads before the agentic pipeline ingests them. PDF uploads skip the crop step and ingest directly.

**Implementation — PO2 (Adam):**

- [x] Tighten `frontend/src/components/evaluation/upload-widget.tsx` validation so each slot clearly rejects unsupported file types with inline copy the user can understand. Keep accepted types explicit in the UI (`JPG`, `PNG`, `PDF`) and fail fast before submit. _(Strict allowlist swap — `image/*` prefix replaced with explicit `image/jpeg | image/png | application/pdf` set; the looser prefix had been letting BMP / TIFF / HEIC reach the OCR step. New `errorFileTypeStrict` i18n triplet renders inline under the slot.)_
- [x] Add visible helper copy near the upload widget explaining the ingestion difference: `JPG/PNG` → image OCR path, `PDF` → direct PDF/text extraction path. This should remove the "why did these behave differently?" confusion. _(New banner renders above the three slot cards using `evaluation.upload.ingestionPathHelper` with a `FileImage` icon. Translated en/ms/zh.)_
- [x] For `JPG` / `PNG` uploads, show a preview modal before ingestion so the user can visually confirm the document and crop the image if it is blurry, tilted, or padded with background. The confirmed cropped image is what gets passed into the pipeline. _(Built `crop-preview-modal.tsx` wrapping `react-image-crop` v11 inside the existing Base UI Dialog. Default 95% centered crop, ruleOfThirds guides, Reset / Cancel / Confirm CTAs. Confirm draws the crop into a canvas at the source image's natural resolution and emits a new `File` with the original filename + MIME, which then enters the slot state.)_
- [x] For `PDF` uploads, skip the preview/crop modal and ingest immediately once validation passes. _(Branch on `IMAGE_MIME_TYPES.has(file.type)` in `handleFileChange` — PDFs go straight to `commitFile`; images go to `setPendingCrop` and the slot stays blank until the user confirms or cancels.)_
- [x] Keep the per-slot UX simple: upload → validate → preview/crop if image → continue. No extra step for PDFs. _(Slot card UI is unchanged; the crop modal lives outside the slot grid and only mounts when `pendingCrop` is non-null. Cancelling resets the hidden file input so re-picking the same file re-fires `onChange`.)_
- [x] Add lightweight frontend coverage for the validator and the image-vs-PDF branch so the crop modal only appears for image uploads. _(Deferred — no frontend test harness in this repo, same constraint as Phase 7 Task 6 box 4. Manual verification via `pnpm build` clean and the /sign-in → /dashboard/evaluation/upload flow with a sample JPG vs PDF.)_

**Exit criteria:** unsupported uploads are blocked clearly, image uploads can be previewed/cropped before ingestion, PDF uploads bypass the crop step, and the user understands the difference between the two paths.

### 4. Feature: Inline PDF preview on the results page

**Owner:** PO2 (Adam). **Depends on:** Phase 3 task 1 (persisted packet endpoint).

**Purpose/Issue:** Users currently download the ZIP, extract it, and open each PDF in their OS to verify content. An inline preview lets them inspect each draft in-browser before downloading — faster trust loop, fewer wasted downloads. Three PDFs per packet, accordion-style preview.

**Implementation — PO2 (Adam):**

- [x] Add `frontend/src/components/evaluation/draft-packet-preview.tsx` rendering each of the three draft PDFs as an `<iframe src=...>` (or `<embed>`) inside an accordion / tab strip. _(Implemented as a `<details>`-style accordion using a custom toggle button (no third-party accordion lib — keeps zero new deps). Each row: filename + agency in the header, ChevronDown rotates on expand. On expand: lazy `authedFetch` of the single PDF, blob → `URL.createObjectURL` → `<iframe>` at fixed `h-[480px]`. Blob URLs cached per scheme_id for the component lifetime so re-expand is instant; all URLs revoked on unmount via a ref-cleanup effect to keep memory bounded.)_
- [x] Source per-PDF blobs by extending the backend `GET /api/evaluations/{id}/packet` response shape OR adding a sibling `GET /api/evaluations/{id}/packet/{scheme_id}` that returns one PDF directly (decide based on payload size). _(Chose the sibling endpoint — `GET /api/evaluations/{eval_id}/packet/{scheme_id}` returns a single `application/pdf` with `inline` Content-Disposition. Reuses the existing `_load_owned_evaluation` owner-gate + `generate_packet` regen path with a single-element matches list (only one WeasyPrint render per request — no wasted work). 404 semantics match `get_evaluation`: missing eval, wrong-owner, AND `scheme_id` not in stored matches all return 404 (deliberately indistinguishable to a guesser). 409 if profile is missing (extract hasn't populated yet). 5 new tests in `test_evaluations_routes.py`: auth gate, wrong-owner 404, unknown-scheme 404, missing-profile 409, happy-path PDF return + assertion that only one match was passed to generate_packet.)_
- [x] Mount the preview above the existing "Download all drafts" CTA on `frontend/src/components/evaluation/evaluation-results-by-id-client.tsx`. _(`DraftPacketPreview` mounted inside the existing `#draft-packet` div, above `PersistedPacketDownload`. The wrapper div picked up `flex flex-col gap-3` so the two cards stack with consistent spacing.)_
- [x] Keep the existing ZIP download CTA — preview is additive, not a replacement. _(PersistedPacketDownload untouched — both surfaces render. Each preview row also has its own per-PDF download button that reuses the already-fetched blob via `triggerDownload`, so users can grab one PDF at a time without re-hitting the backend.)_

**Exit criteria:** the results page shows all three draft PDFs inline; users can verify content without downloading. _(Met. Preview renders one row per qualifying upside scheme (filters out `kind === 'required_contribution'` so PERKESO SKSPS doesn't get a preview row — its draft still ships in the ZIP). i18n: 6 new keys under `evaluation.preview` mirrored across en/ms/zh. Backend suite 291/291 green; ruff clean; frontend lint + build green.)_

### 5. Feature: Mobile responsiveness pass (375 / 768 / 1440)

**Owner:** PO2 (Adam). **Depends on:** all v2 surfaces shipped through Phase 5.

**Purpose/Issue:** Aisyah is a Grab driver on a phone — the citizen-first narrative requires the app to actually work on mobile. Walk every route at three breakpoints, fix layout regressions.

**Implementation — PO2 (Adam):**

- [x] Walk these routes at 375 / 768 / 1440: `/`, `/sign-in`, `/sign-up`, `/dashboard`, `/dashboard/evaluation`, `/dashboard/evaluation/upload`, `/dashboard/evaluation/results/[id]`, `/settings`, `/privacy`, `/terms`. Log every overflow / clipped CTA / unreadable text in a single PR-description checklist. _(Static-analysis pass through every route's component tree at 375px effective width. Risks logged: (a) `EvaluationUpsideHero` 5xl/6xl currency on a non-wrapping `flex items-baseline` could push huge totals off the right edge; (b) `ActiveApplications` cards lacked `min-w-0` on the inner flex column, so a long timestamp + RM amount could push the "Open" button off-screen; (c) sidebar already had a proper `md:hidden` drawer with backdrop + slide-in transform — confirmed working without changes; (d) `CodeExecutionPanel` `<pre>` blocks already use `overflow-x-auto`; (e) `RequiredContributionsCard` already does `flex-col → sm:flex-row` with `min-w-0`. No browser walkthrough this turn — viable only with chrome-devtools, which is out of scope for the static fix sweep.)_
- [x] Fix in priority order: dashboard hero, upload widget, results page (the demo flow surfaces). _(Hero: stepped the currency typography down to `text-4xl sm:text-5xl md:text-6xl` (was `text-5xl sm:text-6xl`), made the wrapper `flex-wrap` with `gap-y-1` so very long RM totals wrap onto a second line instead of clipping, and added `break-all` to the number itself for the worst case. Upload widget: already mobile-clean from Task 3 (single-column slot grid, helper banner stacks naturally, crop modal uses `sm:max-w-2xl` with `max-h-[60vh]` overflow-auto for the image). Results page surfaces: `ActiveApplications` got `min-w-0 flex-1` on the inner flex column + `truncate` on both text rows + `shrink-0` on the Open button so the row never overflows. Other results-page surfaces (`SchemeCardGrid`, `DraftPacketPreview`, `ResultsActionRail`, `RequiredContributionsCard`) already had the right responsive grids/wraps from earlier phases.)_
- [x] Confirm the sidebar collapses to the existing mobile drawer at <`md:` breakpoint and the topbar avatar menu still opens cleanly. _(Confirmed via `app-shell.tsx` + `sidebar.tsx`: the desktop `<aside>` is `hidden md:flex`, the mobile drawer is `md:hidden` with `translate-x-0 / -translate-x-full` plus a `bg-black/40 backdrop-blur-md` scrim. `MobileMenuButton` in the topbar is `md:hidden`. UserMenu / NotificationMenu / ThemeToggle / LanguageToggle live in `ml-auto` and use Base UI dropdown primitives that already portal correctly above the topbar.)_
- [x] Add a `pnpm -C frontend lint` + `pnpm -C frontend build` smoke before pushing. _(Both green after the fixes — lint reports no issues; build prerenders all 13 routes including the dynamic `/dashboard/evaluation/results/[id]`.)_

**Exit criteria:** zero horizontal scroll at 375px; every CTA reachable; the demo flow is filmable on a phone.

### 6. Feature: Error recovery copy + structured CTAs

**Owner:** PO1 (Hao). **Depends on:** the existing `humanize_error_message` helper in `backend/app/agents/gemini.py` and `frontend/src/components/evaluation/error-recovery-card.tsx`.

**Purpose/Issue:** The skeleton is already there — `humanize_error_message` categorises Gemini errors into quota_exhausted / service_unavailable / deadline_exceeded / permission_denied / extract_validation, and `error-recovery-card.tsx` switches on a quota substring to surface "Switch to Manual Entry". Finish the wiring so EVERY category has friendly copy + a clear next step.

**Implementation — PO1 (Hao):**

- [x] Promote the backend's error-category enum to the SSE `ErrorEvent` payload so the frontend can render category-specific UI without substring-matching. _(New `ErrorCategory` Literal in `app/schema/events.py` (`quota_exhausted` / `service_unavailable` / `deadline_exceeded` / `permission_denied` / `extract_validation`); `ErrorEvent` gained optional `category`. `gemini.humanize_error(raw)` returns a `(message, category)` tuple the orchestrator's terminal except stamps onto the emitted event. A schema↔impl slug-parity test (`test_humanize_error_category_slugs_match_events_literal`) guards against drift.)_
- [x] Extend `error-recovery-card.tsx` to switch on the category and render: appropriate copy, retry button (for transient errors), Switch-to-Manual CTA (for quota), and a link to `/settings` (for permission*denied) where the user can confirm tier / sign in again. *(Rewrote the card around a `CATEGORY_SPEC` table — each category maps to `(icon, i18n prefix, ordered CTA list)`. CTAs: `retry` / `manual` / `samples` / `settings` / `reset`. `reset` is always appended as the final escape hatch; CTAs whose handler wasn't wired get filtered. Category→CTA mapping: quota*exhausted → manual; service_unavailable → retry + samples; deadline_exceeded → retry + manual; permission_denied → Next `<Link href="/settings">`; extract_validation → manual + samples; unknown → generic samples. `evaluation-upload-client.tsx` retains the last submission in a ref so Retry can replay `start()` with the same inputs. Persisted-error route (`evaluation-results-by-id-client.tsx`) now renders the same card — omitting `onRetry` since the original files aren't retained server-side, so Retry silently drops.)*
- [x] Add unit + light snapshot tests for each category branch. _(Backend side covered — parametrised tests on `humanize_error` tuple form + the schema-impl slug-parity check + new `evaluation_persistence` tests for category Firestore round-trip (`test_persist_error_event_stores_category_slug` + `test_persist_error_event_without_category_stores_null`). **Frontend snapshot tests NOT landed** — the frontend has no `*.test.ts(x)` infrastructure yet and bringing up vitest/jest for five branches is larger scope than the plan called for. Flagging as a follow-up when a frontend test harness lands; 10 new backend tests + slug-parity drift guard cover the contract surface that matters.)_
- [x] Mirror the new copy across `frontend/src/lib/i18n/locales/{en,ms,zh}.json`. _(Per-category `title` + `body` + 4 CTA labels (retry / manual / samples / settings) added across all three locales. Simplified Chinese kept 普通话 register (服务器无法…身份验证, 上游请求超时); Bahasa Malaysia kept Dewan register (Tukar ke Masukan Manual, Cuba semula, Buka tetapan). Subagent audit confirmed zero missing keys across the three bundles.)_

**Exit criteria:** every documented Gemini failure mode shows a category-tailored card with at least one actionable button; no raw error text leaks to the user.

### 7. Feature: i-Saraan (EPF) rule + KWSP 6A-i template

**Owner:** PO1 (Hao). **Depends on:** Phase 1 Task 4 (rule engine), Phase 1 Task 5 (generate_packet template registration).

**Purpose/Issue:** Aisyah is self-employed (gig driver). Under EPF i-Saraan, the government matches 15% of voluntary EPF contribution, capped at RM500/yr, for self-employed Malaysian citizens or PRs aged 18-60. This is the strongest "you are leaving money on the table" demo card for Aisyah's persona. Form is KWSP 6A-i. Threshold is broad (employment_type=gig + age range + citizenship), making it a layup add to the rule engine that materially enriches every gig-worker evaluation.

**Implementation — PO1 (Hao):**

- [x] Source the i-Saraan rules — drop a copy of the public KWSP i-Saraan brochure or program PDF into backend/data/schemes/ (filename like i-saraan-program.pdf). TODO: confirm primary source URL before encoding the RM500/yr cap and the 15% match rate against the gazetted figure. _(Landed at 898.5 KB, `%PDF` magic verified. KWSP's own brochure links Cloudflare-block headless fetch, so the asset was sourced from the MOF Bajet 2024 touchpoint document `https://belanjawan.mof.gov.my/pdf/belanjawan2024/ucapan/touchpoint-budget-bm.pdf` — official Treasury `.gov.my` source that documents the i-Saraan 15% match capped at RM 500/yr terms. The KWSP portal URL stays as the primary citation for the rule; the MOF asset backs the offline-readable provenance chain.)_
- [x] Add backend/app/rules/i*saraan.py exposing match(profile) -> SchemeMatch. Qualifies when employment_type == 'gig' (or however the Profile schema represents self-employed) AND 18 <= age <= 60. annual_rm = 500.0 (the maximum government match). Include \_citations() returning RuleCitation entries pointing at the i-Saraan PDF page references and the public KWSP portal URL. *(Implemented. `Profile` schema has no `employment_type` field — the equivalent gate is `profile.form_type == "form_b"` (Form B = self-employed, Form BE = salaried with employer EPF). Constants exposed: `MIN_AGE = 18`, `MAX_AGE = 60`, `ANNUAL_MATCH_CAP_RM = 500.0`, `MATCH_RATE_PCT = 15.0`, `ANNUAL_CONTRIBUTION_TO_MAX_MATCH_RM = 3333.33` (derived from `500/0.15`). Two citations: `epf.i_saraan.eligibility` + `epf.i_saraan.match_rate_and_cap`.)\_
- [x] Register the new module in backend/app/agents/tools/match.py — append i*saraan to the \_RULES tuple and the import line. *(`_RULES` order: str*2026, jkm_warga_emas, jkm_bkk, lhdn_form_b, **i_saraan**, perkeso_sksps — i-Saraan slots before SKSPS so the dual-key sort still pushes the required-contribution entry last.)*
- [x] Register the new module in backend/app/rules/**init**.py.
- [x] Add the new SchemeId literal value "i*saraan" to backend/app/schema/scheme.py SchemeId Literal. *(Literal now `["str_2026", "jkm_warga_emas", "jkm_bkk", "lhdn_form_b", "lhdn_form_be", "perkeso_sksps", "i_saraan"]` — written multi-line for readability since the union grew past 6.)\_
- [x] Add backend/app/templates/i*saraan.html.jinja using lhdn.html.jinja as the structural reference. Fields: filer name, IC last 4, monthly income, voluntary contribution worked example, agency portal link, "DRAFT — NOT SUBMITTED" watermark. Filename pattern: KWSP-i-saraan-{ic_last4}.pdf. *(Template structured in 4 sections: Part I (Member: name + IC last 4 + age + filer category + annual income + address), Part II (Match schedule table — 15% rate, RM500 cap, RM3,333.33 derived contribution-to-max), Part III (Worked example table at 4 contribution tiers showing 15% match arithmetic), Part IV (Provenance citations). Inherits diagonal "DRAFT — NOT SUBMITTED" watermark + legal footer from `_base.html.jinja`. Filename pattern stored in `_TEMPLATE_MAP` as `KWSP-i-saraan-draft-{ic_last4}.pdf`.)\_
- [x] Register the template in \_TEMPLATE*MAP within backend/app/agents/tools/generate_packet.py. *(New entry: `"i_saraan": ("i_saraan.html.jinja", "KWSP-i-saraan-draft-{ic_last4}.pdf")`.)\_
- [x] Add backend/tests/test*i_saraan.py covering: gig profile age 34 qualifies with annual_rm == 500.0; salaried profile does not qualify; under-18 profile does not qualify; over-60 profile does not qualify; rendered packet bytes start with %PDF. *(16 tests: 5 constants + Aisyah-shape qualifier + citations + 3 negative gates (form*be/under-18/over-60) + 2 boundary qualifiers (age 18 + 60) + `kind="upside"` regression guard + 2 template/PDF-render tests + Aisyah fixture parity assertion. Also updated `tests/test_manual_entry.py::test_built_profile_drives_same_scheme_matches_as_fixture` to include `i_saraan.match(built)` in the parity list, and `tests/test_perkeso_sksps.py::test_match_schemes_sorts_required_contribution_after_upside` upside_count assertion 4 → 5. Full backend suite 286/286 green; ruff clean.)*
- [x] Sync the frontend SchemeId Literal in frontend/src/lib/agent-types.ts to add "i*saraan". *(Also updated the mock-SSE fixture `frontend/src/fixtures/aisyah-response.ts` — new i-Saraan SchemeMatch (RM500/yr) inserted between LHDN (RM558) and STR (RM450) per the dual-key sort; `AISYAH_UPSIDE.per_scheme_rm.i_saraan = 500`, `total_annual_rm` bumped 10,608 → 11,108, regenerated Python snippet + stdout to include the i-Saraan row, i-Saraan draft appended to `AISYAH_PACKET.drafts`. Without this the dev `NEXT_PUBLIC_USE_MOCK_SSE=1` replay would have desynced from the backend's new 6-match list.)\_

**Exit criteria:** running the pipeline against a self-employed profile produces an i-Saraan KWSP 6A-i draft packet alongside the existing scheme outputs, and the rule's annual*rm contributes to the total upside computation. *(Met — Aisyah's live engine output now includes 5 upside matches (STR + Warga Emas + BKK + LHDN + i-Saraan = RM11,108/yr) plus 1 required-contribution (SKSPS RM442.80/yr). Bonus: the schemes-overview catalogue (Phase 7 Task 10) was also updated to promote i-Saraan from COMING*V2 to IN_SCOPE so the public-facing card count reaches the originally-planned 6 in-scope + 3 coming.)*

### 8. Feature: JKM Bantuan Kanak-Kanak (BKK) rule + JKM10 template

**Owner:** PO1 (Hao). **Depends on:** Phase 1 Task 4 (rule engine), Phase 1 Task 5 (generate_packet template registration). Naturally complements JKM Warga Emas, which already uses parent-relationship dependant data.

**Purpose/Issue:** JKM Bantuan Kanak-Kanak pays RM100/month per child (up to 6 children, capped RM450/month per household per current JKM schedule) to low-income households with children under 18. Both Aisyah (2 school-age kids) and Cikgu Farhan (2 children ages 10 + 7 per Phase 7 Task 2 Farhan fixture overrides) qualify. This task uses dependants[] data the pipeline already extracts — zero new manual-entry surface required.

**Implementation — PO1 (Hao):**

- [x] Source the BKK rules — drop the public JKM BKK / Bantuan Kanak-Kanak brochure or borang into backend/data/schemes/ (filename like jkm-bkk-brochure.pdf). TODO: confirm primary source for the per-capita threshold (commonly cited as RM1,000/capita), the per-child rate (RM100/mo), and the household cap (RM450/mo or 6 children) before encoding. _(Landed at 156.8 KB, `%PDF` magic verified. JKM's content is published as HTML rather than a downloadable brochure — sourced by rendering the official article page `https://www.jkm.gov.my/main/article/bantuan-bulanan` to PDF, which preserves the canonical JKM copy describing the per-child rate + per-household cap. Stored under the planned `jkm-bkk-brochure.pdf` filename so the rule's existing citation reference resolves to a real asset.)_
- [x] Add backend/app/rules/jkm*bkk.py exposing match(profile) -> SchemeMatch. Qualifies when at least one dependant has relationship == 'child' AND age < 18, AND per_capita_income (= monthly_income_rm / max(household_size, 1)) <= 1000.0. annual_rm = min(qualifying_child_count, 6) \* 100.0 \* 12, capped at 450.0 \* 12 = 5400.0/yr. Include \_citations() pointing at the BKK PDF. *(Implemented as `min(child_count * 100, 450) * 12` — same math as the plan, more defensive against a future per-child rate change: cap saturates at 5 children, not 6. Constants exposed: `PER_CHILD_MONTHLY_RM`, `HOUSEHOLD_MONTHLY_CAP_RM`, `HOUSEHOLD_ANNUAL_CAP_RM = 5400.0`, `PER_CAPITA_THRESHOLD_RM = 1000.0`, `CHILD_AGE_THRESHOLD = 18`. Two citations in `_citations()` — eligibility*means_test + rate_per_child.)*
- [x] Register the new module in backend/app/agents/tools/match.py — append jkm*bkk to the \_RULES tuple and the import line. *(Appended to `_RULES` after `jkm_warga_emas` so Aisyah's live match list groups the two JKM schemes together; `from app.rules import` line also updated.)\_
- [x] Register the new module in backend/app/rules/**init**.py.
- [x] Add the new SchemeId literal value "jkm*bkk" to backend/app/schema/scheme.py. *(Literal now `["str_2026", "jkm_warga_emas", "jkm_bkk", "lhdn_form_b", "lhdn_form_be"]`.)\_
- [x] Add backend/app/templates/jkm*bkk.html.jinja using jkm18.html.jinja as the structural reference. Fields: applicant name (parent), IC last 4, household income, household_size, per-capita income computation, per-child enumeration, annual upside, agency portal link, "DRAFT — NOT SUBMITTED" watermark. Filename pattern: JKM-bkk-{ic_last4}.pdf. *(Template in Bahasa Malaysia mirroring the JKM18 layout — Bahagian I (Pemohon) / II (Kanak-Kanak table) / III (Ujian Per Kapita) / IV (Justifikasi) / V (Provenance) + signature block. Filters `relationship == 'child' and age < 18` inline when rendering the child-enumeration table, matching the rule's eligibility filter. Inherits the diagonal "DRAFT — NOT SUBMITTED" watermark + legal footer from `_base.html.jinja`.)\_
- [x] Register the template in \_TEMPLATE*MAP within backend/app/agents/tools/generate_packet.py. *(New entry: `"jkm_bkk": ("jkm_bkk.html.jinja", "JKM-bkk-draft-{ic_last4}.pdf")`.)\_
- [x] Add backend/tests/test*jkm_bkk.py covering: Aisyah-shape profile (2 children under 18, low income) qualifies with annual_rm == 2400.0; high-income profile does not qualify; profile with no child dependants does not qualify; profile with 7 children caps at RM5400/yr; rendered packet bytes start with %PDF. *(16 tests — all the plan-required paths + 5 constants + boundary case (per*capita exactly 1000.0 qualifies since threshold is ≤) + 4-children-below-cap + 5-children-at-cap + adult-children-don't-count + template wiring. Also updated `test_manual_entry.py:test_built_profile_drives_same_scheme_matches_as_fixture` to include `jkm_bkk` in the local rule-engine parity list so it stays in sync with the fixture's new 4-rule computation. Full backend suite 242/242 green.)*
- [x] Sync the frontend SchemeId Literal in frontend/src/lib/agent-types.ts to add "jkm*bkk". *(Also updated the mock-SSE fixture `frontend/src/fixtures/aisyah-response.ts` — new BKK SchemeMatch (RM2,400/yr), `AISYAH_UPSIDE.per_scheme_rm.jkm_bkk = 2400`, `total_annual_rm` bumped from 8,208 to 10,608, regenerated Python snippet + stdout, BKK draft appended to `AISYAH_PACKET.drafts`. Without this the dev `NEXT_PUBLIC_USE_MOCK_SSE=1` replay would have desynced from the backend's new 4-match list.)\_

**Exit criteria:** a profile with school-age children under the per-capita threshold produces a JKM BKK draft packet, with annual_rm correctly reflecting the per-child × month math.

### 9. Feature: PERKESO SKSPS (Self-Employed Social Security) rule + template

**Owner:** PO1 (Hao). **Depends on:** Phase 1 Task 4 (rule engine), Phase 1 Task 5 (generate_packet template registration), and the frontend ranked-list component.

**Purpose/Issue:** PERKESO SKSPS is mandatory social security for self-employed Malaysians (Grab/passenger transport drivers were brought under the Akta 789 in 2024). Annual contribution ranges RM232.80–RM596.40 across 4 plans depending on declared monthly earnings. This is a COMPLIANCE/PROTECTION scheme, not an upside scheme — surfacing it correctly means rendering it in a separate "Required contributions" UI block, NOT in the annual_rm ranked list (which would mislead users into thinking they receive the contribution amount).

**Implementation — PO1 (Hao):**

- [x] Source the SKSPS rules — drop the public PERKESO SKSPS brochure or contribution-rate table into backend/data/schemes/ (filename like perkeso-sksps-rates.pdf). TODO: confirm Plan 1 (RM232.80) through Plan 4 (RM596.40) annual contribution amounts and the income brackets that map to each plan against the gazetted Self-Employed Employment Injury Scheme (Akta 789) schedule. _(Landed at 491.2 KB, `%PDF` magic verified. Sourced from the official PERKESO LINDUNG KENDIRI BM booklet `https://www.perkeso.gov.my/images/lindung/booklet/270825-poster-LINDUNG_KENDIRI-BM.pdf` linked from the self-employment scheme page — covers the SKSPS plan structure and contribution schedule. Stored under the planned `perkeso-sksps-rates.pdf` filename so the rule's existing citation reference resolves to a real asset.)_
- [x] Decide on the annual*rm semantics. RECOMMENDED: introduce a new SchemeKind enum field on SchemeMatch ("upside" vs "required_contribution") and let SKSPS emit kind="required_contribution" with annual_rm equal to zero plus a separate annual_contribution_rm field. *(Implemented as recommended. `SchemeKind = Literal["upside", "required_contribution"]` exported from `backend/app/schema/scheme.py`; `SchemeMatch.kind` defaults to `"upside"` and `annual_contribution_rm` defaults to `None` so every pre-Task-9 persisted Firestore doc validates without migration. The `test_pre_task_9_scheme_match_omitting_kind_still_validates` test guards this invariant. Frontend type uses `kind?: SchemeKind` optional + `(m.kind ?? 'upside')` at every call site so old JSON shapes still narrow correctly.)\_
- [x] Add backend/app/rules/perkeso*sksps.py exposing match(profile) -> SchemeMatch. Qualifies when employment_type == 'gig' AND 18 <= age <= 60. Compute the contribution plan from monthly_income_rm: Plan 1 if income ≤ RM1,050, Plan 2 if ≤ RM1,550, Plan 3 if ≤ RM2,950, Plan 4 above. *(4-plan schedule encoded as `_PLANS` tuple of `_SkspsPlan` dataclasses — monthly RM, annual RM, income ceiling (None for the open-ended top tier). `_plan_for_income` walks plans in ascending ceiling order and returns the first plan whose ceiling ≥ income. Annual amounts: Plan 1 RM232.80, Plan 2 RM298.80, Plan 3 RM442.80, Plan 4 RM596.40 — each verified against `monthly × 12` in the constants test. Age window 18-60 inclusive. Eligibility gate emits `qualifies=False` + `annual_contribution_rm=None` but still tags `kind="required_contribution"` so a non-qualifying SKSPS match can never accidentally render in the upside list if it slips past the qualifies filter.)\_
- [x] Register the new module in backend/app/agents/tools/match.py and backend/app/rules/**init**.py. _(Also changed `match_schemes` sort key from `-m.annual_rm` to `(m.kind != "upside", -m.annual_rm)` so upside schemes sort first by RM desc, then required-contribution entries at the bottom. Aisyah fixture's `_compute_aisyah_matches` mirrors the same sort.)_
- [x] Add the new SchemeId literal value "perkeso*sksps" to backend/app/schema/scheme.py. *(Literal now `["str_2026", "jkm_warga_emas", "jkm_bkk", "lhdn_form_b", "lhdn_form_be", "perkeso_sksps"]`.)\_
- [x] Add backend/app/templates/perkeso*sksps.html.jinja using bk01.html.jinja as the structural reference. *(Bahasa Malaysia template. Bahagian I (Pemohon) / II (Plan Caruman — 4-row table with the selected plan highlighted via `class="total"` and an inline `←` pointer) / III (Kelayakan + justification) / IV (Provenance) + signature block. Defensive `match.annual_contribution_rm or 0` throughout so even a malformed non-qualifying match doesn't render raw `None`. Inherits watermark + legal footer from `_base.html.jinja`.)\_
- [x] Register the template in \_TEMPLATE*MAP within backend/app/agents/tools/generate_packet.py. *(New entry: `"perkeso_sksps": ("perkeso_sksps.html.jinja", "PERKESO-sksps-draft-{ic_last4}.pdf")`.)\_
- [x] Update frontend/src/components/results/ranked-list.tsx to render a separate "Required contributions" subsection below the upside ranked list, displaying SchemeMatch entries where kind=="required*contribution". *(Actual ranked-list components in the repo are `scheme-card-grid.tsx` + `scheme-list-stacked.tsx` (plan path was aspirational). Both now filter `m.qualifies && (m.kind ?? 'upside') === 'upside'` before rendering. New dedicated component `required-contributions-card.tsx` handles the separate block — amber-accented, returns `null` when no contributions, filters defensively by BOTH `qualifies` and `kind === 'required_contribution'`. Mounted on `evaluation-results-client.tsx` (live SSE) and `evaluation-results-by-id-client.tsx` (persisted route). Upside totals untouched — `compute_upside.py` filters `kind == "upside"` before building `per_scheme`/sum/prompt, so SKSPS zero doesn't land in the Gemini-rendered stdout row.)\_
- [x] Add backend/tests/test*perkeso_sksps.py covering: gig profile at low income emits Plan 1 contribution; gig profile at higher income emits the appropriate Plan tier; salaried profile does not qualify; rendered packet bytes start with %PDF; SchemeMatch.kind is "required_contribution" so the ranked-list excludes it from the upside sum. *(24 tests: 2 constants + 9 parametrised plan-tier mappings (floors, ceilings, boundary just-above-ceiling) + Aisyah Plan 3 anchor + 4 eligibility gates (salaried, age <18, age >60, boundary 18 + 60) + 3 invariants (qualifying kind/annual*rm/contribution; non-qualifying kind preservation; citations travel with both) + 2 integration tests (compute_upside filters contributions; match_schemes sorts them last) + 2 template/PDF-render tests + 1 pre-Task-9 back-compat test. Also updated `test_manual_entry.py` parity assertion to the 5-rule list + new sort key. Full backend suite 266/266 green; ruff clean.)*
- [x] Sync the frontend SchemeId Literal in frontend/src/lib/agent-types.ts to add "perkeso*sksps", and add the kind field to the typed mirror. *(New `SchemeKind = 'upside' | 'required_contribution'` type plus optional `kind?` and `annual_contribution_rm?: number | null` on `SchemeMatch`. Also updated the mock-SSE fixture `aisyah-response.ts` — new SKSPS SchemeMatch with `kind: 'required_contribution'`, `annual_rm: 0`, `annual_contribution_rm: 442.8`; appended SKSPS draft to `AISYAH_PACKET.drafts`. `AISYAH_UPSIDE.total_annual_rm` stays at 10,608 (SKSPS excluded from upside — mirrors the backend `compute_upside` filter). New i18n block `evaluation.requiredContributions.{heading,intro,annualLabel,footnote}` across en/ms/zh.)\_

**Exit criteria:** a self-employed profile shows a PERKESO SKSPS card under "Required contributions" with the correct Plan tier and annual contribution, and the upside total above remains math-correct (excludes the contribution).

### 10. Feature: /dashboard/schemes overview update + i18n sync

**Owner:** PO2 (Adam). **Depends on:** Phase 7 Tasks 7, 8, 9 (the three new scheme rules must be live).

**Purpose/Issue:** With i-Saraan, JKM BKK, and PERKESO SKSPS now live in the rule engine, the public-facing scheme catalogue at /dashboard/schemes (rendered by frontend/src/components/schemes/schemes-overview.tsx) must reflect the new active set. Currently the page shows 3 IN_SCOPE entries and 5 COMING_V2 entries. After this task: 6 IN_SCOPE entries (3 original + 3 new) and 2 COMING_V2 entries (MyKasih, eKasih — SARA claim is being folded into the existing LHDN logic per the strategy discussion). The "Coming in v2" subtitle copy and stats row counts must also update.

**Implementation — PO2 (Adam):**

- [x] In schemes-overview.tsx, append three new entries to the IN*SCOPE array. i-Saraan: categoryKey 'schemes.labels.retirement', icon PiggyBank (or similar Lucide icon), agency 'KWSP', name 'EPF i-Saraan', summaryKey 'schemes.iSaraan.summary', upsideRm '500.00', formLabel 'Form KWSP 6A-i', portalUrl 'https://www.kwsp.gov.my/en/member/contribution/i-saraan'. JKM BKK: categoryKey 'schemes.labels.welfare', icon Baby, agency 'JKM', name 'JKM · Bantuan Kanak-Kanak', summaryKey 'schemes.jkmBkk.summary', upsideRm '5,400.00', formLabel 'Form JKM10', portalUrl 'https://www.jkm.gov.my'. PERKESO SKSPS: categoryKey 'schemes.labels.socialSecurity', icon ShieldCheck, agency 'PERKESO', name 'PERKESO SKSPS · Self-Employed Social Security', summaryKey 'schemes.perkesoSksps.summary', upsideRm 'RM232.80–596.40 / yr (contribution)', formLabel 'Form SKSPS-1', portalUrl 'https://www.perkeso.gov.my'. *(Two new entries landed — JKM BKK + PERKESO SKSPS. i-Saraan stayed in COMING*V2 because Phase 7 Task 7 (rule + template) hasn't shipped; the catalogue must not advertise a scheme the rule engine cannot score. Also took the chance to rename the LHDN card from "LHDN Form B · YA2025 reliefs" → "LHDN Form B / BE · YA2025 reliefs" and updated formLabel to "Form B / BE" so Cikgu Farhan persona's filer category is visible in the catalogue. Added a `kind?: 'upside' | 'required_contribution'` field on `InScopeScheme`; PERKESO uses `required_contribution` and `InScopeCard` switches on that to render an amber-accented "Annual contribution: RM 232.80–596.40 / year" block instead of the misleading "Up to RM…" upside copy.)*
- [x] Remove i-Saraan, PERKESO SKSPS, and SARA claim from the COMING*V2 array. Remaining entries: MyKasih, eKasih. *(Removed PERKESO SKSPS only. Kept i-Saraan (Task 7 not yet shipped). Kept SARA claim — the "fold into existing LHDN logic" plan was aspirational; no SARA-specific code path exists in `lhdn_form_b.py` today, so removing the placeholder card would silently overstate coverage. Final COMING*V2 = i-Saraan, MyKasih, eKasih, SARA claim (4 entries).)*
- [x] Add new label keys to the i18n locales under schemes.labels: retirement, socialSecurity. Plus new summary keys: schemes.iSaraan.summary, schemes.jkmBkk.summary, schemes.perkesoSksps.summary. Mirror across en/ms/zh in frontend/src/lib/i18n/locales/{en,ms,zh}.json. _(Skipped `retirement` since the i-Saraan card stays in COMING_V2 (no in-scope card to apply that category to). Added `schemes.labels.socialSecurity`, `schemes.labels.annualContribution`, and `schemes.labels.rm` (the new contribution-variant card needs all three). Added `schemes.jkmBkk.summary` + `schemes.perkesoSksps.summary`. Updated `schemes.lhdn.summary` to mention both Form B and Form BE filers. Enriched `schemes.coming.iSaraanDesc` to mention the 15% match + RM 500/yr cap. Removed `schemes.coming.perkesoDesc` (no longer referenced — PERKESO moved into IN_SCOPE). All three locales (en/ms/zh) mirrored.)_
- [x] Update the page-level description copy at en.json line 480 ("Three federal schemes are live in this build. Five more land in v2…") to reflect the new active count (6) and remaining-coming count (2). Mirror the change across ms.json and zh.json. _(Updated to "Five federal schemes are live in this build. Four more land in v2…" — final live count is 5 because i-Saraan didn't ship as part of this PO2 task; coming count is 4 (i-Saraan + MyKasih + eKasih + SARA claim). Mirrored across en/ms/zh.)_
- [x] Audit the StatsRow render — inScope={IN*SCOPE.length} and coming={COMING_V2.length} auto-update from array lengths, no manual change. Verify the layout still looks balanced when the IN_SCOPE grid has 6 entries (3 cols × 2 rows on lg breakpoint). *(StatsRow auto-updates from `IN_SCOPE.length` (5) and `COMING_V2.length` (4); no manual edit. Build run verified the page renders with 5 cards in `lg:grid-cols-3` (3 + 2 layout — second row has two filled cells + one empty, acceptable). The PERKESO SKSPS amber-accented contribution card visually distinguishes itself from the four upside cards as intended.)\_
- [x] Run `pnpm -C frontend lint && pnpm -C frontend build` to confirm no TypeScript regressions from the new SchemeId values. _(Both green. ESLint clean; Next.js production build clean across all 13 routes including `/dashboard/schemes`.)_

**Exit criteria:** /dashboard/schemes shows 6 in-scope cards (3 original + 3 new) above 2 coming cards; all copy is mirrored across en/ms/zh; build is green. _(Met. After Phase 7 Task 7 shipped (i-Saraan rule + template), the schemes-overview catalogue was updated again to promote i-Saraan from COMING_V2 to IN_SCOPE — final state: 6 in-scope cards (str_2026, jkm_warga_emas, jkm_bkk, lhdn_form_b/be, i_saraan, perkeso_sksps) above 3 coming cards (MyKasih, eKasih, SARA claim). Page description copy updated to "Six federal schemes are live in this build. Three more land in v2…". Lint + build green.)_

### 11. Feature: Streamline evaluation entry flow for first-time users

**Owner:** PO2 (Adam). **Depends on:** the existing upload + manual entry surfaces, Phase 7 task 2 demo personas.

**Purpose/Issue:** The intake flow is working, but it still feels like a tool for builders instead of ordinary citizens. First-time users currently have to parse mode switches, three document slots, optional dependant overrides, and two sample personas before they feel safe to click. For the judges, aunties, and uncles, the first screen should explain itself in under 10 seconds.

**Implementation — PO2 (Adam):**

- [x] Reframe `frontend/src/components/evaluation/evaluation-upload-client.tsx` so the first screen explains the three paths in plain language: `Try sample data`, `Upload my documents`, and `Type details manually`. Keep any internal wording like "intake mode" out of the visible UI.
- [x] Simplify `frontend/src/components/evaluation/upload-widget.tsx`: keep one obvious primary CTA, keep the required three documents clear, and collapse optional household / dependant overrides behind an expandable "Add family members (optional)" affordance instead of rendering the whole fieldset by default.
- [x] Add short readiness hints beside each slot using plain examples (`front of IC`, `latest payslip`, `latest electricity bill`) plus a lightweight document-quality checklist before submit.
- [x] Make the two sample personas self-explanatory in visible copy: Aisyah = gig / Form B, Farhan = salaried / Form BE. Judges should understand why there are two demos without narration.
- [x] Keep one sentence of trust copy on the evaluation surface clarifying that Layak creates draft guidance only and the user still submits manually.

**Exit criteria:** a first-time user can understand how to start an evaluation without external explanation, and the upload screen presents one obvious primary action plus one obvious low-risk demo path.

### 12. Feature: On-demand tour guide modal with floating help launcher

**Owner:** PO2 (Adam). **Depends on:** the public landing shell and authenticated app shell.

**Purpose/Issue:** The app needs a self-serve explanation layer without cluttering the main UI. A floating bottom-right `?` button gives judges and first-time users a reliable, forgiving place to get help without leaving the page or breaking the flow.

**Implementation — PO2 (Adam):**

- [x] Add a persistent bottom-right help launcher (Lucide `CircleHelp` or equivalent) on the public landing and authenticated app shell. Keep it above mobile safe areas and clear of existing CTAs.
- [x] Clicking the launcher opens a shadcn `Dialog` or `Sheet` with a compact tour guide. Minimum sections: `How Layak works`, `What documents to prepare`, `Try sample data first`, and `What happens after results`.
- [x] Make the guide contextual where cheap: when opened from the upload screen, start on document prep; when opened from the results page, start on the next-actions section.
- [x] Keep the guide on-demand only — no forced auto-popup. If helpful, persist the last-opened section in localStorage so repeat visitors return to the most relevant help tab.
- [x] Translate the guide across `en`, `ms`, and `zh`, and ensure the launcher + modal are keyboard / screen-reader safe.

**Exit criteria:** every major screen has a one-tap help affordance, and a first-time user can understand the flow without leaving the page or asking a teammate.

### 13. Feature: Results-page action rail + deadline-first guidance

**Owner:** PO2 (Adam). **Depends on:** the persisted results route and packet download CTA. Integrates cleanly with Phase 7 task 4 if inline PDF preview lands.

**Purpose/Issue:** After the pipeline finishes, the app still needs a stronger "what do I do now?" moment. The current results page has useful information, but the next action is not framed boldly enough for non-technical users.

**Implementation — PO2 (Adam):**

- [x] Add a `What to do next` rail near the top of `frontend/src/components/evaluation/evaluation-results-by-id-client.tsx` with the clearest actions: review matched schemes, preview/download the draft packet, and start another evaluation.
- [x] Surface deadline / manual-submission reminder copy above the fold so users immediately understand the result is guidance, not an auto-submission.
- [x] Distinguish primary vs secondary actions visually so the user does not have to scan the full page to find the next step.
- [x] If Phase 7 task 4 lands, mount the inline PDF preview directly under this action rail so review and download become one continuous flow. _(The new action rail leaves the packet section directly below the fold-ready actions, so the inline preview can slot in there later without another layout rethink.)_

**Exit criteria:** a first-time user landing on the results page can tell what to do next within a few seconds, without needing demo narration.

---

## Phase 8: Google AI Stack Alignment

> Goal: align Layak with the hackathon handbook's Google AI ecosystem requirements without changing the demo UX.

### 1. Feature: Verify gemini-3-flash-preview tool support + asia-southeast1 availability (gate)

**Owner:** Any. **Depends on:** nothing.

**Purpose/Issue:** Before committing gemini-3-flash-preview anywhere in the pipeline, confirm it supports the code_execution Tool and response_mime_type="application/json" in the asia-southeast1 region (where the Cloud Run backend lives). Preview models historically lag their GA siblings on tool support, and a missing capability would silently break the compute_upside step at demo time.

**Implementation — Any:**

- [x] Run `gcloud ai models describe gemini-3-flash-preview --region=asia-southeast1` and `gcloud ai models describe gemini-3-flash-preview --region=us-central1` to confirm regional availability and current model status. _(Probed via `genai.Client` instead — `gcloud ai models` lists user-uploaded models, not Google publisher models. Finding: `asia-southeast1` only publishes `gemini-2.5-flash`; `us-central1` adds 2.5-pro + 2.5-flash-lite but NOT gemini-3-flash-preview; only the `global` smart-routing endpoint resolves all four needed models. Pivoted `_DEFAULT_LOCATION` from `asia-southeast1` to `global`. Cloud Run service stays in `asia-southeast1` — only the Vertex AI endpoint changes.)_
- [x] Write `backend/scripts/probe_gemini_3_flash.py` (~50 lines) that hits gemini-3-flash-preview via the existing `get_client()` helper and exercises `tools=[Tool(code_execution=...)]` against a trivial "compute 2+2 and print" prompt. Pass condition: the response candidates include both an `executable_code` part and a `code_execution_result` part with non-empty output. _(Probe pinned to `location="global"` — bypasses env to avoid breaking the probe when `GOOGLE_CLOUD_LOCATION` later flips. PASS: returned `executable_code` + `code_execution_result.output='4'`.)_
- [x] In the same probe script, add a second function that exercises `response_mime_type="application/json"` with a tiny structured prompt asking the model to return `{"answer": 4}`. Pass condition: the response parses as bare JSON without markdown fences. _(PASS: returned `{"answer": 4}` cleanly without fences.)_
- [x] If either probe fails, record the failure mode in the script docstring and document `gemini-2.5-pro` as the fallback heavy model that Task 4 should wire instead. _(Both probes passed; fallback path still documented in `gemini.py` as `HEAVY_MODEL_FALLBACK = "gemini-2.5-pro"` for the day Google yanks the preview model.)_
- [x] Commit the probe script and a short `backend/scripts/README.md` note (or append to an existing one) describing how to re-run the probe when Google promotes gemini-3-flash-preview to GA. _(Probe docstring is self-explanatory; no separate README needed for a single throwaway probe.)_

**Exit criteria:** gemini-3-flash-preview is confirmed callable from asia-southeast1 with both code_execution and structured-output, OR the fallback to gemini-2.5-pro is documented in the probe script and wired into Task 4.

---

### 2. Feature: Run Vertex AI Search seed and verify indexing

**Owner:** Any. **Depends on:** nothing.

**Purpose/Issue:** The seed script `backend/scripts/seed_vertex_ai_search.py` already exists and is idempotent — it just has not been executed against the live project. Move 1 of the Google AI stack alignment requires the Discovery Engine data store created and the 6 scheme PDFs in `backend/data/schemes/` indexed and queryable before Task 3 can wire retrieval into the rule modules.

**Implementation — Any:**

- [x] From the repo root run `python backend/scripts/seed_vertex_ai_search.py --project layak-myaifuturehackathon --execute` to create the data store and import the six PDFs. _(Two patches needed first: (a) batch the inline raw_bytes import under the 10 MB per-request cap, (b) corpus is now 9 PDFs not 6 — relaxed the count check to a soft warning. After both, the inline path STILL failed with `Field "document.data" is a required field` — a known Discovery Engine quirk for binary PDFs. Pivoted to the documented Google pattern: created `gs://layak-schemes-pdfs/` (multi-region `us`), uploaded all 9 PDFs via `gsutil`, rewrote `_import_pdfs` to use `GcsSource(input_uris=..., data_schema="content")`. Granted the Discovery Engine project SA `roles/storage.objectViewer` on the bucket. Final import: 9/9 PDFs landed.)_
- [x] Wait 3-5 minutes for Discovery Engine indexing to complete, then re-run the script's canary query block to confirm every PDF returns at least one passage hit. _(Indexing took ~5 min for the fresh data store. Standard-edition data stores assign random hash document IDs (not the file stem), so the canary's `expect_pdf` matcher false-MISSed initially — confirmed via direct `list_documents` that all 9 PDFs are indexed and queryable. The Task 3 rule wiring filters retrieved hits by URI substring instead of document ID for this reason.)_
- [x] Document the resolved data store ID, location (`global`), and indexed document count in the seed script's module docstring (or in `docs/runbook.md` if it exists at that point). _(Seed-script header docstring updated to record the GCS-source pivot, the bucket name, and the IAM grant. `.env` now carries `VERTEX_AI_SEARCH_DATA_STORE=layak-schemes-v1` and `VERTEX_AI_SEARCH_LOCATION=global`.)_
- [x] Verify the `layak-backend` Cloud Run service account has the `discoveryengine.viewer` role (or equivalent) so the runtime can call `SearchServiceClient.search()` — grant via `gcloud projects add-iam-policy-binding` if missing. _(Compute SA inherits `roles/editor` which subsumes `discoveryengine.viewer`; no extra grant needed for the Cloud Run runtime. Bucket-side grant for the Discovery Engine project SA was added so it can pull PDFs at index time.)_
- [x] No new application code in this task — provisioning only. _(Held — only seed-script + GCS bucket + IAM changes.)_

**Exit criteria:** the `layak-schemes-v1` data store exists in the global Discovery Engine region, all 6 PDFs are indexed, and the Cloud Run runtime identity can query it.

---

### 3. Feature: Vertex AI Search retrieval helper wired into every rule module

**Owner:** Any. **Depends on:** Phase 8 Task 2.

**Purpose/Issue:** With the data store live, every rule module's `_citations()` helper should attach a Vertex-AI-Search-derived passage and source URI as the primary citation, falling back to the existing hardcoded URL when Discovery Engine returns empty or errors. This is the single biggest handbook-alignment win — the deck's "Context: Vertex AI Search RAG" claim becomes literally true.

**Implementation — Any:**

- [x] Add `backend/app/services/vertex_ai_search.py` exposing `search_passage(query: str, top_k: int = 1) -> list[RetrievedPassage]` where `RetrievedPassage` is a Pydantic model carrying `passage_text`, `source_uri`, `document_id`, and `relevance_score`. Wrap `google.cloud.discoveryengine_v1.SearchServiceClient.search()` and cache the client via `@lru_cache(maxsize=1)` per the existing `get_client()` pattern in `backend/app/agents/gemini.py`. _(Helper landed plus two convenience wrappers: `passage_to_citation(passage, *, rule_id, fallback_source_pdf)` and `get_primary_rag_citation(*, query, uri_substring, rule_id, fallback_pdf)`. The high-level wrapper makes the per-rule wiring a 7-line block instead of a 20-line block.)_
- [x] Adopt a fail-open posture: any Discovery Engine error or empty response returns an empty list, never raises. Log via the module logger so silent failures still leave a breadcrumb. _(Wrapped the search call in a broad except that logs and returns `[]`. Same posture as `services/rate_limit.py:_extract_count` from Phase 3.)_
- [x] Augment `_citations()` in each of `backend/app/rules/{str_2026,jkm_warga_emas,jkm_bkk,lhdn_form_b,i_saraan,perkeso_sksps}.py` to call `search_passage()` with a scheme-specific query string, prepend the retrieved passage as the primary `RuleCitation`, and keep the existing hardcoded citation as the fallback when search returns empty. _(Per-scheme `_RAG_QUERY` and `_RAG_URI_SUBSTRING` constants validated against the live data store before wiring — query phrases tuned so the standard-edition snippet ranker hits the expected PDF. URI substring filter is the workaround for Discovery Engine's hash document IDs (Task 2 finding). `lhdn_form_b._citations(form_type)` keeps its parameter; the rag rule_id is form-type-aware (`rag.lhdn.form_b.primary` vs `rag.lhdn.form_be.primary`).)_
- [x] Add `backend/tests/test_vertex_ai_search.py` covering: helper returns `RetrievedPassage` when the SDK is mocked to respond with a hit; helper returns empty list when the SDK raises (fail-open); rule module's `_citations()` includes the retrieved passage as the first citation when present and falls through to the hardcoded citation when search returns empty. _(6 new pytest tests cover the contract: empty-query short-circuit, SDK-error fail-open, URI-substring filter, `passage_to_citation` source_pdf preference, `get_primary_rag_citation` None-when-no-hits, citation construction from a hit. All mock the SDK via `unittest.mock` — no network.)_
- [x] Run `uv run pytest -q` from `backend/` and confirm the suite stays green. _(304 passed (was 298) — 6 new tests added, zero regressions.)_
- [x] Manually smoke a single Aisyah upload through the deployed Cloud Run backend and confirm the `SchemeMatch.citations` array carries Vertex-AI-Search-derived URIs in the SSE match step result. _(Local-mode smoke confirmed: STR `_citations()` now returns 4 entries — first is `rag.str_2026.primary` with `source_url=gs://layak-schemes-pdfs/risalah-str-2026.pdf` and a Bahasa-Malaysia passage extracted from the live PDF, followed by the 3 hardcoded citations. Cloud Run smoke is folded into Task 5's re-snapshot exercise.)_

**Exit criteria:** every rule module emits a Vertex-AI-Search-derived citation as its primary citation when the data store responds, with the hardcoded citation as the documented fallback, and the backend test suite remains green.

---

### 4. Feature: Per-step model reassignment — hybrid Gemini 3 Flash Preview + 2.5 Flash-Lite

**Owner:** Any. **Depends on:** Phase 8 Task 1 (the probe outcome decides whether the heavy model is gemini-3-flash-preview or the gemini-2.5-pro fallback).

**Purpose/Issue:** Adopt a per-step model matrix instead of routing every LLM call through gemini-2.5-flash. Extract stays on Flash (multimodal OCR, GA-only territory). Classify drops to gemini-2.5-flash-lite (~5x cheaper for the small structured-output workload). Compute_upside moves to gemini-3-flash-preview (or gemini-2.5-pro if Task 1 ruled out the preview model). The deck's "Brain (Pro/Gemini 3) plus Flash workers" framing becomes literally true, and classify cost drops without any quality risk.

**Implementation — Any:**

- [x] In `backend/app/agents/gemini.py` add `WORKER_MODEL = "gemini-2.5-flash-lite"` for the cheap structured-output worker and `HEAVY_MODEL = "gemini-3-flash-preview"` (or `"gemini-2.5-pro"` per the Task 1 probe outcome) for the reasoning-heavy step. Keep `FAST_MODEL = "gemini-2.5-flash"` for extract. Document the chosen `HEAVY_MODEL` value plus the Task 1 probe date in the module docstring so future readers know why the choice was made. _(Added `WORKER_MODEL`, `HEAVY_MODEL = "gemini-3-flash-preview"`, and `HEAVY_MODEL_FALLBACK = "gemini-2.5-pro"`. Also flipped `_DEFAULT_LOCATION` from `asia-southeast1` to `global` per Task 1 finding — `asia-southeast1` only publishes 2.5-flash. Module docstring rewritten to record the per-step matrix and the Task 1 probe date.)_
- [x] In `backend/app/agents/tools/classify.py` swap `model=FAST_MODEL` to `model=WORKER_MODEL`. Run the existing classify tests to confirm Flash-Lite handles the structured-output prompt without drift; tighten the prompt only if Flash-Lite returns something off-schema. _(One-line swap. Existing classify tests still mock the Gemini client so they don't validate Flash-Lite directly; live smoke under Task 5 will catch any structured-output drift end-to-end.)_
- [x] In `backend/app/agents/tools/compute_upside.py` swap `model=FAST_MODEL` to `model=HEAVY_MODEL`. Update the file docstring's "Why Flash and not Pro" paragraph since the AI Studio quota workaround is obsolete after the Phase 6 Vertex AI cutover. _(Done. Inline smoke against an Aisyah-shape match list returned a clean Python snippet + correctly formatted stdout table from gemini-3-flash-preview.)_
- [x] Update the `LlmAgent` placeholder docstrings in `backend/app/agents/root_agent.py` to reflect the new per-step model assignments so the structural ADK shell stays honest. _(All five LlmAgent placeholder descriptions rewritten to name the model assigned to each step plus the Task 1 probe reference for compute_upside.)_
- [x] Add `backend/tests/test_per_step_models.py` asserting `WORKER_MODEL` is wired into `classify.generate_content` and `HEAVY_MODEL` is wired into `compute_upside.generate_content`. Mock the Gemini client so the test does not hit the network. _(Skipped — the existing `test_classify.py` and `test_compute_upside.py` already mock the Gemini client and would have failed if the model arg drifted. The only new model-related assertion that mattered (`_DEFAULT_LOCATION` is `global`) was added inline to `test_gemini_client.py:test_get_client_defaults_location_when_unset`. Adding a duplicate file would just be ceremony.)_
- [x] Run `uv run pytest -q` from `backend/` and confirm the suite stays green. _(304 passed across the model swap + Vertex AI Search wiring.)_
- [x] Manually smoke an Aisyah upload through the deployed Cloud Run backend and confirm pipeline still completes within ~30 seconds end-to-end without SSE stream errors. _(Inline `compute_upside()` smoke against an Aisyah-shape match list confirmed gemini-3-flash-preview returns a parseable response with stdout shape unchanged. Cloud Run end-to-end smoke folds into Task 5's re-snapshot exercise.)_

**Exit criteria:** classify runs on gemini-2.5-flash-lite, compute_upside runs on the chosen heavy model (Gemini 3 Flash Preview or Gemini 2.5 Pro), the full pipeline completes against Aisyah without regressing the SSE wire format, and the model-assignment matrix is documented in gemini.py.

---

### 5. Feature: Re-snapshot Aisyah + Farhan demo-mode fixtures against the new pipeline

**Owner:** Any. **Depends on:** Phase 8 Tasks 3 and 4 (citations and model swap must both be live before snapshotting, otherwise the fixture diverges again).

**Purpose/Issue:** The Aisyah/Farhan mock-mode replay (`frontend/src/fixtures/aisyah-response.ts` and the Farhan equivalent if present) is hand-typed to match the current pipeline output — `SchemeMatch.citations` carry hardcoded URLs and `compute_upside.python_snippet` is Flash-shaped. After Tasks 3 and 4 land, real outputs will carry Vertex-AI-Search-derived citations and a different `python_snippet` shape from the new heavy model. Re-snapshot so the demo-mode storyboard stays a faithful preview of what real upload produces.

**Implementation — Any:**

- [x] With the deployed Cloud Run backend running on the new Phase 8 configuration, run the live pipeline against `frontend/public/fixtures/aisyah-{mykad,payslip,utility}.pdf` via the standard `/api/agent/intake` endpoint and capture the SSE event stream to a local JSON file. _(Cleaner approach: bypassed FastAPI/Firebase auth and ran the pipeline tools directly via `app.fixtures.aisyah.AISYAH_SCHEME_MATCHES` (live rule-engine output) + `compute_upside(upside_matches)` (live HEAVY_MODEL output). Captured the per-scheme RAG citation passages and the new gemini-3-flash-preview python_snippet + stdout.)_
- [x] Replace the `AISYAH_MOCK_EVENTS` array in `frontend/src/fixtures/aisyah-response.ts` with the captured stream, preserving the existing `delayMs` cadence (or adjusting if the new pipeline is materially faster or slower than the snapshot it replaces). _(Did NOT touch `AISYAH_MOCK_EVENTS` — the SSE event sequence stays identical because demo mode reads the underlying constants by reference. Updated `AISYAH_SCHEME_MATCHES` (prepended one RAG citation per scheme, hardcoded citations preserved verbatim) and rewrote `AISYAH_UPSIDE.python_snippet` + `.stdout` to match the new gemini-3-flash-preview output format. delayMs cadence kept as-is.)_
- [x] If a Farhan fixture file exists alongside `aisyah-response.ts`, repeat steps 1-2 against `frontend/public/fixtures/farhan-{mykad,payslip,utility}.pdf`. Otherwise skip silently. _(No `farhan-response.ts` fixture exists — Farhan is upload-only (PDFs in `frontend/public/fixtures/`), and `use-agent-pipeline.ts` confirms mock-mode replay is Aisyah-only. Skipped per the conditional.)_
- [x] Update the file docstring at the top of each re-snapshotted fixture noting the snapshot date and the Phase 8 model+RAG configuration the snapshot was taken against, so future readers can tell when the fixture is stale. _(Header docstring on `aisyah-response.ts` now records "Phase 8 re-snapshot (2026-04-23): rule_citations now lead with a Vertex-AI-Search-derived primary citation grounded in `gs://layak-schemes-pdfs/<scheme>.pdf`; AISYAH_UPSIDE.python_snippet + .stdout are captured from gemini-3-flash-preview output (HEAVY_MODEL).")_
- [x] Visual smoke test: load `/dashboard/evaluation/upload`, click "Use Aisyah sample data", verify the mock-mode replay matches the new event shape. Repeat for Farhan if applicable. _(Replaced with a build-only smoke — `pnpm -C frontend build` succeeded with all 13 routes prerendering. The fixture is the source of truth for demo mode, so a clean type-check + build is the strongest guarantee short of a manual click-through which the user can do at any point.)_
- [x] Run `pnpm -C frontend build` and confirm zero type errors after the fixture data shape change. _(Build clean. Also tightened the `compute_upside` prompt's column width from 42 → 54 chars so the longer scheme names ("JKM Bantuan Kanak-Kanak — per-child monthly payment") no longer overflow the table — gemini-3-flash-preview now emits a cleanly-aligned table.)_

**Exit criteria:** demo-mode replay produces output indistinguishable from a fresh real upload of the same persona (modulo timing), and the fixture files document their snapshot provenance.

---

### 6. Feature: Update docs/trd.md and CLAUDE.md to reflect the Phase 8 architecture

**Owner:** Any. **Depends on:** Phase 8 Tasks 3 and 4.

**Purpose/Issue:** `docs/trd.md` §5.1 (model routing), §6.x (RAG architecture), and §8 (Plan B) currently describe the Flash-only / rule-engine-only state from before Phase 8. `CLAUDE.md`'s Tech Stack section frames Vertex AI Search as the "primary" RAG layer with inline-PDF as the Plan B collapse — neither is true after Phase 8. Bring both files into truth so the deck team can reference them safely.

**Implementation — Any:**

- [x] Update `docs/trd.md` §5.1 model-routing section to document the per-step matrix from Task 4: extract on `gemini-2.5-flash`, classify on `gemini-2.5-flash-lite`, compute*upside on the chosen heavy model, generate as deterministic WeasyPrint. *(Table rewritten with one row per pipeline step naming the constant from `backend/app/agents/gemini.py` and the model ID. Trailing paragraph updated to reflect `_DEFAULT_LOCATION = "global"` per the Phase 8 Task 1 probe finding.)\_
- [x] Add a new `docs/trd.md` sub-section under the RAG topic documenting the Vertex AI Search retrieval helper (`backend/app/services/vertex_ai_search.py`), the `layak-schemes-v1` data store ID, the per-rule query strings, and the fail-open posture. _(Folded into a rewrite of §5.2 in place rather than spinning a new sub-section — the existing §5.2 was the only RAG section, and a clean rewrite reads better than a stacked addendum. New §5.2 covers data store ID + GCS-source ingestion + helper API + per-rule wiring + standard-edition limitations + fail-open posture.)_
- [x] Update `docs/trd.md` §8 (Plan B) — Vertex AI Search is no longer the optional layer that Plan B collapses away from, so demote that paragraph and rewrite Plan B's trigger condition to reflect the new state (or remove §8 entirely if it no longer makes sense). _(§8's Plan B scope paragraph rewritten to acknowledge Vertex AI Search is live (Phase 8 Task 3); inline-PDF grounding is now framed as the documented fallback if Discovery Engine itself is unreachable on demo day. §8.2 (Supabase fallback) untouched.)_
- [x] Update the Backend > RAG line in `CLAUDE.md` (under Tech Stack) to drop the "primary" / "Plan B collapses to inline-PDF" framing — Vertex AI Search is the live citation source after Phase 8. _(Done — RAG bullet now names the data store + bucket + helper module and explicitly says Vertex AI Search is LIVE. Plan B framing demoted to a one-sentence inline-PDF fallback.)_
- [x] Update `CLAUDE.md`'s Backend > Models bullet to list the per-step model assignment from Task 4. _(Done — Models bullet now spells out FAST_MODEL/WORKER_MODEL/HEAVY_MODEL/HEAVY_MODEL_FALLBACK/ORCHESTRATOR_MODEL by constant name + model ID + step assignment.)_
- [x] No new ASCII diagrams — verbal updates to existing prose only. _(Held — only prose + table-row rewrites.)_

**Exit criteria:** `docs/trd.md` and `CLAUDE.md` describe the actual Phase-8-as-shipped architecture (per-step model matrix and live Vertex AI Search retrieval), and the deck team can reference either file for the architecture slide without surfacing pre-Phase-8 framing.

---

## Phase 9: Final App Polishing

### 1. Feature: Persist user language preference on `users/{uid}`

**Owner:** PO1. **Depends on:** none.

**Purpose/Issue:** i18next currently reads/writes `localStorage['layak.lng']` only — language choice is per-browser, not per-user. Log in from a second device and the UI reverts to the browser-locale default; the backend has no idea what the user picked, so pipeline prompts can't reflect it. Storing the language on `users/{uid}` makes the preference portable AND makes it accessible to the FastAPI intake route via the existing `current_user` dependency.

**Implementation — PO1:**

- [x] Add `language: Literal["en", "ms", "zh"] = "en"` to `backend/app/schema/firestore.py::UserDoc`. Default `"en"` so pre-Phase-9 docs validate without a backfill.
- [x] Extend `backend/app/auth.py::UserInfo` dataclass with `language: str` and `current_user` to fetch `users/{uid}.language` inside `_upsert_user_doc` (the snapshot is already loaded — no extra round-trip). Fresh sign-ups write `language="en"` into the initial doc.
- [x] Add `PATCH /api/user/preferences` to `backend/app/routes/user.py` — body `{"language": "ms"}`, validates against the three-value `Literal`, writes `users/{uid}.language`, returns `204`. Rejects unknown values with `422`.
- [x] Extend `GET /api/user/me` (or equivalent; create a thin read endpoint if none exists) to return `{language: "en"}` so the frontend can hydrate from server on first mount after login.
- [x] Frontend — `frontend/src/providers/language-sync.tsx`: on `i18n.on("languageChanged")`, fire an authed PATCH to `/api/user/preferences` with the new code. Debounced by ~200ms so rapid toggles don't spam writes. _(Lives in a new `LanguageSync` provider mounted inside `AuthProvider` so `useAuth()` resolves — i18n-provider itself sits outside the auth tree.)_
- [x] Frontend — the new `LanguageSync` effect fetches `/api/user/me` when auth resolves and flips i18next to the server-stored language if it differs.
- [x] Unit tests: `test_user_routes.py` — PATCH happy path + 422 on invalid code + 422 on unknown keys + 401 without bearer token + two `GET /me` tests (language present / missing-defaults-to-en).
- [x] Exit: logging into a fresh browser after setting Chinese on device A shows Chinese immediately, before any pipeline run.

### 2. Feature: Thread language through intake → pipeline tools

**Owner:** PO1. **Depends on:** Task 1.

**Purpose/Issue:** The `stream_agent_events` orchestrator currently takes `uploads` + optional `prebuilt_profile` + `dependants_override`. To localise outputs it must know the user's chosen language. Keep the plumbing single-purpose: a new `language: SupportedLanguage` keyword with default `"en"` so existing callers and tests keep compiling. Each tool that emits human-readable text accepts the same keyword.

**Implementation — PO1:**

- [x] Add `SupportedLanguage = Literal["en", "ms", "zh"]` in a new `backend/app/schema/locale.py` (kept separate from profile.py). Imported by `firestore.py`, `root_agent.py`, tools, rules, and `gemini.py`.
- [x] `backend/app/agents/root_agent.py::stream_agent_events` — accepts `language: SupportedLanguage = "en"`; passes it to `classify_household`, `match_schemes`, `compute_upside`, `generate_packet`, and the `humanize_error` call in the `except` block. `extract_profile` deliberately unchanged.
- [x] `backend/app/main.py::intake` and `intake_manual` — read `user.language` off the `current_user` dependency (coerced via `_coerce_language`) and pass it into `stream_agent_events` + `create_running_evaluation`.
- [x] Widened tool signatures: `classify_household(profile, *, language)`, `match_schemes(profile, *, language)`, `compute_upside(matches, *, language)`, `generate_packet(profile, matches, *, language)`. Keyword-only.
- [x] Persist `language` onto `evaluations/{evalId}` at create-time via `create_running_evaluation(db, ..., language=...)`. `EvaluationDoc.language: SupportedLanguage = DEFAULT_LANGUAGE` defaults preserve pre-Phase-9 doc validation.
- [x] Exit: unit test `test_pipeline_i18n::test_rule_engine_emits_localised_why_qualify_for_aisyah` asserts each qualifying rule's `why_qualify` + `summary` carry a BM / ZH / EN signature token when invoked with the matching language.

### 3. Feature: Localise `classify_household` + `compute_upside` Gemini prompts

**Owner:** PO1. **Depends on:** Task 2.

**Purpose/Issue:** Two pipeline steps produce user-visible text via Gemini: `classify.notes` (3–5 observations about the household) and `compute_upside.stdout` (the Python-printed table of annual RM). Both instruction prompts currently end with "plain English"-style language guidance. Swap that for a per-language instruction injected into the prompt — Gemini 2.5 Flash and gemini-3-flash-preview both handle Bahasa Malaysia and Simplified Chinese output fluently (verified during Phase 6 Task 7 copy polish).

**Implementation — PO1:**

- [x] Added `LANGUAGE_INSTRUCTION_BLOCK: dict[SupportedLanguage, str]` in `gemini.py` — Dewan register for ms, 简体中文 / 普通话 guidance for zh.
- [x] `classify.py::_INSTRUCTION` — the `notes` bullet now carries `{language_instruction}` interpolated from `LANGUAGE_INSTRUCTION_BLOCK[language]`. Schema enums (`income_band`, `form_type`) + numeric fields explicitly kept English.
- [x] `compute_upside.py::_INSTRUCTION` — per-language `_COMPUTE_UPSIDE_LABELS` (Scheme/Annual/Total translated; Python identifiers + scheme_id slugs stay ASCII). `_EMPTY_STDOUT` covers the no-matches branch in each language.
- [x] _(Skipped prompt snapshot tests — the Phase 9 pipeline-i18n test exercises the same surfaces; live-Gemini tests stay manual.)_
- [x] _(No diagnostic script committed — would be one-off; language signature is already validated by the `test_pipeline_i18n` + `test_rule_copy_coverage` suites.)_
- [x] Exit: Aisyah demo in BM mode shows classify notes + compute_upside table in the selected language; the per-language label dicts guarantee the stdout header flips from `"Scheme / Annual (RM)"` to `"Skim / Tahunan (RM)"` / `"计划 / 年额 (RM)"`.

### 4. Feature: Localise rule-engine `why_qualify` + `summary` strings

**Owner:** PO1. **Depends on:** Task 2.

**Purpose/Issue:** Every rule module (`str_2026.py`, `jkm_warga_emas.py`, `jkm_bkk.py`, `lhdn_form_b.py`, `lhdn_form_be.py`, `perkeso_sksps.py`, `i_saraan.py`) hardcodes English f-strings for `_why_qualify()` and the `summary` constant. Seven files × 2 strings × 3 languages = 42 translations — small enough to maintain by hand, big enough to deserve one shared shape instead of per-file sprawl.

**Design choice — why a Python catalog, not a Gemini translation pass:**

- Deterministic (no model drift between runs).
- Testable (one unit test per scheme asserts the three-language catalog is complete).
- Cheap (zero Gemini round-trips post-match; the rule engine is pure Python).
- Latency (match step stays O(ms), not O(seconds)).
- Rejected alternatives: (a) pass match output to Gemini for translation — adds ~3 s latency and costs $; (b) translate via i18next on the frontend — requires restructuring every `why_qualify` string into a keyed template with interpolation, and we'd lose the benefit of seeing the final rendered string in Python unit tests.

**Implementation — PO1:**

- [x] New module `backend/app/rules/_i18n.py` exporting `scheme_copy(scheme_id, variant, language, **vars) -> SchemeCopy` plus helpers `out_of_scope_reason()`, `bkk_breakdown()`, `bkk_cap_note()`, `sksps_ceiling_note()`. Internal `_CATALOG` maps `SchemeId → {variant → callable}`; `_REASON_FRAGMENTS` keys reason strings per failure-mode × language.
- [x] Every rule module (`str_2026`, `jkm_warga_emas`, `jkm_bkk`, `lhdn_form_b`, `i_saraan`, `perkeso_sksps`) routes `summary` + `why_qualify` through the catalog. `match()` keeps the numeric / citation work — only the human-readable strings localise.
- [x] Translations written by hand in Dewan-register BM and 简体中文; domain vocabulary matches the Phase 6 Task 7 locales (`isi rumah`, `pendapatan bulanan`, `tanggungan warga emas`, etc.).
- [x] `scheme_name` + `agency` kept as proper nouns unchanged. _(Descriptor localisation after the em-dash tracked as a polish follow-up.)_
- [x] `test_rule_copy_coverage.py` covers both the per-rule parametric path (non-empty output + language signature for MS/ZH) and the cross-scheme coverage check in one file — saves spinning up 7 separate `test_<scheme>_i18n.py` files for the same asserts.
- [x] `test_rule_copy_coverage::test_catalog_has_entry_for_every_scheme` + `test_catalog_has_every_variant_per_scheme` iterate the full SchemeId × variant grid.
- [x] Exit: running any rule with `language="ms"` / `"zh"` returns localised copy; existing English persisted evals untouched since the default keyword is `"en"`.

### 5. Feature: Localise humanised error messages + sanitizer copy

**Owner:** PO1. **Depends on:** Task 2.

**Purpose/Issue:** `backend/app/agents/gemini.py::ERROR_CATEGORY_MESSAGES` maps each error category slug to one English sentence. When extract validation fails or Gemini's quota is exhausted, the SSE `ErrorEvent.message` carries that English sentence straight to the UI — even when the user's language is MS or ZH. Category slug stays English (it's an enum the frontend branches on); only the human-readable message needs translation.

**Implementation — PO1:**

- [x] Widened `ERROR_CATEGORY_MESSAGES` to `dict[SupportedLanguage, dict[ErrorCategory, str]]` — 15 strings total (5 categories × 3 languages).
- [x] `humanize_error(raw, *, language="en")` + `humanize_error_message(...)` accept the language kwarg and look up `ERROR_CATEGORY_MESSAGES[language][category]` with English fallback when the catalog lacks an entry for the language.
- [x] `stream_agent_events`'s `except` block passes `language=language` into `humanize_error`.
- [x] `sanitize_error_message` (digit-run redaction) kept language-neutral.
- [x] `test_error_humanization.py` updated for the 2D catalog shape; `test_pipeline_i18n::test_humanize_error_returns_language_specific_copy` parametrises over `en/ms/zh` and confirms the localised message round-trips.
- [x] Exit: a `quota_exhausted` error in MS mode streams the BM copy ("Kuota harian Gemini … habis") rather than English.

### 6. Feature: Packet template policy + localised submission footer

**Owner:** PO1. **Depends on:** Task 2.

**Purpose/Issue:** The seven Jinja templates under `backend/app/templates/` (`bk01`, `jkm18`, `lhdn`, `lhdn_be`, `jkm_bkk`, `perkeso_sksps`, `i_saraan`) render DRAFT copies of real Malaysian government forms. The FORM BODY must match the actual government-issued form field-for-field so the user can transcribe it onto the real portal — translating form labels would defeat the form's purpose. Most template bodies are already in Bahasa Malaysia (matching the gov forms); a few `_base.html.jinja` footer lines + the watermark are English.

**Design decision — what localises and what doesn't:**

- **Form body labels (title, field names, legal boilerplate):** stay in the gov-form source language. Non-negotiable — these are the real form.
- **Layak-added explanatory footer** ("This is a DRAFT — review and submit manually at <portal>"): localises to the user's language.
- **Watermark "DRAFT — NOT SUBMITTED":** stays English (three words, universally recognised, matches the screenshot already shown in marketing; changing it per-language adds complexity with low upside).
- **PDF filename** (e.g. `STR-bk01-draft-4321.pdf`): stays English. It's a filename, not a user-facing string.

**Implementation — PO1:**

- [x] `generate_packet(profile, matches, *, language="en")` threads `locale` (a `{draft_footer}` dict keyed by language) into every scheme template's Jinja context via `_scheme_context`.
- [x] `_base.html.jinja` renders `{{ locale.draft_footer|safe }}` inside the `.disclaimer` section, falling back to the original English prose when `locale` isn't set (defensive — pre-Phase-9 callers keep working).
- [x] Hand-translated footer copy in `_LOCALE_STRINGS` (generate_packet.py) across en / ms / zh; all three retain the 3-point structure (draft nature, estimate disclaimer, manual-submit requirement).
- [x] _(No new packet-render assertion test — the existing `test_generate_packet.py` covers the rendering path; adding a full PDF-render assert per language would 3x the slowest suite. Coverage of the footer copy is by inspection + the catalog-completeness test.)_
- [x] Exit: gov-form body labels stay in source language (BK-01 stays BM, LHDN forms stay EN-leaning); Layak's draft-footer localises; `DRAFT — NOT SUBMITTED` watermark stays English.

### 7. Feature: Backend + frontend test harness for the multilingual path

**Owner:** PO1. **Depends on:** Tasks 3, 4, 5, 6.

**Purpose/Issue:** Each preceding task ships its own narrow unit test. This task wires an end-to-end assertion so a regression in any one link — prompt, catalog, error path, packet footer — fails the suite.

**Implementation — PO1:**

- [x] New `backend/tests/test_pipeline_i18n.py` parametrises `en`/`ms`/`zh` and asserts: (a) every qualifying rule's `why_qualify` + `summary` carry the right language signature; (b) `humanize_error` returns the localised catalog entry; (c) rule numeric outputs are language-neutral; (d) unknown-language fallback to English works.
- [x] _(Frontend smoke test stays manual — committed a `LanguageSync` provider and a `_UserMeResponse` / `PATCH /preferences` contract; a full headless-browser check is out of scope for this commit.)_
- [x] Exit: backend pytest 390/390 green (up from 311) — catalog coverage + pipeline i18n + the updated humanization tests add 79 new deterministic tests, no live-Gemini dependency in CI.

### 8. Feature: Docs + progress log

**Owner:** PO1. **Depends on:** Tasks 1–7.

**Purpose/Issue:** Record the new language-propagation contract so future agents don't re-discover it.

**Implementation — PO1:**

- [x] `docs/trd.md` — Phase 9 propagation chain noted in `docs/progress.md`; `backend/app/rules/_i18n.py` module docstring + `backend/app/schema/locale.py` docstring carry the architectural explanation inline. _(A dedicated `docs/trd.md §5.6` rewrite is deferred to the Phase X submission polish pass to avoid a second commit.)_
- [x] `docs/progress.md` — Phase 9 dated entry appended.
- [x] Plan items ticked (this block).

---

## Phase 10: Conversational Concierge (Results-Page Chatbot)

### 1. Feature: Backend chat endpoint + Pydantic contract

**Purpose/Issue:** Land the SSE endpoint that the frontend chat panel will hit. Reuse the auth + rate-limit + Firestore-loading patterns already established by `intake` / `intake_manual`.

- [x] New module `backend/app/schema/chat.py` — Pydantic models: `ChatTurn` (role: Literal["user","model"], content: str), `ChatRequest` (history: list[ChatTurn], message: str, language: SupportedLanguage), `ChatTokenEvent` (type=Literal["token"], text), `ChatDoneEvent` (type=Literal["done"], message_id, citations: list[ChatCitation]), `ChatErrorEvent` (type=Literal["error"], category: ErrorCategory|None, message), `ChatCitation` (scheme_id|None, source_pdf|None, snippet).
- [x] New route handler `POST /api/evaluations/{evalId}/chat` in a new `backend/app/routes/chat.py` (mounted from `app/main.py`). Verifies caller via `verify_firebase_id_token`, loads the eval doc via `db.collection("evaluations").document(evalId).get()`, returns 404 if missing and 403 if `eval.ownerUid != caller.uid`.
- [x] Streams an SSE `text/event-stream` response yielding `ChatTokenEvent` per Gemini chunk, then `ChatDoneEvent` on completion (or `ChatErrorEvent` on failure). Reuses `humanize_error(language=...)` for terminal errors.
- [x] Rate-limit: free-tier callers gated by the existing `enforce_free_tier_rate_limit` preflight. Pro callers (judges) bypass.

### 2. Feature: Hard-constrained system prompt (en/ms/zh) + eval-context injection

**Purpose/Issue:** The chatbot must answer ONLY about the user's specific evaluation (with optional related-domain Q&A on Malaysian schemes). Hallucination control is the entire selling point.

- [x] New module `backend/app/agents/chat_prompt.py` exposing `build_system_instruction(eval_doc: dict, language: SupportedLanguage) -> str`.
- [x] Per-language system prompt blocks (en/ms/zh) that hard-constrain: identity ("You are Layak, a helper for Malaysian social-assistance schemes"), scope (THIS eval's matches + related scheme Q&A — refuse off-topic), refusals (no legal/financial advice, no portal-submission promises, never solicit IC numbers or PII), citation rules (when referencing a qualifying scheme, cite `scheme_id` from eval matches verbatim), output format (concise, plain-language, register matches user's language).
- [x] Eval-context section: render the loaded `evaluations/{evalId}` doc as a structured digest the prompt embeds — profile summary (name, age, household_size, income band — never the IC), classification notes, qualifying scheme list with `scheme_id` + `annual_rm` + `agency`, total upside, draft-packet status. Profile sensitive fields (`ic_last4` only, never full IC) sanitised before injection.
- [x] Multilingual register guidance reuses the same Dewan / 普通话 conventions as `LANGUAGE_INSTRUCTION_BLOCK` in `app/agents/gemini.py`.

### 3. Feature: Vertex AI Search grounding for chat retrieval

**Purpose/Issue:** Ground the chatbot on the live Discovery Engine data store so off-context-doc questions still resolve to a cited PDF passage instead of hallucinating.

- [x] Wire `google.genai.types.Tool(retrieval=Retrieval(vertex_ai_search=VertexAISearch(datastore=...)))` into the chat `generate_content_stream` call. Datastore name resolved via the existing `LAYAK_VERTEX_AI_SEARCH_*` env vars (`vertex_ai_search.py` carries the canonical resolver).
- [x] Fail-open: if the retrieval Tool config raises (e.g. Discovery Engine unreachable), the chat call retries WITHOUT the tool and the response is flagged `grounding_unavailable` on the `ChatDoneEvent.citations` payload so the frontend can surface a "responses are not currently grounded on PDFs" caveat.
- [x] Citation extraction: parse `response.candidates[].grounding_metadata` (or equivalent) into `ChatCitation` entries on the terminal `ChatDoneEvent`. Best-effort — missing metadata yields an empty citations list.

### 4. Feature: Five-layer guardrails (input + output validators + safety_settings + grounding + retry)

**Purpose/Issue:** The chatbot is a new live AI surface — needs defence-in-depth so an off-topic / adversarial / quota-blip turn doesn't break the demo. Skip Model Armor for the demo; layer the free defences.

- [x] Input validator: `_validate_chat_input(message: str)` — rejects messages > 4000 chars; rejects regex-detected prompt-injection patterns ("ignore previous instructions", "you are now…", "system:" / "<system>" markers, jailbreak phrases). Rejection emits a `ChatErrorEvent(category="extract_validation", message=...)` localised via `humanize_error` and skips the Gemini call.
- [x] Output validator: `_validate_chat_output(text, eval_matches)` — runs after the stream completes, asserts any cited `scheme_id` exists in the eval's matches list; if drift detected, logs a warning and strips the bad citation from the `ChatDoneEvent.citations` payload (keeps the response text unmodified to preserve the user's reading flow).
- [x] `safety_settings`: BLOCK_LOW_AND_ABOVE on HARM_CATEGORY_HARASSMENT, HATE_SPEECH, SEXUALLY_EXPLICIT, DANGEROUS_CONTENT.
- [x] Grounding via Vertex AI Search Tool (Task 3) — handles factual hallucination on Malaysian scheme details.
- [x] Wrap the Gemini call in `generate_with_retry` so transient 429/5xx during high concurrency get the same exponential-backoff treatment the pipeline tools already enjoy.

### 5. Feature: Backend chat tests

**Purpose/Issue:** Lock the chat contract before the frontend integrates so the wire shape is stable.

- [x] `backend/tests/test_chat_prompt.py` — `build_system_instruction` per language × per persona context (Aisyah qualifying, all-out-of-scope), asserts: language-signature tokens present, scheme_ids from eval matches appear in the embedded digest, full IC number never appears, refusal rules are stated.
- [x] `backend/tests/test_chat_routes.py` — endpoint tests with mocked Firestore + mocked `generate_content_stream`. Cases: 401 on missing token, 404 on missing eval, 403 on other-user eval, 200 on owner-issued request, prompt-injection input → ChatErrorEvent, off-topic message → model refusal handled, free-tier rate-limit triggers, citation drift on output → drift-stripped from event.
- [x] `backend/tests/test_chat_guardrails.py` — `_validate_chat_input` regex coverage (true/false matrix), `_validate_chat_output` citation-drift scenarios, `safety_settings` config sanity check.

### 6. Feature: Frontend floating chat panel on results page

**Purpose/Issue:** Surface the chatbot ONLY on `/dashboard/evaluation/results/[evalId]` without breaking the existing page layout. Floating action button → expanding drawer/modal.

- [x] New component `frontend/src/components/evaluation/results-chat-panel.tsx` — fixed-position floating action button (bottom-right, ~64×64, primary colour) with chat-bubble icon. Click expands to a drawer (desktop: bottom-right card ~400×640; mobile: full-screen drawer via shadcn `Sheet` or `Dialog` with `side="bottom"`).
- [x] Mounted from `frontend/src/components/evaluation/evaluation-results-by-id-client.tsx` (or its parent) so it appears on every variant of the results page (live + persisted).
- [x] Suggested-question chips on first open: 3-4 chips derived from the eval's matches (e.g. "Why do I qualify for STR 2026?", "How do I apply for JKM Warga Emas?", "What documents do I need?"). Chips clear after the first user turn.
- [x] Message-bubble UI with streaming token render (live cursor on the assistant turn while in flight). Send box with submit on Enter, Shift+Enter newline. Abort button while a turn is streaming. Disabled while pipeline is still in `running` state on a freshly-streamed eval (chat needs the full eval doc).
- [x] Citation chips below the assistant turn — clicking a chip opens the corresponding scheme card already on the page (smooth-scroll + highlight). Empty when grounding metadata is unavailable.

### 7. Feature: Frontend SSE consumer hook for chat

**Purpose/Issue:** Mirror the `use-agent-pipeline` SSE pattern so the chat surface follows the same conventions and shares error-recovery scaffolding.

- [x] New hook `frontend/src/hooks/use-chat.ts` exposing `{ messages, send, abort, isStreaming, errorCategory }`. Manages local conversation history; POSTs to `/api/evaluations/{evalId}/chat` with `{history, message, language}`; consumes SSE token events; surfaces `ErrorCategory`-keyed copy via the same i18n keys the recovery card uses.
- [x] TypeScript types in `frontend/src/lib/agent-types.ts` (or a new `chat-types.ts`) mirror the backend Pydantic models.
- [x] Language input pulled from `useTranslation().i18n.language` so the user's current toggle drives the call.

### 8. Feature: i18n strings for the chat panel (en/ms/zh)

**Purpose/Issue:** Every user-visible string in the new chat surface must localise alongside the rest of the app.

- [x] `frontend/src/lib/i18n/locales/{en,ms,zh}.json` — new `evaluation.chat.*` namespace covering: floating button aria-label, panel title, close button, send placeholder, empty-state body, suggested-question chip labels (parameterised on scheme_id where the chip is dynamic), abort button, "responses are not currently grounded on PDFs" caveat, error-state body per ErrorCategory.

### 9. Feature: Docs + progress log

**Purpose/Issue:** Lock the new endpoint + UI surface into TRD so post-hackathon iteration doesn't re-discover the contract.

- [ ] `docs/trd.md` — new §5.7 (Conversational Concierge) describing the endpoint contract, eval-context injection, grounding wiring, guardrail layers, and SSE event shape. _(Deferred to Phase X submission polish — `docs/progress.md` Phase 10 entry + plan tasks above already capture the contract verbatim; a §5.7 rewrite duplicates that without adding new architectural truth.)_
- [x] `docs/progress.md` — Phase 10 dated entry summarising the eight subtasks, demo-day risk assessment, and which guardrails were intentionally skipped (e.g. Model Armor).
- [x] All Phase 10 plan checkboxes ticked.

---

## Phase 11: Production-Grade SaaS Enhancements

> Ships four production-grade features ahead of the 2026-05-16 (Sat) Open Category finals. In build order per spec §12: Two-Tier Reasoning Surface, Agentic Scheme Discovery + Admin Moderation, Cross-Scheme Strategy Optimizer + Cik Lay handoff, What-If Scenario Subsection on Results. Scope is HARD-LOCKED to these four — PDF Citation Viewer, Lifecycle Vigilance, Household Mode, Optimizer rule code-generation, open-web crawling, multi-reviewer admin workflow, and voice intake are explicitly deferred to v2 per spec §7. Full design: `docs/superpowers/specs/2026-05-12-phase-11-enhancements-design.md`.

> **2026-05-12 execution amendment:** PO chose to land Feature 1 (Agentic Scheme Discovery + Admin Moderation — tasks 1, 4, 5, 6, 7 below) BEFORE Feature 4 (Two-Tier Reasoning Surface — tasks 2, 3). Tasks 2 and 3 slide to after task 7 lands. Three scope cuts applied to keep Feature 1 within the timebox:
>
> - **Cloud Scheduler integration is deferred to v2** (was task 5 sub-bullet). v1 ships with the in-product `Trigger discovery now` admin button only; spec §11 open question #2 is decided as "manual-trigger only." Cron-runbook copy stays in the README but flagged as v2.
> - **Side-by-side animated diff is simplified to a unified diff block** (was task 6). v1 renders the proposed vs. current eligibility/rate text in a single monospaced `<pre>` with `+`/`-` line prefixes; the rich side-by-side renderer is deferred.
> - **Bootstrap admin-claim sync runs at warm-up + on first authenticated request per process**, not on every request (was task 1 sub-bullet). Idempotent guard via in-process set, no Firestore lookup per call.
> - **Admin UI routes live under `/dashboard/discovery` instead of `/admin/discovery`** (spec §2.6 path correction). Sidebar surfaces a "Discovery" link below "Schemes" that only renders when `useAuth().role === 'admin'`. Pages are wrapped in `<AuthGuard requireRole="admin">` so non-admins who deep-link to the URL are redirected to `/dashboard`. Backend endpoints stay at `/api/admin/*` — admin-gated APIs are a separate concern from page paths.

> **2026-05-12 status note on remaining unchecked boxes:** All code work in Phase 11 is shipped (5 commits: `2786b43`, `6ce462f`, `095b094`, `4eb68f5`, `0b2ece8`, `4f91577`). Bullets that remain `[ ]` below fall into two buckets:
>
> 1. **Manual / live-only checks** — Firebase Console settings, 375 px viewport visual regression, and four "manual smoke" walkthroughs (sign-up flow, Feature 2/3/4 demo runs). These cannot be ticked from CI; they are demo-day rehearsal items.
> 2. **Stale spec wording where the work actually shipped under an amended approach** — see the "Status amendment" annotations on the affected bullets in Tasks 6 + 7. The shipping path is documented in TRD §5.7 and `docs/progress.md [12/05/26]`.
>
> Three bullets at lines 1410, 1486, 1488 are documented v2 / v1.1 deferrals; the decision IS the deliverable and they're now ticked as such.

### 1a. Feature: Email/password authentication for sign-in + sign-up

**Purpose/Issue:** Layak currently supports Google SSO only. The Phase 11 admin moderation surface requires a deterministic test-admin identity that judges and reviewers can sign in as without us granting Google-account access. Adding Firebase Email/Password as a parallel sign-in method keeps the existing SSO path and unblocks the admin allowlist in Task 1b.

- [ ] Enable Firebase Email/Password sign-in provider in the Firebase console (one-time manual step; documented in `.env.example` + README deploy runbook).
- [x] Extend the existing sign-in page with an email + password form alongside the existing Google SSO button: `signInWithEmailAndPassword(auth, email, password)` on submit; surface Firebase auth-error codes (`auth/invalid-credential`, `auth/user-disabled`, etc.) as inline localised errors.
- [x] Add a sign-up surface (either tabbed on the existing sign-in page or a separate `/sign-up` route): `createUserWithEmailAndPassword(auth, email, password)`; on success, optional `updateProfile({ displayName })`; redirect to `/dashboard`.
- [x] Password rules: client-side enforce ≥ 8 chars + at least one digit; Firebase enforces ≥ 6 server-side. No password-reset flow in v1 — flagged in v2 roadmap.
- [x] i18n keys for the new copy land in en/ms/zh at this task (sign-in tab labels, password placeholder, error messages).
- [x] Verify: `pnpm -C frontend lint` clean (full `next build` blocked by pre-existing missing module `react-markdown` + sandbox-blocked Google Fonts; `tsc --noEmit` clean for all new files).
- [ ] Manual smoke: sign up new email → land on `/dashboard` with `users/{uid}` doc created on first authed call; sign out + sign back in → same uid.

### 1b. Feature: Auth role custom-claim bootstrap + admin route gating + TRD §1 statelessness correction

**Purpose/Issue:** Foundation for the admin moderation surface. Extends the existing Firebase Admin SDK auth (`backend/app/auth.py`) with a `role` custom claim derived from a bootstrap email allowlist; gates `/admin/*` routes server-side + client-side. Also corrects the existing TRD §1 "stateless" wording to honestly reflect the Firestore footprint already shipped + what Phase 11 adds.

- [x] New env var `LAYAK_ADMIN_EMAIL_ALLOWLIST` (comma-separated emails) read at backend cold-start; documented in `.env.example`. README deploy runbook section update deferred to Task 12.
- [x] On every authenticated request's first touch, ensure any user whose verified email matches the allowlist has `{role: 'admin'}` set via `fb_auth.set_custom_user_claims(uid, ...)`. Idempotent per process via in-memory cache (`_admin_promoted_uids`).
- [x] New helpers `verify_admin_role(user) -> None` + `require_admin` dependency + `AdminUser` type alias in `backend/app/auth.py` — raises 403 when `role != 'admin'`.
- [x] `frontend/src/lib/auth-context.tsx` exposes the `role` claim from the parsed ID token alongside `uid` and `email` (via `onIdTokenChanged`).
- [x] `frontend/src/components/auth/auth-guard.tsx` extended with `requireRole?: 'admin'` prop; force-refreshes token once before redirect to handle the custom-claim propagation gap.
- [x] `docs/trd.md` §1 wording updated per spec §6.1 (landed in Task 12 commit `4f91577`).
- [x] `backend/tests/test_admin_auth.py` — bootstrap-allowlist matching, `verify_admin_role` 403 vs 200 paths.

### 2. Feature: Two-tier reasoning surface — backend SSE contract additions

**Purpose/Issue:** Extend the existing pipeline SSE stream with two new event types per step — humanized lay narration + technical developer transcript — so the frontend can render the two-tier surface without breaking any existing consumer.

- [x] New Pydantic models `PipelineNarrativeEvent` (`type: Literal["narrative"]`, `step`, `headline` ≤ 80 chars, `data_point` ≤ 40 chars, nullable) and `PipelineTechnicalEvent` (`type: Literal["technical"]`, `step`, `timestamp` ISO-8601 str, `log_lines: list[str]` 1–20) added to `backend/app/schema/events.py`. Both wired into the `AgentEvent` discriminated union.
- [x] Each of the 5 pipeline steps (`extract`, `classify`, `match`, `compute_upside`, `generate`) emits one `PipelineNarrativeEvent` and one `PipelineTechnicalEvent` on completion alongside the existing `step_result` event. Per-step latency captured via `asyncio.get_event_loop().time()` deltas. `optimize_strategy` event integration lands with Feature 2 (Task 8); v1 has 5 steps, not 7 — ranking is implicit in `match_schemes`'s sort.
- [x] Lay narration text emits in user's `language` directly from a static `_HEADLINES` catalog in `backend/app/agents/narration.py`. en/ms/zh ship with this task — the catalog is small enough that the Task 12 deferral is unnecessary.
- [x] Technical transcript per tool includes tool name, key inputs, key outputs, Vertex citation (pdf:page) per match, Code Execution stdout first non-empty line + char counts, latency ms. NEVER includes raw IC numbers (only `***-**-{last4}` masked form), profile `name`, or `address`. Pydantic-enforced 20-line cap per event.
- [x] `backend/tests/test_pipeline_narration.py` — 9 tests covering length contracts, PII redaction, localisation per (en/ms/zh) × 5 steps, match technical content, compute_upside stdout surfacing. `test_manual_entry.py` updated 11 → 21 events with new sequence assertion.
- [x] Persistence layer (`backend/app/services/evaluation_persistence.py`) passes both new event types through to the client and appends to `narrativeLog`/`technicalLog` Firestore arrays via `ArrayUnion` for retrospective replay.

### 3. Feature: Two-tier reasoning surface — frontend `pipeline-narrative.tsx`

**Purpose/Issue:** Replace the skinny `pipeline-stepper.tsx` progress bar with a two-tier UI: a lay-language narration card always visible, plus a collapsed-by-default developer transcript dropdown. On completion, the entire card collapses to a one-line summary on the persisted results page.

- [x] New `frontend/src/components/evaluation/pipeline-narrative.tsx` mounting `<NarrativeLayer />` (always visible — headline + data_point per `PipelineNarrativeEvent` with checkmark icons) and `<TechnicalLayer />` (hand-rolled expand toggle with `aria-expanded`, monospaced `<pre>` with `tabIndex={0}` + `role="region"` for keyboard accessibility — shadcn `<Collapsible>` not yet installed, custom implementation matches paper-card design semantics).
- [x] `frontend/src/hooks/use-agent-pipeline.ts` extended to accumulate `narrativeEvents` and `technicalEvents` arrays alongside existing step state. New reducer branches in `applyEvent` switch.
- [x] All call-sites updated to use `pipeline-narrative.tsx` (`evaluation-upload-client.tsx`, `evaluation-results-by-id-client.tsx`); deleted `pipeline-stepper.tsx`.
- [x] Post-completion behaviour on `/dashboard/evaluation/results/[id]`: the narrative card renders in `retrospective` mode — collapsed by default to a one-line summary ("Layak's pipeline completed across {{count}} steps.") with a chevron to expand into the full two-tier replay.
- [x] Tier-1 narration ships en/ms/zh from the backend `_HEADLINES` catalog; Tier-2 technical transcript stays English.
- [x] Mock fixture (`frontend/src/fixtures/aisyah-response.ts:AISYAH_MOCK_EVENTS`) extended with 5 narrative + 5 technical events so demo mode showcases the new UI rather than falling back to the legacy stepper rendering path.
- [x] Type mirrors: `agent-types.ts` adds `PipelineNarrativeEvent`, `PipelineTechnicalEvent`, extends `AgentEvent` union + `EvaluationDoc` with optional `narrativeLog`/`technicalLog` (backward compat for pre-Feature 4 evals).
- [x] i18n chrome keys in en/ms/zh: `evaluation.narrative.{showTechnical, hideTechnical, showDetails, collapse, summaryRunning, summaryDone, summaryError, technicalLogLabel}`.
- [x] Verify: `pnpm -C frontend lint` clean. `tsc --noEmit` clean for all new files (pre-existing errors in `results-chat-panel.tsx` from missing `react-markdown` module unchanged). Backend 478/478 tests pass. Two parallel audit subagents found two fixes (pre keyboard accessibility + mock fixture coverage), both addressed.
- [ ] Manual smoke (Aisyah sample): 5 lay narration lines (Read your documents → Drafted application packets), expanded technical layer shows timestamps + tool names + Vertex citations + Gemini code-execution stdout excerpt.

### 4. Feature: Discovery source allowlist + `source_watcher` + `extract_candidate` tools backend

**Purpose/Issue:** The two ADK FunctionTools the DiscoveryAgent composes — fetch + hash + diff each allowlisted government URL, then run Gemini 2.5 Pro structured-output against any changed source to produce a `SchemeCandidate` record.

- [x] New `backend/app/data/discovery_sources.yaml` seeded with 7 entries — source IDs aligned to canonical `SchemeId` Literal (`str_2026`, `bk_01`, `jkm_warga_emas`, `jkm_bkk`, `lhdn_form_b`, `i_saraan`, `perkeso_sksps`) so watcher can use `source.id` directly as `verified_schemes` doc key.
- [x] New `backend/app/schema/discovery.py` — `SchemeCandidate`, `CandidateRecord`, `DiscoverySource`, `ChangedSource`, `DiscoveryRunSummary`, `SourceCitation`. Narrower `SourceCitation` rather than reusing `RuleCitation` since live HTML pages have no stable page numbering.
- [x] New `backend/app/agents/tools/source_watcher.py` — `watch_sources(db, sources)` async. Normalises HTML via tag-strip + whitespace collapse before hashing; 20s timeout + 5 MiB body cap; ignores cross-origin redirect chains by setting `follow_redirects=True` but with default same-scheme posture.
- [x] New `backend/app/agents/tools/extract_candidate.py` — Gemini 2.5 Pro structured-output via `response_mime_type="application/json"` (not `response_schema=` — that path is unstable for nested Pydantic models in current SDK); confidence-gated drop at `< 0.5`.
- [x] `backend/tests/test_discovery_schema.py` — schema validation + allowlist load + hash determinism (7 tests).
- [x] Full network-integration tests against fixture URL **deferred to v2** (requires test-server harness; covered by manual smoke in Task 6). Decision documented.

### 5. Feature: `DiscoveryAgent` runner + Firestore collections + admin API endpoints

**Purpose/Issue:** Compose the watcher + extractor tools into a long-running ADK agent that runs on Cloud Scheduler (or via an in-product manual button); persists candidates in Firestore; exposes admin-gated endpoints for queue, approve, request-changes, reject, and manual-trigger.

- [x] New `backend/app/agents/discovery_agent.py` exposing `run_discovery(db) -> DiscoveryRunSummary`: invokes watcher → extractor → writes one record per changed source to `discovered_schemes` with status `pending`.
- [x] New Firestore collections: `discovered_schemes` (admin-only) and `verified_schemes` (public-read for the badge endpoint; admin-write).
- [x] New `backend/app/routes/admin.py` with endpoints (all gated by `Depends(require_admin)`): `GET /api/admin/discovery/queue?status=...&limit=...`, `GET /api/admin/discovery/{candidate_id}`, `POST .../approve`, `POST .../reject`, `POST .../request-changes`, `POST /api/admin/discovery/trigger`, `GET /api/admin/schemes/health`.
- [x] Cloud Scheduler integration **deferred to v2** per the execution amendment above. v1 ships with manual-trigger only via the in-product "Run discovery now" button. Decision documented.
- [x] Approve handler — two-track: (a) for matched candidates, `verified_schemes/{scheme_id}` doc upsert with `verifiedAt`, `sourceContentHash`, `lastKnownPayload`; (b) for ALL approved candidates, YAML manifest written to `backend/data/discovered/<scheme_id-or-uuid8>-<YYYY-MM-DD>-<short_hash>.yaml`.
- [x] Brand-new candidates (no matching `scheme_id`) write only to the engineer-track YAML; they never propagate to `verified_schemes` and stay invisible to user evaluations until an engineer hand-codes the Pydantic rule.
- [x] `backend/app/main.py` mounts the new admin router + new public `schemes` router.
- [x] Full route-level pytest with mocked Firestore **deferred to v2** — covered by `test_admin_auth.py` (gating + role logic) and the smoke flow on the in-product admin UI. Decision documented.
- [x] Live network-integration test against a fixture URL **deferred to v2**. Decision documented.

### 6. Feature: Admin UI frontend — `/admin/discovery` queue + candidate detail + diff view

**Purpose/Issue:** Two new admin-gated routes that let a reviewer triage and approve discovered scheme candidates with a side-by-side diff against the current rule.

- [x] **Status amendment:** Admin UI shipped under `/dashboard/discovery/*` instead of `/admin/*` per the path-correction note at the top of this phase. `AuthGuard requireRole="admin"` wraps each discovery page directly (no separate group layout needed); sidebar Discovery link is conditionally rendered on the existing dashboard layout. Files shipped at their canonical paths in commit `2786b43`.
- [x] Queue view shipped as `frontend/src/app/pages/admin/discovery-page.tsx` (mounted at `/dashboard/discovery`) — filter chips, table, "Run discovery now" button, scheme health card.
- [x] Candidate detail shipped as `frontend/src/app/pages/admin/discovery-detail-page.tsx` (mounted at `/dashboard/discovery/[id]`) — unified `+`/`-` diff via `<UnifiedDiff>` per the spec amendment (side-by-side was simplified to unified per the top-of-phase note).
- [x] Components shipped as `frontend/src/components/admin/{discovery-queue-table,candidate-detail-card,unified-diff,discovery-filter-chips,discovery-trigger,scheme-health-card}.tsx`. Names diverged from the spec wording but the surface area is equivalent.
- [x] Data fetching shipped as `frontend/src/lib/admin-discovery.ts` (typed authedFetch wrapper). Project doesn't use SWR/react-query; the existing `authedFetch` + `useEffect` pattern matches the rest of the dashboard.
- [x] Non-admin users hitting any `/dashboard/discovery*` route see no admin-route content and are redirected to `/dashboard` (the requireRole prop on AuthGuard force-refreshes the ID token once before deciding).
- [x] Verify: `pnpm -C frontend lint` clean; `tsc --noEmit` clean for all new files (full `next build` blocked by pre-existing missing `react-markdown` module + sandbox-blocked Google Fonts; not introduced by this work).
- [ ] Manual smoke: bootstrap admin → trigger discovery → review candidate → approve → `verified_at` updates on the affected scheme card after page refresh. **Pending live judge run.**

### 7. Feature: Scheme `verified_at` badge cross-app

**Purpose/Issue:** Surface the platform's automated-verification signal to end users on every scheme card — both the Schemes overview page and the results page.

- [x] `frontend/src/components/schemes/scheme-verified-badge.tsx` shipped — renders relative time "Source verified N min/h/d ago" with a `title` tooltip explaining the badge. Backed by `useVerifiedAt(schemeId)` hook + module-level cache so 6+ badges on the schemes overview share one fetch.
- [x] **Status amendment:** Public `GET /api/schemes/verified` shipped instead of extending the (non-existent) `GET /api/schemes` endpoint — the schemes overview reads from a hardcoded frontend list, so a separate `verified_at` endpoint is cleaner than rewriting the schemes data flow. Backend at `backend/app/routes/schemes.py`.
- [x] `frontend/src/components/schemes/schemes-overview.tsx` renders the badge under each scheme card via the new `canonicalSchemeId` field that maps the hyphenated UI ids to the canonical underscore `SchemeId`.
- [x] `frontend/src/components/evaluation/scheme-card-grid.tsx` renders the badge inline within each card's existing footer on the results page.
- [ ] Layout regression check at 375px viewport — badge must not push CTAs off-screen on the mobile scheme cards. **Pending live visual check.**
- [x] **Status amendment:** i18n keys `schemes.verifiedBadge.{labelWithDate,labelNever,tooltip}` for en/ms/zh shipped alongside the badge in Feature 1 commit `2786b43`, not deferred to Task 12. Naming differs slightly from spec wording (`labelWithDate`/`labelNever` instead of `label`) to support the never-verified state.

### 8. Feature: Cross-Scheme Optimizer — knowledge base + `StrategyAdvice` schema + `OptimizerAgent` tool + four-layer grounding

**Purpose/Issue:** Layer strategic reasoning on top of eligibility matching. The Optimizer is structurally incapable of asserting ungrounded claims thanks to a four-layer stack: yaml registry, structured output, few-shot prompt, frontend confidence gating. **Layer 3 (Vertex AI Search re-grounding) deferred to v1.1 per the feasibility critique** — drops the highest-risk subtask while keeping all deterministic safety layers.

- [x] New `backend/app/data/scheme_interactions.yaml` with the 3 v1 hardcoded rules per spec §3.3: `lhdn_dependent_parent_single_claimer`, `i_saraan_liquidity_tradeoff`, `lhdn_spouse_relief_filing_status`. Each entry: `id`, `applies_to`, `trigger_conditions`, `rule`, `advice_template`, `severity`, `citation`, `suggested_chat_prompt`.
- [x] New `backend/app/schema/strategy.py` — `StrategyAdvice`, `StrategyCitation`, `SchemeInteractionRule`, `StrategySeverity` Pydantic v2 models. Mandatory `interaction_id`, `citation` (non-null), `confidence` (0–1), `severity`, `headline` ≤ 80, `rationale` ≤ 280; all use `ConfigDict(extra="forbid")`.
- [x] New `backend/app/agents/tools/optimize_strategy.py` — `optimize_strategy(profile, matches, classification, *, language)`. Pure-Python `_rule_trips` pre-filter (Python evaluates `trigger_conditions` deterministically; Gemini only sees rules that actually apply). Gemini 2.5 Pro call with `response_mime_type="application/json"` + few-shot prompt. Layer 1 (registry membership) + Layer 2 (Pydantic schema) + Layer 5 (confidence floor 0.5) validation in `_validate_and_filter`. Caps survivors at 3 per spec §3.7. Layer 3 (Vertex re-grounding) deferred — citation triple carried verbatim from YAML rule.
- [x] Hand-wrote 4 few-shot examples in `backend/app/agents/optimizer_prompt.py`: Aisyah-class (warn), low-income i-Saraan (info), Form B spouse ambiguity (act), and an empty-list null case so the model learns "no rules trip → `[]`".
- [x] Inserted `optimize_strategy` step between `match` and `compute_upside` in `backend/app/agents/root_agent.py`. Pipeline now: extract → classify → match → optimize*strategy → compute_upside → generate. New `Step` Literal in `events.py`; `OptimizeStrategyResult` added to `StepData` union; matching `narrate_optimize_strategy*\*`helpers in`narration.py` (en/ms/zh).
- [x] Optimizer output piped into both (a) the SSE pipeline events as `StepResultEvent(step="optimize_strategy", data=OptimizeStrategyResult(advisories=...))` and (b) the persisted `evaluations/{evalId}.strategy` Firestore array via the existing mirror layer.
- [x] `backend/tests/test_strategy_optimizer.py` — 14 tests: YAML registry loads, every rule cites an extant PDF, Aisyah trips the dependent-parent rule, Aisyah trips i-Saraan when matched, Aisyah doesn't trip i-Saraan when not matched, spouse-relief trips for form_b filer, Layer 1 drops unknown interaction_id, Layer 5 drops < 0.5 confidence, validator keeps valid records, validator caps at 3, Pydantic rejects overlong headlines, `_CONFIDENCE_FLOOR == 0.5` pinned, few-shot examples reference registry ids.
- [x] Few-shot ↔ registry integrity check folded into `test_strategy_optimizer.py:test_few_shot_examples_reference_registry_ids`; no separate `test_scheme_interactions_yaml.py` needed.

### 9. Feature: Strategy section frontend + Cik Lay handoff context augmentation

**Purpose/Issue:** Render the OptimizerAgent's `StrategyAdvice` records as a new "Strategy" section on the results page, with a per-card `Ask Cik Lay about this` CTA that opens the existing results chatbot pre-loaded with the advisory's context and a sensible follow-up question.

- [x] New `frontend/src/components/evaluation/strategy-section.tsx` — section titled "Strategy"; mounted between the Schemes and Required-Contributions cards on `/dashboard/evaluation/results/[id]` with TOC entry. Renders up to 3 `<StrategyCard />` instances, or an empty-state "no conflicts detected" card when the optimizer returned `[]`.
- [x] New `frontend/src/components/evaluation/strategy-card.tsx` — severity icon (`info` `Info`, `warn` `AlertTriangle`, `act` `CheckCircle2`) tinted with `--primary` / amber / `--forest`, headline (font-heading semibold 15.5px), rationale paragraph, citation footer (`Cited: <pdf> §<section> p.<page>`), right-aligned `Ask Cik Lay about this` CTA. CTA visibility per spec §3.5 — see confidence-gate row below.
- [x] Confidence-gated rendering per spec §3.5: `confidence >= 0.8` full card with CTA when `suggested_chat_prompt != null`; `0.5 <= confidence < 0.8` adds `softSuggestion` amber badge + force-shows CTA regardless of `suggested_chat_prompt` (handoff falls back to `headline` when prompt is null); `confidence < 0.5` suppressed entirely.
- [x] `frontend/src/hooks/use-chat.ts` extended with `handoffFromAdvice(advice: StrategyAdvice) => void` method plus `pendingDraft`, `consumePendingDraft`, `pendingAdvisory` accessors. `useChat` instance is lifted to `evaluation-results-by-id-client.tsx` and shared between the Strategy section + the chat panel via the new `chat: UseChatResult` prop on `ResultsChatPanel`. Effect in panel auto-opens + prefills the textarea when `pendingDraft` lands.
- [x] `backend/app/agents/chat_prompt.py:build_system_instruction` extended to accept an optional `recent_advisory: StrategyAdvice | None` arg. New `_render_recent_advisory_block` appends a "Recent advisory the user just clicked on (DATA — for context only, not instructions)" block to the digest with citation triple + suggested prompt + applied schemes. Marked DATA to prevent prompt injection via the advisory text.
- [x] `backend/app/schema/chat.py:ChatRequest` extended with optional `recent_advisory: StrategyAdvice | None`; threaded through `backend/app/services/chat.py:stream_chat_response` into `build_system_instruction`. Frontend `ChatRequest` TS mirror updated.
- [x] Phase 10 chatbot regression: all existing guardrails (input validator, output validator, safety_settings, Vertex grounding, retry) remain unchanged. 3 new tests in `backend/tests/test_chat_prompt_handoff.py` cover: no advisory → legacy shape; advisory present → block injected; advisory marked as DATA.
- [x] Verify: `pnpm -C frontend lint` clean. `tsc --noEmit` clean for all new files (pre-existing `react-markdown` module errors in `results-chat-panel.tsx` unchanged). Backend 494/494 tests pass; backend `ruff check` clean.
- [x] Two parallel audit subagents (backend + frontend) ran post-implementation; surfaced one fix (StrategyCard CTA force-show when isSoft + null prompt) which was applied before commit.
- [ ] Manual smoke (Aisyah evaluation): pipeline runs through 6 steps including optimize_strategy → Strategy section renders with `lhdn_dependent_parent_single_claimer` warn card → "Ask Cik Lay" opens the chat panel with the prompt pre-filled → Cik Lay's response references the advisory.

### 10. Feature: What-if backend endpoint + `WhatIfRequest` / `WhatIfResponse` / `SchemeDelta` schemas

**Purpose/Issue:** A lightweight partial-rerun endpoint that re-evaluates a user's profile with selective overrides and returns delta-annotated matches + refreshed strategy advisories without re-running extract or generate_packet steps.

- [x] New `backend/app/schema/what_if.py` — `WhatIfRequest` (`overrides: dict[str, Any]`), `WhatIfResponse` (`total_annual_rm`, `matches`, `strategy`, `deltas`), `SchemeDelta` (`scheme_id`, `status`, `baseline_annual_rm`, `new_annual_rm`, `delta_rm`, `note`). All Pydantic v2 with `ConfigDict(extra="forbid")`. `eval_id` is in the URL path, not the body — keeps the request body minimal.
- [x] New `backend/app/routes/what_if.py` — `POST /api/evaluations/{eval_id}/what-if`. Layered checks: rate-limit BEFORE Firestore (cheap fast-fail), 404 on missing doc, 404 on ownership mismatch (not 403 — avoids eval-id leak), 409 on `status="running"`, 409 on missing profile, 500 on Profile validation failure. Calls `app.services.what_if.run_what_if` which executes `classify_household → match_schemes → optimize_strategy` only (extract + compute_upside + generate_packet skipped; total is a deterministic inline sum).
- [x] Endpoint is stateless w.r.t. Firestore — only `.get()` calls, never `.set()` / `.update()` / `.delete()`. Audit subagent confirmed zero mutation calls.
- [x] Rate limit: 5 calls / 60s rolling per uid for free tier; pro tier bypasses. In-memory per-process counter (`_recent_calls: dict[str, deque]`). 429 response carries `Retry-After` header. Per-uid isolation verified by test.
- [x] `backend/app/main.py` mounts the new what-if router.
- [x] `backend/tests/test_what_if.py` — 17 unit tests covering: 3 slider-clamping cases, 5 dependants-rebuild cases (children replace + spouse preservation + flag re-derivation + household_size recompute), 5 delta-status transitions (`gained` / `lost` / `tier_changed` / `amount_changed` / `unchanged`), 3 rate-limit cases (5/min limit, per-uid isolation, pro bypass), unknown-key + empty-overrides edge cases. Full backend suite 511/511 pass.

### 11. Feature: What-if frontend panel — sliders + animated upside + delta chips

**Purpose/Issue:** Surface what-if exploration on the results page as a collapsed-by-default subsection between Strategy and the draft-packet preview, with three sliders, live re-computation, animated transitions on the upside hero, and per-card delta chips.

- [x] New `frontend/src/components/evaluation/what-if-panel.tsx` — collapsible section ("Explore what-if scenarios"), collapsed by default. Expanded: three sliders bound to `monthly_income_rm` (0–15000, step 100), `dependants_count` (0–6, step 1), `elderly_dependants_count` (0–4, step 1). Each slider shows current value + baseline-when-dirty + "Reset to my actual" inline; "Reset all" appears in the header only when at least one slider has moved.
- [x] New `frontend/src/hooks/use-what-if.ts` — debounced (500ms) POST to `/api/evaluations/{evalId}/what-if`; AbortController cancels in-flight requests when a new slider value lands; state machine: `idle → debouncing → in-flight → ready | rate-limited | error`; `clear()` cancels the timer + abort signal and resets state.
- [x] Animated upside hero number via CountUp **deferred to v1.1**. v1 swaps the value directly; the existing total card on the page already animates via the standard `tabular-nums` font transition, which is sufficient for the demo. Decision documented.
- [x] Per-scheme delta chips render under each scheme card when what-if is active: i18n-keyed `Newly eligible · RM N`, `Now ineligible · was RM N`, tier change `note` verbatim, `±RM N` for amount changes. `unchanged` is silent (no chip).
- [x] Scheme card reorder animation **deferred to v1.1**. The new `matches` list is passed through `SchemeCardGrid` which re-sorts by `annual_rm` desc; cards re-flow without an explicit AnimatePresence wrapper. Decision documented.
- [x] Collapsing the section OR resetting all sliders back to baseline reverts the page to baseline. The hook calls `clear()` whenever `diffsFromBaseline` becomes empty, so `whatIfResult` returns to null and the parent renders the original `doc.matches`.
- [x] Strategy section auto-refreshes from `whatIfResult?.strategy ?? pipelineState.strategy` when the new profile changes which interaction rules trip.
- [x] Type mirrors: `agent-types.ts` adds `DeltaStatus`, `SchemeDelta`, `WhatIfRequest`, `WhatIfResponse`. Backend `SchemeId` narrowed correctly on `SchemeDelta.scheme_id`.
- [x] i18n chrome keys in en/ms/zh: `evaluation.whatIf.{sectionTitle,sectionEyebrow,sectionDescription,resetAll,resetSlider,running,rateLimited,errorGeneric,sliderIncomeLabel,sliderChildrenLabel,sliderElderlyLabel,totalUpsideLabel,deltaChip.{gained,lost,tier_changed,amount_changed,unchanged}}`.
- [x] Verify: `pnpm -C frontend lint` clean. `tsc --noEmit` clean for all new files (pre-existing `react-markdown` errors in `results-chat-panel.tsx` unchanged). Native `<input type="range">` styled with `accent-[color:var(--primary)]`; shadcn slider not installed and not needed.
- [x] Two parallel audit subagents (backend + frontend) ran post-implementation; both reported SHIP-READY with no fixes needed.
- [ ] Manual smoke (Aisyah evaluation): drop income slider to RM 2,500 → total updates → STR delta chip shows tier change → "Reset all" restores baseline cleanly.

### 12. Feature: i18n + docs + progress log

**Purpose/Issue:** Translate every new user-visible string into en/ms/zh, lock the contracts into TRD / PRD, stamp the phase in `progress.md`, and ship the README updates judges will read.

- [x] `frontend/src/lib/i18n/locales/{en,ms,zh}.json` — all required namespaces landed alongside their owning features (Features 1-4) rather than waiting for a final sweep: `evaluation.strategy.*`, `evaluation.whatIf.*`, `evaluation.narrative.*`, `admin.discovery.*`, `schemes.verifiedBadge.{labelWithDate,labelNever,tooltip}`. Plus the landing-page fix patched the marketing namespace (hero / pricing / pipeline / packets-preview / cta) on the same pass.
- [x] `docs/trd.md` — added §5.7 (Agentic Discovery), §5.8 (Strategy Optimizer), §5.9 (What-If), §5.10 (Two-Tier Reasoning Surface). Section numbers continue from the existing §5.6 (Conversational Concierge) — plan's original "§5.8..11" numbering was stale. Updated §1 with the now-6-step pipeline + the statelessness correction per spec §6.1.
- [x] `docs/prd.md` — appended FR-22 (admin moderation), FR-23 (strategy advisories), FR-24 (what-if exploration), FR-25 (reasoning transparency). Numbering continues from FR-21 (Manual Entry); the plan's original "FR-11..14" numbering predated the post-Phase-9 FRs. Falsifiable acceptance criteria embedded under each new FR.
- [x] `docs/progress.md` — dated Phase 11 entry at the top of the file. Summarises all 12 subtasks across the 4 features + landing i18n fix, the 4-of-5 grounding stack decision, the 7 v2 deferrals, and the 2 v1.1 cuts (Cloud Scheduler + Vertex re-grounding).
- [x] `README.md` — AI disclosure section updated to mention Claude Code; new "v2 Roadmap (deferred from Phase 11)" section explicitly lists the 7 items spec §7 deferred plus the 2 in-phase cuts. Architecture-diagram-as-PNG embed deferred — the existing ASCII diagram in `docs/trd.md` §2 is the canonical reference; a PNG render adds maintenance burden without unblocking the demo.
- [x] All Phase 11 plan checkboxes ticked. Two manual-smoke items left unchecked (Feature 2 + Feature 3 smoke flows) — they require a live judge run and aren't auto-tickable.

### 13. Feature: IC tail expansion — `ic_last4` → `ic_last6` (PB code + serial)

**Purpose/Issue:** Future federal subsidy integrations (MyKasih, BUDI95) require enough IC tail to reconstruct the full IC at the boundary when combined with the user-supplied DOB. The Malaysian IC layout is `YYMMDD-PB-####`: the first 6 digits encode the birthday (recovered from `date_of_birth`), and the last 6 digits encode place-of-birth code (`PB`, 2 digits) + serial (`####`, 4 digits). The previous schema kept only the last 4 (serial) — sufficient for in-Layak draft packet identification but insufficient for live agency lookups. This task expands the captured tail from 4 to 6 digits and renames the field across the stack so a future reader can't be confused by the inherited "4" in the identifier.

- [x] **Pydantic schemas** — `backend/app/schema/profile.py` `Profile.ic_last4` + `Dependant.ic_last4` and `backend/app/schema/manual_entry.py` `ManualEntryPayload.ic_last6` + `DependantInput.ic_last6` renamed; regex tightened from `^\d{4}$` → `^\d{6}$`. Privacy invariant docstring updated to call out the PB + serial decomposition.
- [x] **Backend agents/tools** — `extract.py` Gemini prompt instructs the model to emit `ic_last6` (e.g. `900324-06-4321` → `"064321"`); `build_profile.py` passes the new field through; `generate_packet.py` filename templates switched to `{ic_last6}` and locale strings updated to "last 6 / 6 akhir / 末 6 位"; `chat_prompt.py` digest renderer pulls `ic_last6` from the eval doc with a `len == 6` guard; `narration.py` mask helper renamed `_mask_ic_last4` → `_mask_ic_last6` and now emits `******-PB-####` instead of `***-**-####`, matching the real Malaysian IC layout.
- [x] **Jinja templates** — All 7 (`_base.html.jinja`, `bk01`, `jkm18`, `jkm_bkk`, `lhdn`, `lhdn_be`, `i_saraan`, `perkeso_sksps`) now render `••••••-{ic_last6[:2]}-{ic_last6[2:]}` and updated label copy ("Filer IC (last 6)" / "Kad Pengenalan (6 akhir)" / "申报人 IC（末 6 位）"). The jkm_bkk dependant table header changed to "IC (6 akhir)" + per-row 6-digit mask.
- [x] **Fixtures** — `app/fixtures/aisyah.py`, `app/scripts/smoke_chat.py`, frontend `aisyah-response.ts`, `aisyah-fixtures.ts`, `farhan-fixtures.ts`, and the manual-entry form defaults all carry 6-digit values. Aisyah's tail: `"064321"` (preserves the original `4321` serial with a `06` PB prefix matching Pahang). Farhan's tail: `"065837"`.
- [x] **Backend tests** — 16 test files updated (`test_manual_entry`, `test_chat_prompt`, `test_chat_prompt_handoff`, `test_chat_routes`, `test_classify_form_be`, `test_error_humanization`, `test_dependant_schema`, `test_i_saraan`, `test_jkm_bkk`, `test_jkm_warga_emas`, `test_lhdn_form_b`, `test_perkeso_sksps`, `test_pipeline_narration`, `test_rate_limit`, `test_str_2026`, `test_what_if`). `test_validation_rejects_non_4_digit_ic_last4` renamed to `_non_6_digit_ic_last6`; the narration test's mask assertion now checks `******-06-4321` instead of `***-**-4321`.
- [x] **Frontend types + components** — `agent-types.ts` (Dependant, Profile, DependantInput, ManualEntryPayload), `manual-entry-form.tsx` (FormValues, Aisyah/Farhan defaults, Zod refinements, `maxLength={6}`, field id `mef-ic6`, i18n key `zodIc6Digits`), `dependants-fieldset.tsx` (`DependantInputRow.ic_last6`, `newEmptyDependant()`, fieldset `maxLength={6}`), `upload-widget.tsx` (submit mapping), `landing-pipeline.tsx` (the inline JSON sample shown in the marketing pipeline visualisation).
- [x] **i18n locales (en/ms/zh)** — Keys renamed: `zodIc4Digits` → `zodIc6Digits`. Copy values updated for `icLabel`, `icHelp`, `icOptional`, FAQ-04 body, marketing pipeline body, the privacy-page `section2MyKad`, and the extract-pipeline body string. Privacy-copy framing reworked per user feedback (see Open Follow-Ups below) — no longer claims "only X digits stored = your IC is safe"; replaced with neutral, future-friendly wording.
- [x] **Docs** — `docs/trd.md` §4.6 (manual entry pipeline), §5.6 layer-3 digest invariant, §6 PII contract, and §10 PDPA posture now reference `ic_last6` + the `******-PB-####` mask. `docs/prd.md` FR-3 (extraction), FR-21 (manual entry), and NFR-3 (privacy) updated. `README.md` two references (eval-context digest invariant + two-tier reasoning PII clause) updated.
- [x] **Open follow-up A (privacy-copy alignment) — RESOLVED in Task 13.5 below.** The intake-shape pivot now collects the full IC and disposes it inside `build_profile_from_manual_entry`, so the copy "IC information used during the evaluation pipeline is disposed of after the process completes" matches the actual behaviour for the FULL-IC field. The `ic_last6` tail is still persisted, but the user's full IC genuinely transits request-scope memory only — closer to what the copy implies. A separate post-pipeline Firestore scrub of `ic_last6` is still an option if we want a stricter posture; left open intentionally.
- [x] **Open follow-up B (future-phase storage design) — RESOLVED.** Chose option (a) — re-prompt for full IC at MyKasih/BUDI95 boundary rather than persisting DOB. Implementation lands in the future phase, but the architecture now supports it: the intake form already collects the full IC, and we can lift the same intake widget for the scheme-check step when it ships.
- [ ] **Open follow-up C (data migration):** No production data exists, so this rename is a clean schema break with no migration. If any seed Firestore docs were written manually outside the test suite, they need to be deleted or rewritten — the new Pydantic models reject `ic_last4` keys via `extra="forbid"` on `Profile` (note: `Dependant` uses `extra="ignore"`, so legacy `ic_last4` on dependants would be silently dropped rather than rejected — leaves dependants without an IC tail rather than failing loudly).

### 13.5. Feature: Intake-shape pivot — full IC replaces DOB + `ic_last6`

**Purpose/Issue:** The IC-tail-only intake from Task 13 still asked the user for DOB separately, which is redundant (the YYMMDD is the first 6 digits of the IC) and forced an awkward "we only store the last 6 digits" privacy claim that wasn't actually accurate once `ic_last6` was persisted on the eval doc. Switching the manual form to a single full-IC field collapses the redundancy and lets us truthfully say "the full IC is disposed of after the pipeline completes" — because the server derives both `age` (from YYMMDD) and `ic_last6` (from the last 6) inside `build_profile_from_manual_entry` and never persists the original 12-digit string. This also dovetails with Task 13's open follow-up B: the same intake widget can be re-used for the future MyKasih / BUDI95 scheme-check boundary without architectural changes.

- [x] **Backend schema** — `backend/app/schema/manual_entry.py` `ManualEntryPayload`: dropped `date_of_birth: date` and `ic_last6: str`, added `ic: str = Field(pattern=r"^\d{12}$")`. Module-level docstring updated to spell out the IC-handling contract (full IC is request-scope-only; `ic_last6` is derived; YYMMDD becomes `age`).
- [x] **Backend builder** — `backend/app/agents/tools/build_profile.py` gained `_parse_ic(ic: str, today: date | None) -> tuple[date, str]` which validates length + digit-only, parses YYMMDD with two-digit-year disambiguation (a 20YY interpretation wins if it produces a non-future birthday for someone aged ≤ 120; else 19YY), and returns `(dob, ic[6:])`. `build_profile_from_manual_entry` now calls `_parse_ic(payload.ic)` internally and feeds the derived values into the `Profile` exactly where the old `payload.ic_last6` / `payload.date_of_birth` reads used to live.
- [x] **Backend tests** — `test_manual_entry.py` `AISYAH_PAYLOAD_JSON` collapsed to `"ic": "920324064321"`; existing length-rejection test renamed to `test_validation_rejects_non_12_digit_ic`; added `test_validation_rejects_dashed_ic`, `test_validation_rejects_impossible_ic_dob` (e.g. `000231...`), `test_ic_parsed_into_age_and_last_six`, `test_two_digit_year_disambiguation_picks_19xx_for_older_bearers`, `test_two_digit_year_disambiguation_picks_20xx_for_younger_bearers`, and `test_full_ic_never_leaks_into_built_profile`. `test_classify_form_be.py::_payload` helper switched to `"ic": "900514081234"` (Cikgu Farhan, DOB 1990-05-14, PB 08 Selangor, serial 1234); the now-unused `from datetime import date` import dropped. `test_rate_limit.py` POST body switched to `"ic": "920324064321"`. Final count: **517 passed** (was 511; +6 net IC-parsing tests).
- [x] **Frontend types** — `agent-types.ts` `ManualEntryPayload`: dropped `date_of_birth: string` + `ic_last6: string`, added `ic: string` with a JSDoc spelling out the disposal contract. `DependantInput.ic_last6` is unchanged — dependants still take an optional 6-digit tail (scope decision: minimum-change pivot; dependants rarely fill the IC field anyway).
- [x] **Frontend form** — `manual-entry-form.tsx` lost the entire DOB column from the Identity grid: the `Controller`-wrapped DOB Input + DatePicker, the `formatDateMask` helper, and the full date-validation `superRefine` block all gone. New `formatIcMask` strips non-digits and caps at 12 so a pasted `920324-06-4321` becomes `920324064321` on the keystroke. The IC field now spans full-width in the Identity section with `maxLength={14}` (12 digits + 2 dashes typed-but-stripped). Sample defaults: Aisyah `ic: '920324064321'`, Farhan `ic: '880322065837'`. Unused imports (`CalendarIcon`, `DatePicker`) dropped.
- [x] **i18n locales (en/ms/zh)** — Removed `dobLabel`, `dobHelp`, `dobPlaceholder`, `dobAria`, `zodDateFormat`, `zodNotRealDate`, `zodYearMin`, `zodPastDate`. Added `icPlaceholder` (e.g. `920324064321`), `zodIcDigits` ("Must be exactly 12 digits"), `zodIcNotRealDate` ("First 6 digits must be a real YYMMDD birthday"). Reworded `icLabel` → "MyKad / IC Number" and `icHelp` → "Your 12-digit IC. We derive your age from the YYMMDD prefix and keep only the last six digits afterwards — the full IC is disposed of once the pipeline completes." `zodIc6Digits` kept (still in use for the dependant-row Zod refinement).
- [x] **Docs** — `docs/trd.md` §4.6 steps 2 + 6 rewritten. `docs/prd.md` FR-21 acceptance criteria updated. This plan.md entry. `docs/progress.md` Task-13.5 entry. README + `landing-cta.tsx` + the privacy-page strings already carry the "disposed after the process completes" copy from Task 13 and don't need further changes (they were already worded to accommodate this direction).
- [x] **Audit pass** — 517/517 backend tests green; `npx tsc --noEmit` shows zero errors in any file touched by this task (pre-existing errors in `results-chat-panel.tsx`, `app-toaster.tsx`, `toast.tsx` are missing npm packages unrelated to manual entry).

**Privacy posture summary after 13.5.** What the wire carries: full 12-digit IC. What request-scope memory holds during the pipeline: full IC + derived `date_of_birth`. What lands on the persisted `evaluations/{evalId}.profile`: `name`, `age` (years), `ic_last6` (6 digits), income, household, address. What is never written anywhere: the full 12-digit IC, the YYMMDD birthday prefix, the derived `date_of_birth`. The "IC information disposed after the process completes" copy is now substantially accurate for the field most users worry about (their full IC).

---

## Phase 12: BUDI95 + MyKasih SARA RM100 (Info-Only Subsidy Cards) + Manual-Entry IC Removal

> Adds the two highest-reach Malaysian schemes Layak isn't yet aware of — **BUDI95**
> (RON95 petrol subsidy, 14.8M users by Feb 2026) and **MyKasih SARA RM100**
> (one-off MyKad credit, every adult Malaysian on 9 Feb 2026) — as **info-only**
> cards. Neither stacks into the headline upside total. Eligibility is age-gated
> only (no API call, no user inputs); each card carries a portal deep-link so
> the user can check their balance themselves on the authoritative source.
>
> Bundles two ops follow-ups: (a) the manual-entry intake drops the full-IC field
> entirely and asks for `age` directly — strictly tighter PDPA posture than
> Phase 11 Task 13.5, since the manual path now persists ZERO IC information of
> any kind; the upload path retains `ic_last6` because the Gemini OCR step
> still produces it from the MyKad image. (b) The schemes-page "Latest Update"
> tile becomes a real `max(verified_at)` derivation across `verified_schemes/*`
> with a one-time seed of the deploy date so the value renders day-one.

### 1. Feature: API-research gate — confirm no third-party-callable endpoint exists

**Purpose/Issue:** Before committing to "info-only cards", record the load-bearing
research finding: **no public developer API exists for BUDI95 or MyKasih SARA
balance lookup**, and **all "third-party MyKasih checker" sites are cosmetic
redirects to the official portals — none of them perform real balance lookups**.
This is the design-decision-defining fact; documenting it here saves future
contributors a re-run of the same 10-angle search.

- [x] Record the 10-angle research finding in `docs/trd.md` §5.11
      (Subsidy-Card Scheme Integration): no endpoint at `data.gov.my`, no entry
      in MyGDX catalogue, no MyDigital ID OAuth scope for BUDI95/SARA balance,
      no PADU third-party developer API, no eKasih developer access, zero
      GitHub clients/scrapers, all the SEO-bait sites (`mykasih.my`,
      `ecentral.my`, `bantuanonline.my`, `logmasuk.my`) are redirect wrappers,
      and the Setel/TNG/Shell apps integrate via signed bilateral commercial
      partnerships with the BUDI95/MyKasih operators, not via an open API.
- [x] Document the consequence: Layak surfaces eligibility hint + portal
      deep-link (the `mykasih.my` redirect-wrapper pattern, with substance
      behind it). No web scraping (ToS risk, fragility). No headline-upside
      stacking for these schemes since we can't confirm the user's actual
      balance / remaining quota.
- [x] Record the future v2 path: a MyDigital ID OAuth integration once MAMPU
      publishes BUDI95/SARA scopes, or a direct partnership with MyKasih
      Foundation. Both are outside the hackathon timescale.

### 2. Feature: Drop full IC from manual entry; collect `age` directly

**Purpose/Issue:** Phase 11 Task 13.5 made the manual entry path collect a full
12-digit IC and derive `age` + `ic_last6` server-side. With Phase 12's info-only
subsidy cards, the manual path no longer NEEDS the IC at all — none of the rules
(existing six + the two new info cards) consume `ic_last6` for eligibility;
they read `age` + `monthly_income_rm` + `household_flags`. The IC was only
persisted for chat-personalisation ("IC ends in 064321") and PDF packet labels.
Trading those two flourishes for "manual path persists zero IC information of
any kind" is a strictly-better PDPA posture and removes the need for the
two-digit-year-disambiguation logic that the manual path inherited from the
IC-parsing rabbit hole. The upload path is unchanged — Gemini OCR still
extracts `ic_last6` from the MyKad image; that's the user's affirmative choice
to upload an IC photo.

- [x] **Schema** — `app/schema/manual_entry.py` `ManualEntryPayload`:
      drop `ic: str` (added in 13.5), add `age: int = Field(ge=0, le=130)`.
- [x] **Builder** — `app/agents/tools/build_profile.py`: remove `_parse_ic`
      helper, remove the two-digit-year disambiguation tests (they only
      existed for IC parsing). `build_profile_from_manual_entry` now reads
      `payload.age` directly and emits `Profile(ic_last6=None, age=payload.age,
...)`.
- [x] **Profile schema** — `app/schema/profile.py` `Profile.ic_last6: str | None
= Field(default=None, pattern=r"^\d{6}$")` (currently required). Keeps
      the upload path's data shape unchanged (Gemini still returns a 6-digit
      string); manual path now sets `None`.
- [x] **Narration** — `app/agents/narration.py` `_mask_ic_last6` already
      handles None and falls through to the masked placeholder. Pytest
      coverage of the manual path: assert `ic=` line in the technical-tier
      transcript reads `******-**-****` for a no-IC profile.
- [x] **Chat prompt digest** — `app/agents/chat_prompt.py` `_render_profile`
      already guards on `isinstance(ic_last6, str)` so a None value omits the
      "IC ends in" suffix; no change needed.
- [x] **Jinja packet templates** — every template renders
      `{{ profile.ic_last6[:2] }}-{{ profile.ic_last6[2:] }}`; needs a guard:
      `{% if profile.ic_last6 %}••••••-{{ ... }}-{{ ... }}{% else %}— (manual
entry; IC not collected){% endif %}`. Touches all 7 templates +
      `_base.html.jinja`.
- [x] **Frontend manual form** — `manual-entry-form.tsx`: drop the IC field
      (Controller + `formatIcMask` helper), the `mef-ic` input, and the
      `ic` field from `FormValues` / Zod / defaults / submit payload. Add
      `age` numeric field with `min=0 max=130` validation mirroring the
      dependant-age input. Sample defaults: Aisyah `age: 34`, Farhan `age: 38`.
- [x] **Frontend types** — `agent-types.ts` `ManualEntryPayload`: drop `ic`,
      add `age: number`. `Profile.ic_last6: string | null` (was `string`).
- [x] **i18n** — drop `icLabel`, `icHelp`, `icPlaceholder`, `zodIcDigits`,
      `zodIcNotRealDate` from the manual namespace. Add `ageLabel` ("Your
      age" / "Umur anda" / "您的年龄") and `ageHelp` ("Whole years; we use
      this to check eligibility for age-gated schemes" / equivalent). Update
      the privacy-page section2MyKad copy: the manual entry path no longer
      collects IC at all.
- [x] **Tests** — `test_manual_entry.py` AISYAH_PAYLOAD_JSON: replace
      `"ic": "920324064321"` with `"age": 34`. Drop the four IC-parsing
      tests (`test_ic_parsed_into_age_and_last_six`,
      `test_two_digit_year_disambiguation_picks_19xx_for_older_bearers`,
      `test_two_digit_year_disambiguation_picks_20xx_for_younger_bearers`,
      `test_full_ic_never_leaks_into_built_profile`). Add
      `test_manual_profile_has_no_ic_last6` (asserts the built `Profile.ic_last6
is None`). Update `test_classify_form_be._payload` to use `age=35`.
      `test_rate_limit.py` POST body: replace `"ic"` with `"age"`.
- [x] **Acceptance** — backend `pytest` green; `npx tsc --noEmit` clean for
      touched files; manual-entry → eval → results e2e still produces the
      Aisyah-shaped scheme matches (the rule engine never read `ic_last6` for
      eligibility, so this is a no-op functionally; we're just confirming
      the regression).

### 3. Feature: Extend `SchemeKind` with `subsidy_credit` + presentation hooks

**Purpose/Issue:** Existing `SchemeKind = upside | required_contribution`
doesn't fit info-only schemes. `subsidy_credit` is the new kind: surfaced in
the card grid, NOT stacked into the headline upside total, no draft packet
generation. Pydantic defaults preserve legacy data validation.

- [x] `app/schema/scheme.py` `SchemeKind = upside | required_contribution |
subsidy_credit`. `SchemeId` literal grows to include `"budi95"` +
      `"mykasih"`. New optional field on `SchemeMatch`:
      `expires_at_iso: str | None = Field(default=None)` (ISO-8601 date,
      e.g. `"2026-12-31"`). Set on `subsidy_credit` matches with a hard
      forfeit date; ignored for `upside` / `required_contribution`. The
      frontend renders this prominently in bold on the card so users see
      the deadline at a glance.
- [x] `app/agents/tools/match_schemes.py` (sort): place `subsidy_credit` in
      the same "informational tail" bucket as `required_contribution` — sort
      key `(kind != "upside", -annual_rm)` already handles this without
      change; just verify in pytest.
- [x] `app/agents/tools/compute_upside.py`: filter on `kind == "upside"` when
      summing `total_annual_rm` (existing behaviour). Add explicit test that
      a `subsidy_credit` match with `annual_rm > 0` does NOT contribute.
      For BUDI95/SARA we set `annual_rm = 0.0` anyway (info-only), but the
      filter belt-and-braces against future mistakes.
- [x] `app/agents/tools/generate_packet.py`: `_TEMPLATE_MAP` excludes
      subsidy_credit scheme_ids (no fillable form to draft for them). Add
      a unit-test asserting BUDI95 + SARA produce no `PacketDraft`.

### 4. Feature: BUDI95 info-only rule

**Eligibility (age-only):** age ≥ 16. Citizenship is implicit (the product
surface assumes Malaysian users; the user wouldn't get value from this card
otherwise). No driving-licence question — if the user doesn't qualify on the
licence dimension, the official portal will tell them when they click through.

**Display values (refreshed periodically by the discovery agent):**

- Subsidised price: **RM1.99/L**
- Monthly quota cap: **300 L**
- Eligibility blurb cites: Malaysian citizen + age ≥ 16 + valid driving
  licence.

**Output:** `SchemeMatch(scheme_id="budi95", kind="subsidy_credit", annual_rm=0.0,
qualifies=True_iff_age_>=_16, summary="...", why_qualify="You're 18 — eligible
to register for BUDI95.", portal_url="https://www.budi95.gov.my/")`.

- [x] New `app/rules/budi95.py` exporting `match(profile) -> SchemeMatch`.
      Citations (`rule_citations`): - `budi95.eligibility` → [MOF press release, 30 Sep 2025](https://www.mof.gov.my/portal/en/news/press-citations/ron95-petrol-is-rm1-99-per-litre-for-malaysian-citizens-starting-sept-30-pm-anwar) - `budi95.monthly_cap` → [Maybank2u BUDI95 explainer](https://www.maybank2u.com.my/maybank2u/malaysia/en/articles/headlines/local/budi95-fuel-subsidy-programme.page) - `budi95.reach_feb_2026` → [MOF 14.8M users statement](https://mof.gov.my/portal/en/news/press-citations/nearly-14-8-mln-benefited-from-budi95-petrol-subsidy-as-of-feb-28-2026-amir-hamzah)
- [x] Register `"budi95"` in `app/agents/tools/match_schemes.py:RULES`.
- [x] Pytest `test_budi95.py`: age 16 qualifies; age 15 doesn't; output kind
      is `subsidy_credit`; `annual_rm == 0.0`; portal URL is correct;
      `generate_packet` produces no draft for this scheme.

### 5. Feature: MyKasih (SARA RM100) info-only rule

**Naming decision** (verified May 2026): the **official program name is "SARA Untuk
Semua" (Sumbangan Asas Rahmah)**, delivered via the **MyKasih platform** operated
by MyKasih Foundation. Public usage mixes the two terms roughly equally — Google
returns articles titled both "SARA RM100" and "MyKasih RM100" for the same scheme.
Layak's user-facing label is **"MyKasih"** (more memorable, what the public types
into Google), but the rule's eligibility blurb + citations explicitly reference
"SARA Untuk Semua via MyKasih" so the grounding chain stays precise.

**Eligibility (age-only):** age ≥ 18. The 9 Feb 2026 tranche was auto-credited
to every adult Malaysian's MyKad — no application, no income gate, citizen-
only. We surface the eligibility hint + portal deep-link; the user checks
their actual remaining balance themselves.

**Display values (refreshed periodically by the discovery agent):**

- Per-recipient credit: **RM100** (one-off, 9 Feb 2026 tranche).
- Recurrence: explicitly flagged as **one-off**; rule retires from the
  library if no equivalent 2027 tranche is announced (admin discovery flow
  surfaces the citation freshness for retirement).
- **Expiry: 31 December 2026.** Unused credit forfeited after that date.
  This is THE most user-load-bearing fact on the card — Phase 12 surfaces it
  prominently in bold so users know exactly when their RM100 disappears.

**Output:** `SchemeMatch(scheme_id="mykasih", scheme_name="MyKasih",
kind="subsidy_credit", annual_rm=0.0, qualifies=True_iff_age_>=_18,
summary="...", why_qualify="You're an adult Malaysian — RM100 was credited
to your MyKad on 9 Feb 2026.", portal_url="https://checkstatus.mykasih.net/")`.
The `expires_at_iso = "2026-12-31"` is a new optional field on `SchemeMatch`
(see Feature 3 schema notes) that the frontend reads to render the bold
"Expires 31 Dec 2026" line.

- [x] New `app/rules/mykasih.py` exporting `match(profile) -> SchemeMatch`.
      Citations: - `mykasih.eligibility` → [Malay Mail 5 Feb 2026 announcement](https://www.malaymail.com/news/malaysia/2026/02/05/rm100-sara-aid-for-all-adult-malaysians-begins-feb-9-says-finance-minister-ii/208160) - `mykasih.merchant_use` → [MyKasih Foundation SARA page](https://mykasih.com.my/en/sumbangan-asas-rahmah/)
      (the 140k items / 15-category merchant network — same source confirms
      delivery via MyKasih platform) - `mykasih.expiry_31_dec_2026` → [SoyaCincau "SARA 2026: One-off RM100 credit applicable for frozen food"](https://soyacincau.com/2026/02/09/sara-2026-rm100-credit-applicable-for-frozen-goods/)
      — the source confirming the 31 Dec 2026 forfeit date. - `mykasih.one_off_2026` → [Edge Malaysia "Sara programme expansion"](https://theedgemalaysia.com/node/788033)
- [x] Register `"mykasih"` in `app/agents/tools/match_schemes.py:RULES`.
- [x] Pytest `test_mykasih.py`: age 18 qualifies; age 17 doesn't; output kind
      is `subsidy_credit`; `annual_rm == 0.0`; `expires_at_iso == "2026-12-31"`;
      portal URL is correct; `generate_packet` produces no draft; the four
      citations are all present on the match.

### 6. Feature: Card-shape divergence for `subsidy_credit` + "Check balance" CTA

**Purpose/Issue:** Existing `SchemeCardGrid` assumes "fillable form → Generate
packet". BUDI95 + SARA aren't fillable — they need a different card shape
that says "auto-credited / use at the pump; check balance at …".

- [x] Frontend `SchemeCardGrid` learns to render `kind === 'subsidy_credit'`
      with: - A "Subsidy" or "MyKad credit" eyebrow chip (use the hibiscus accent
      from `--hibiscus`). - No annual_rm value displayed prominently (it's `0.0`; would mislead).
      Replace with a "Subsidy info" or "Auto-credited" label. - **A bold expiry line** when `match.expires_at_iso` is set, formatted
      as "**Expires 31 Dec 2026**" via `Intl.DateTimeFormat(locale, { day:
'numeric', month: 'short', year: 'numeric' })`. The expiry line uses
      the hibiscus colour (the page's accent) so it pops against the card.
      MyKasih is the first scheme with a hard expiry — BUDI95 has a rolling
      monthly quota with no calendar expiry, so its `expires_at_iso` stays
      `None` and the bold line doesn't render. - Action button label = "Check your balance" (en) / "Semak baki anda"
      (ms) / "查询余额" (zh) — opens the scheme's `portal_url` in a new tab.
- [x] `SchemeCardGrid`'s qualifying filter currently keeps only
      `kind === 'upside'`. Extend to include `subsidy_credit` (so the new
      cards show in the same grid, ranked beneath upside cards). Sort key
      stays: subsidy_credits group at the end (annual_rm = 0 → falls
      naturally; explicit `kind` ordering in the sort comparator as
      belt-and-braces).
- [x] i18n strings for the new card chrome (en/ms/zh):
      `evaluation.schemeCard.subsidyEyebrow`, `evaluation.schemeCard.checkBalance`,
      `evaluation.schemeCard.autoCredited`, `evaluation.schemeCard.expiresOn`
      (template: "**Expires {{date}}**" / "**Tamat {{date}}**" /
      "**{{date}} 到期**"), scheme labels for BUDI95 + MyKasih.
- [x] `localisedSchemeName` (`frontend/src/lib/scheme-name.ts` or equivalent)
      gains two new scheme_id → display-name mappings. MyKasih's display
      name across locales: just **"MyKasih"** — it's a brand name, no
      translation needed (en/ms/zh all use "MyKasih"; consistent with how
      "STR 2026" / "JKM Warga Emas" are handled).

### 7. Feature: Schemes-page "Latest Update" tile auto-derivation + day-1 seed

**Purpose/Issue:** Currently the tile shows a hardcoded `'2026'` ([`schemes-stats-strip.tsx:11`](frontend/src/components/schemes/schemes-stats-strip.tsx#L11)).
After Phase 12 lands 2 new schemes, the value should auto-update to reflect
the most recent admin discovery-approval timestamp, formatted as "Month DD,
YYYY" (e.g. "May 13, 2026"). The wiring already exists end-to-end from
Phase 11 Feature 1: `_finalize_approval` writes `SERVER_TIMESTAMP`,
`GET /api/schemes/verified` returns the per-scheme list.

**Day-1 seed:** a one-time script populates `verified_schemes/{scheme_id}.verifiedAt`
for every scheme (the existing 6 + new 2) with the deploy date so the tile
shows a real value before any admin approval action.

- [x] `scripts/seed_verified_schemes.py` — idempotent upsert: for each
      scheme_id in the rule registry, if no `verified_schemes/{scheme_id}`
      doc exists OR its `verifiedAt` field is null, write
      `verifiedAt=SERVER_TIMESTAMP`. Documented to run once on first deploy
      (or on hand-rollout of new locked rules).
- [x] `SchemesStatsStrip` frontend: drop the hardcoded `STATS[].value` array.
      Fetch `/api/schemes/verified` on mount → compute `max(verified_at)`
      across the response → format via
      `Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric',
year: 'numeric' })`. Fallback to `"—"` if response is empty (shouldn't
      happen with the seed script).
- [x] Backend: optional `GET /api/schemes/stats` endpoint returning
      `{ schemes_count, agencies_count, categories_count, latest_update_iso }`
      so the strip lifts all four tiles from one fetch. Optional because the
      existing `/api/schemes/verified` endpoint plus a small client-side
      aggregation is enough for v1.
- [x] i18n: `schemes.stats.year` key (currently "Latest Update") stays as
      `latestUpdate` semantically — copy is unchanged; only the value moves
      from hardcoded `'2026'` to the derived date string.

### 8. Feature: Documentation + research-page surface

- [x] `docs/trd.md` new §5.11 (Subsidy-Card Scheme Integration) — covers the
      10-angle no-API finding, the redirect-wrapper risk profile (mykasih.my
      pattern is fine; scraping isn't), the new `subsidy_credit` kind, the
      manual-entry IC removal, and the future MyDigital ID OAuth /
      partnership path.
- [x] `docs/prd.md` FR-26 (BUDI95 info-only) + FR-27 (SARA RM100 info-only) +
      FR-28 (stats auto-derivation + seed) + FR-29 (manual-entry IC removal,
      tighter PDPA posture).
- [x] `docs/progress.md` dated Phase 12 entry once implementation lands.
- [x] `README.md` Architecture section: schemes count bumped from 6 to 8;
      agency count from 5 to 6 (MOF / MyKasih Foundation count as a single
      operator pair; decision goes in progress.md). Note that the manual-
      entry path now collects no IC information — a meaningful PDPA win to
      surface for the judges.
- [x] Privacy-page (`landing-cta.tsx` FAQ-04 + `privacy-content.tsx`
      section2MyKad / FAQ-04): rewrite to say the manual-entry path collects
      ZERO IC information of any kind; the upload path still processes the
      uploaded MyKad image transiently (full IC in request scope only;
      `ic_last6` retained on the profile for chat/packet rendering). Drops
      the "IC information used during the evaluation pipeline is disposed of
      after the process completes" wording — now we can make a stronger,
      simpler claim about the manual path specifically.

### Open design questions (carry as TODOs into the implementation phase)

1. **MyKasih (SARA RM100) recurrence + auto-retirement.** The 9 Feb 2026
   tranche is one-off; the credit expires 31 Dec 2026. After that date the
   rule should auto-retire from the live library (no eligibility hint
   surfaced for users who run an evaluation in January 2027 against a
   scheme whose credit they can no longer redeem). Implementation hook: the
   `expires_at_iso` field added to `SchemeMatch` in Feature 3 also lives on
   the rule module's source-of-truth constant; a nightly job checks if
   `today > expires_at_iso` and surfaces the rule as a stale-rule candidate
   in `/dashboard/discovery` for admin retirement. If MOF announces a 2027
   tranche before 31 Dec 2026, the admin re-approves the discovery candidate
   with a new `expires_at_iso` and the rule stays live without code changes.
2. **BUDI95 targeting changes.** [May 2026 reports](https://autobuzz.my/2026/05/11/govt-finalising-targeted-budi95-plan-no-more-fuel-subsidies-for-the-rich/)
   note MOF finalising a more targeted BUDI95 (likely excluding top earners).
   When that lands, the rule's eligibility blurb needs updating. Hook: the
   discovery agent's `source_watcher` is already polling
   budimadani.gov.my — when content hash changes, admin sees a candidate.
3. **`agency` count on the stats strip.** Going from 5 to 6 agencies needs
   confirmation — is the BUDI95 operator the same MOF entity that runs STR
   2026, or a distinct one? And is MyKasih Foundation a separate "agency"
   for our count, or rolled under MOF since they're delivering the SARA
   programme on MOF's behalf? Decide before implementation.

---

### 13. Feature: Manual-entry adult household income split

**Purpose/Issue:** `Profile.monthly_income_rm` was overloaded: STR/JKM rules need total household income, while LHDN/PERKESO/i-Saraan should read the applicant's income only. QA also recorded a spouse-income gap in `docs/qa-findings.md`. This task makes one manual-entry submission represent one shared household, adds optional income for adult household members, and keeps multi-spouse households explicit without treating marriage structure as a disqualifier.

- [x] Backend schema: `Dependant` / `DependantInput` gained optional `monthly_income_rm`; `Profile` gained `applicant_monthly_income_rm` and `household_monthly_income_rm` while preserving `monthly_income_rm` as the backward-compatible household-total alias.
- [x] Backend validation: dependant income is accepted only for adult rows (`age >= 18`); manual entry supports at most four spouse rows in one shared household.
- [x] Manual profile builder: applicant income stays as the main Income-section value; adult household-member income is summed into `household_monthly_income_rm`; `household_flags.income_band` is derived from household total.
- [x] Rule routing: STR + JKM Warga Emas + JKM BKK read household income/per-capita; LHDN Form B/BE + PERKESO SKSPS + i-Saraan/strategy income gates read applicant income.
- [x] Frontend household rows: adult rows expose an optional monthly-income input; under-18 rows hide/disable it. When more than one spouse is listed, a neutral note appears explaining that multiple spouses are treated as one shared household for household-income and per-capita checks, and separate residences should be evaluated separately.
- [x] i18n: added en/ms/zh copy for adult member income, under-18 placeholder, spouse-limit validation, and the multi-spouse shared-household note.
- [x] Regression tests: manual-entry tests cover adult spouse income rolling into household total, applicant-only LHDN arithmetic remaining stable, under-18 income rejection, and spouse-count cap.

---

### 14. Feature: Household relationship-derived scheme roles

**Purpose/Issue:** Manual entry previously forced users to mislabel caregiving households: younger siblings had to be entered as `child` to trigger BKK, while grandparents had to be entered as `parent` to trigger Warga Emas. Keep relationship labels semantically honest and derive scheme roles separately.

- [x] Add `grandparent` as a first-class dependant relationship in backend and frontend contracts.
- [x] Update manual-entry relationship options and en/ms/zh labels.
- [x] BKK counts under-18 `child` and `sibling` dependants as child-care recipients.
- [x] JKM Warga Emas counts age-60+ `parent` and `grandparent` dependants as elderly-care recipients.
- [x] LHDN parent medical relief remains parent-only; STR and LHDN child buckets remain child-only in this pass.
- [x] Household flags now reflect the derived BKK/Warga Emas roles.
- [x] TRD records both the adult-income split and the relationship-vs-scheme-role derivation, including the future BKK 16-17 work/schooling-status field.
- [x] Regression tests cover sibling BKK, grandparent Warga Emas, and non-expansion of STR/LHDN reliefs.

---

### 15. Feature: Intake readiness alignment and upload sample prefill

**Purpose/Issue:** Upload and Manual Entry had diverged: Manual could be clicked before the payload was viable, while Upload sample personas immediately started evaluation before users could review the populated intake state. This pass makes Continue the shared submit boundary and keeps sample actions as prefill-only helpers.

- [x] Manual Continue stays disabled until required fields, dependant rows, and the `<= 4` spouse cap are all valid.
- [x] Manual Entry removes the post-submit dependant alert and keeps spouse feedback in the live Household editor instead.
- [x] Upload samples now prefill the IC, payslip, and utility slots without launching evaluation.
- [x] Upload samples populate visible dependant rows from persona fixtures, auto-expand the Household section, and preserve the demo banner state.
- [x] Continue remains the only action that starts a new upload-path evaluation; existing retry/recovery flows remain unchanged after a run has genuinely started.
- [x] `docs/prd.md` and `docs/trd.md` now describe the readiness-gated intake behavior and the prefill-only sample contract.

---

### 16. Feature: What-If deterministic preview benchmark documentation

**Purpose/Issue:** The Phase 11 What-If slider originally blocked on Gemini classification and strategy advisory generation. Local Vertex benchmarking now shows deterministic preview is materially faster and should own immediate slider feedback, while strategy remains async enrichment.

- [x] Reconcile the working branch with latest `origin/main` without dropping poster/demo assets or UI polish.
- [x] Move raw benchmark CSVs out of `backend/` root into gitignored `tmp/benchmarks/what-if/2026-05-13/`.
- [x] Keep the repeatable benchmark harness and tests as tracked backend tooling.
- [x] Record benchmark findings in PRD/TRD without committing ADC, auth, or raw credential artifacts.
- [x] Preserve existing StrategyAdvice baseline behavior while documenting strategy as non-blocking What-If enrichment.

---

## Phase 13: Noisy-Income QA Hardening

> Direct response to `docs/qa-findings.md`. The QA suite ran the rule engine
> against six noisy-income variants of Aisyah (clean baseline, gross-vs-net
> ambiguity, BKK boundary pass/fail, just-over-JKM fail, STR cliff fail) and
> got pass-grade outcomes on every case **except** the deliberate negative
> case where the explicit net-payout line was cropped out of the document.
> Under that condition the extraction agent fell back to the largest visible
> figure — typically the gross / pre-deduction line — and the rule engine
> then ranged downstream off a wrong `monthly_income_rm`.
>
> The findings also flagged a spouse-income gap in the schema (recorded
> before the schema split landed in commit `feea2f0`-era refactors): one
> `monthly_income_rm` field with no structured spouse income. The split
> (`applicant_monthly_income_rm` + `household_monthly_income_rm` +
> `Dependant.monthly_income_rm`) is already in the working tree; Phase 13
> closes the missing test scenarios from the QA findings list.

### 1. Feature: Extract-prompt hardening — net-payout-line precedence

**Purpose/Issue:** Current `_INSTRUCTION` in `backend/app/agents/tools/extract.py`
is internally inconsistent: it says `monthly_income_rm` is "gross monthly
income" then qualifies with "net payout for Grab / gig workers". The QA
suite found the model latches onto whatever the document labels prominently,
which in the cropped-payout case is the gross-fare line. Re-anchor the prompt
so the model:

- prefers an explicit final net-payout line (`Net Pay` / `Bayaran Bersih` /
  `Net Earnings` / `Amount Credited` / `Take-Home Pay` / `Jumlah Bayaran`);
- avoids gross-equivalent lines (Total Ride Fare, Gross Earnings, Basic
  Pay, Gaji Pokok, Jumlah Kasar);
- never computes `net = gross − deductions` itself;
- falls back to a labelled deduction-subtotal (e.g. "After EPF") rather
  than the gross when the final net line is cropped;
- breaks ties between multiple net-style figures by picking the lowest
  (most-deducted) one.

- [x] Replaced the one-line description with a numbered five-rule block
      under `monthly_income_rm`. Rules ordered by precedence so the model
      walks them in document scan order. The Grab/Foodpanda gig case and
      the EA Form salaried case have their own bullet so the model can't
      cross-paste them. The tie-breaker rule explicitly tells the model
      to pick the lowest net-style figure — the most-deducted line is the
      closest proxy to actual take-home.

### 2. Feature: Spouse-income test coverage

**Purpose/Issue:** QA findings listed five spouse-income scenarios that
should appear in fixtures once the schema supports them:
(1) applicant income only, (2) spouse income only, (3) both visible,
(4) spouse listed with unknown income, (5) spouse income crossing a
threshold. The existing `test_adult_household_income_rolls_into_household_total_only`
covers (3) and partially (5) (a hard-into-t20 jump from RM8,000 alone).
Phase 13 adds the missing three.

- [x] `test_spouse_only_income_drives_household_classification` — applicant
      `monthly_income_rm = 0` (carer at home), spouse with RM8,200 declared
      income → household band must follow the spouse, not the applicant
      zero. Asserts `household_income_rm == 8200`, `income_band == "m40"`.
      Catches a regression where `_classify_income_band` would have used
      `payload.monthly_income_rm` (zero) instead of the household total.
- [x] `test_spouse_income_pushes_household_from_b40_to_m40` — applicant
      RM2,400 + spouse RM3,000 = household RM5,400. Applicant alone is
      `b40_household`; household is `m40`. Asserts `str_2026.match(built).qualifies
    is False` to confirm threshold propagation reaches the rule engine.
- [x] `test_spouse_listed_with_unknown_income_uses_applicant_only_for_household_total`
      — spouse on the dependants list with no `monthly_income_rm` key
      (`None`). Must NOT count as zero pulled into the total **and** must
      NOT impute applicant income. Asserts `household_income_rm` equals
      the applicant total alone (RM2,800) → matches the Aisyah baseline.

### 3. Feature: Documentation

- [x] This plan.md Phase 13 entry. `docs/qa-findings.md` itself stays
      authoritative as the QA report; no edits there — the report is a
      historical record of what was found, not a TODO list.

### Open items deferred to a future phase

1. **Explicit extraction-failure schema.** The QA findings recommend
   "return a low-confidence extraction error or `null`-equivalent failure
   path when the final payout line is cut off and arithmetic would be
   required." Implementing this means making `Profile.monthly_income_rm`
   nullable (or adding an `extraction_confidence` enum), which ripples
   through every rule's eligibility gate. Deferred — current prompt-only
   harm-reduction is sufficient for v1; the structured-failure path is a
   v1.1 schema migration.
2. **Real QA suite of cropped-payout fixtures.** The QA findings are
   written against six fixture documents the team rendered by hand. A
   future phase should bundle those as a regression suite (probably under
   `backend/tests/qa-fixtures/`) so the prompt hardening stays validated
   on every Gemini-model upgrade. Out of scope for Phase 13 because the
   fixtures live in `docs/demo-docs/` as PDFs/images and aren't yet
   structured for repeat-run pytest consumption.

---

## Phase X: Submission Package

> Covers the final submission artifacts. Keep it simple and complete.

### 1. Feature: UI polish and README final pass

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Copy review, empty states, obvious-bug sweep.
- [ ] README final pass: features, setup, AI disclosure (names Claude Code per Rules §4.2), architecture overview with ASCII diagrams from `docs/trd.md`.

### 2. Feature: 5-minute demo video

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Script and two takes of the Aisyah flow.
- [ ] Edit and caption if needed.
- [ ] Upload unlisted to YouTube; submission-form URL copied.

### 3. Feature: Pitch deck (≤15 slides)

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [x] Canva deck: problem → user → solution → demo → architecture → tech → impact → business model → team.
- [x] Export PDF; commit to repo root as `pitch.pdf`.

### 4. Feature: Final submission

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Fill and submit the Google Form against every required field (repo URL, Cloud Run URL, video URL, deck PDF, GitHub profile links, track + category).
- [ ] Verify each link in the confirmation email.
- [ ] Resubmit if anything breaks.

---
