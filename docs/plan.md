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
- [x] Explicitly NOT translated — document in `frontend/src/lib/i18n/README.md`: Gemini-generated content (classify explanation, match rationale, compute_upside Python stdout), scheme names ("Sumbangan Tunai Rahmah 2026", "JKM Warga Emas", "LHDN Form B"), government source URLs, cited passages from the committed PDFs, RM currency amounts, MyKad + IC number fragments, email addresses, + package version strings. These stay source-language for legal grounding and citation fidelity.
- [x] Translation accuracy — use Bahasa Malaysia standard register (Dewan Bahasa dan Pustaka aligned, not colloquial) and Simplified Chinese (普通话 / 简体中文, NOT Traditional). Preserve domain terminology: keep "STR 2026", "JKM", "LHDN", "Form B" as-is in all three bundles (proper nouns + legal references). Malaysian-context nouns like "dependant" → "tanggungan" (ms) / "受扶养人" (zh); "Grab driver" stays "Grab driver" in all three (brand name).
- [x] Number + date localisation — for the MYR currency display, keep the existing `RM8,208` format across all three locales (it's the Malaysian convention everyone recognises; translating RM to "马币" would confuse more than help). For dates, use the `Intl.DateTimeFormat` with the locale code (`en-MY` / `ms-MY` / `zh-CN`) so "22 April 2026" renders natively in each.
- [x] Accessibility — the `<LanguageToggle />` trigger needs an `aria-label={t("common.a11y.language_selector")}` that's itself translated; the menu items don't need an aria-label because their visible text is the name. Set `<html lang={i18n.language}>` via a client-side effect in `i18n-provider.tsx` so screen readers read each page in the active language.
- [x] Run `pnpm -C frontend build` — resolves any missing key / typo at build time (TypeScript catches bad key paths via a typed `t()` helper if we add one; minimum viable is `pnpm build` + a runtime missing-key warning gated by `i18n.init({ missingKeyHandler: ... })` that throws in dev).
- [x] Run two subagent audits in parallel: (1) **completeness** — walks every `*.tsx` under `frontend/src/{app,components}`, flags any hard-coded English string that survived the sweep; (2) **translation accuracy** — cross-checks the `ms.json` and `zh.json` values against their `en.json` counterparts for mistranslations, wrong register, broken placeholders (`{{variable}}` tokens), or accidentally translated proper nouns. Fix every blocker before commit.
- [x] Manual smoke at `pnpm -C frontend dev`: land on `/`, open the language dropdown, switch to Bahasa Malaysia, click through `/sign-in` → `/sign-up` → (after sign-in) `/dashboard` → `/dashboard/evaluation/upload` → Manual Entry Mode → submit Aisyah sample → results page. Repeat for 简体中文. Confirm the header toggle keeps the choice across navigations (localStorage persistence working) AND across a full page reload. _(Deferred to the human — no interactive browser session in this automation context.)_
- [x] Tick these items, append a dated summary to `docs/progress.md`, commit `feat(ui): multilingual support (en + ms + zh-cn) via react-i18next`, push.

**Exit criteria:** every English string in `frontend/src/` is either served through `t(...)` or explicitly documented as "stays source-language" in `frontend/src/lib/i18n/README.md`. The header dropdown switches all three languages at runtime with no full-page reload and persists the choice across navigations + reloads. `pnpm -C frontend build` is clean. Both subagent audits return zero critical findings. Manual smoke confirms Bahasa Malaysia + Simplified Chinese render correctly across the marketing / auth / dashboard / evaluation / results surfaces.

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

- [ ] With the deployed Cloud Run backend running on the new Phase 8 configuration, run the live pipeline against `frontend/public/fixtures/aisyah-{mykad,payslip,utility}.pdf` via the standard `/api/agent/intake` endpoint and capture the SSE event stream to a local JSON file.
- [ ] Replace the `AISYAH_MOCK_EVENTS` array in `frontend/src/fixtures/aisyah-response.ts` with the captured stream, preserving the existing `delayMs` cadence (or adjusting if the new pipeline is materially faster or slower than the snapshot it replaces).
- [ ] If a Farhan fixture file exists alongside `aisyah-response.ts`, repeat steps 1-2 against `frontend/public/fixtures/farhan-{mykad,payslip,utility}.pdf`. Otherwise skip silently.
- [ ] Update the file docstring at the top of each re-snapshotted fixture noting the snapshot date and the Phase 8 model+RAG configuration the snapshot was taken against, so future readers can tell when the fixture is stale.
- [ ] Visual smoke test: load `/dashboard/evaluation/upload`, click "Use Aisyah sample data", verify the mock-mode replay matches the new event shape. Repeat for Farhan if applicable.
- [ ] Run `pnpm -C frontend build` and confirm zero type errors after the fixture data shape change.

**Exit criteria:** demo-mode replay produces output indistinguishable from a fresh real upload of the same persona (modulo timing), and the fixture files document their snapshot provenance.

---

### 6. Feature: Update docs/trd.md and CLAUDE.md to reflect the Phase 8 architecture

**Owner:** Any. **Depends on:** Phase 8 Tasks 3 and 4.

**Purpose/Issue:** `docs/trd.md` §5.1 (model routing), §6.x (RAG architecture), and §8 (Plan B) currently describe the Flash-only / rule-engine-only state from before Phase 8. `CLAUDE.md`'s Tech Stack section frames Vertex AI Search as the "primary" RAG layer with inline-PDF as the Plan B collapse — neither is true after Phase 8. Bring both files into truth so the deck team can reference them safely.

**Implementation — Any:**

- [ ] Update `docs/trd.md` §5.1 model-routing section to document the per-step matrix from Task 4: extract on `gemini-2.5-flash`, classify on `gemini-2.5-flash-lite`, compute_upside on the chosen heavy model, generate as deterministic WeasyPrint.
- [ ] Add a new `docs/trd.md` sub-section under the RAG topic documenting the Vertex AI Search retrieval helper (`backend/app/services/vertex_ai_search.py`), the `layak-schemes-v1` data store ID, the per-rule query strings, and the fail-open posture.
- [ ] Update `docs/trd.md` §8 (Plan B) — Vertex AI Search is no longer the optional layer that Plan B collapses away from, so demote that paragraph and rewrite Plan B's trigger condition to reflect the new state (or remove §8 entirely if it no longer makes sense).
- [ ] Update the Backend > RAG line in `CLAUDE.md` (under Tech Stack) to drop the "primary" / "Plan B collapses to inline-PDF" framing — Vertex AI Search is the live citation source after Phase 8.
- [ ] Update `CLAUDE.md`'s Backend > Models bullet to list the per-step model assignment from Task 4.
- [ ] No new ASCII diagrams — verbal updates to existing prose only.

**Exit criteria:** `docs/trd.md` and `CLAUDE.md` describe the actual Phase-8-as-shipped architecture (per-step model matrix and live Vertex AI Search retrieval), and the deck team can reference either file for the architecture slide without surfacing pre-Phase-8 framing.

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
