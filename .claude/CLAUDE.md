# CLAUDE.md

> **Read `docs/roles.md` first** — it defines your role, responsibilities, and boundaries within the multi-agent workflow for this project.

---

## Project

...

---

## Architecture

```
...
```

---

## Tech Stack

### Frontend

- ...

### Backend

- ...

### Infrastructure & Tooling

- ...

---

## Commands

```bash
...
```

---

## Code Style

### ...

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
