# PLAN (AGENT ONLY)

> Refer to `docs/trd.md` for architecture, data models, API contracts, and code-level details.
> Refer to `docs/prd.md` for product requirements and acceptance criteria.
> Refer to `docs/roadmap.md` for the phase timeline overview.

---

## Phase 0: Scaffolding

### 1. Feature: Project Bootstrap

**Purpose/Issue:** Initialize the Layak workspace for the 24-hour sprint — decompose `docs/project-idea.md` into structured PRD/TRD, configure `.claude/` for shared agentic coding, and scaffold the Next.js frontend tooling. Backend is out of scope for this task; backend stack decisions land tomorrow.

**Implementation:**

- [x] Read and orient against existing repo state, `docs/project-idea.md`, `docs/roadmap.md`, and `docs/roles.md`.
- [x] Decompose `docs/project-idea.md` into `docs/prd.md` (product requirements) and `docs/trd.md` (technical requirements); patch `docs/roadmap.md` decision log, non-goals, and architecture.md → trd.md reference.
- [ ] Initialize `.claude/CLAUDE.md` with project-specific conventions (incl. agent-commit permission note); inventory `.claude/skills/` and flag gaps.
- [ ] Scaffold Next.js 14 + Tailwind + shadcn/ui + Lucide; wire Husky + lint-staged + Prettier; set WSL HMR polling; stub landing page; add `.env.example`.
- [ ] Push all commits to `origin/main` and produce the handoff report.

---
