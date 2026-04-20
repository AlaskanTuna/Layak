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

---

## Phase 1: Core Build

> Maps to `docs/roadmap.md` Phase 1 — "One critical user journey. End-to-end. On Cloud Run. No side quests." Implementation lists below are forward-looking scaffolds. Each task is expanded with real detail when it is picked up, per the repo agent workflow.

### 1. Feature: Backend data models and agent wiring

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Define Pydantic `Profile`, `SchemeMatch`, `Packet` models per `docs/trd.md` §3.
- [ ] Stand up FastAPI skeleton with `POST /api/agent/intake` returning a stub SSE stream.
- [ ] Wire ADK-Python `SequentialAgent` with two or three `FunctionTool`s (extract, match) against the Gemini API.
- [ ] Local smoke test: stub returns a valid SSE stream end-to-end.

### 2. Feature: Frontend scaffolding to mock data

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Build the upload widget (FR-2) with three separately-labelled file inputs and camera support.
- [ ] Build the SSE consumer and per-step progress placeholders.
- [ ] Build the ranked-scheme list skeleton with mock data.
- [ ] Build the provenance panel layout (FR-7) with placeholder citations.

### 3. Feature: Orchestration layer (agent chains ≥3 steps)

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Wire `FunctionTool`s end-to-end: extract → classify → match → compute_upside → generate_packet.
- [ ] Index the three scheme PDFs into Vertex AI Search via `backend/scripts/seed_vertex_ai_search.py` (exact path subject to backend-layout decision).
- [ ] Canary retrieval query returns non-empty passages for each scheme.
- [ ] Trigger-point check at sprint hour 12: if Vertex AI Search is not green, collapse to the Plan B inline-PDF grounding in `docs/trd.md` §8.

### 4. Feature: Rule engine (STR, JKM Warga Emas, 5 LHDN reliefs)

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Encode STR 2026 household-with-children tier thresholds (Pydantic v2).
- [ ] Encode JKM Warga Emas per-capita means test against food-PLI RM1,236 (DOSM 2024); default rate RM600/month, fallback copy RM500/month.
- [ ] Encode five LHDN Form B reliefs for YA2025: individual (RM9,000), parent medical (up to RM8,000), child 16a ×2 (RM2,000 each), EPF+life #17 (up to RM7,000), lifestyle #9 (up to RM2,500).
- [ ] Unit tests assert every threshold matches the cached scheme PDF under `backend/data/schemes/`.

### 5. Feature: Wire frontend ↔ backend end-to-end

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Replace mock SSE events with real agent output from `POST /api/agent/intake`.
- [ ] Provenance panel renders Vertex AI Search passages + URLs for every numeric claim.
- [ ] Gemini Code Execution streams Python computations on-stage.
- [ ] WeasyPrint produces three DRAFT-watermarked PDFs downloadable from the results view.
- [ ] Happy path runs end-to-end locally against the full Aisyah fixture set.

### 6. Feature: Cloud Run deploy and responsiveness pass

**Purpose/Issue:** _(to be filled at task start)_

**Implementation:**

- [ ] Deploy frontend (`gcloud run deploy`) and backend (`adk deploy cloud_run --with_ui`), both with `--min-instances=1 --cpu-boost`.
- [ ] Inject `GEMINI_API_KEY` via Secret Manager (`--set-secrets=GEMINI_API_KEY=gemini-api-key:latest`).
- [ ] Happy path works on the public Cloud Run URL from an incognito browser.
- [ ] Responsiveness pass at 375 / 768 / 1440 viewports.
- [ ] Seed Aisyah demo-mode button (FR-10) rehearsed cleanly three times back-to-back.

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
