# PROGRESS (AGENT ONLY)

> Refer to `docs/plan.md` when recording completed tasks.

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
