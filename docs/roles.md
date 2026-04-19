# ROLES (AGENT ONLY)

Defines every participant's role, responsibilities, and boundaries in this project's multi-agent workflow. Identify your role before acting.

## Role Registry

| Key    | Role              | Assigned To   |
| ------ | ----------------- | ------------- |
| PO     | Project Owner     | PROJECT OWNER |
| PL     | Planner           | ANY           |
| PG     | Programmer        | ANY           |
| QA     | QA Reviewer       | ANY           |
| AD     | Technical Advisor | ANY           |
| Others | Assistant         | ANY           |

> NOTE: Roles may be subject to timely adjustments.

## PO - Project Owner

| Item    | Detail                                |
| ------- | ------------------------------------- |
| Owns    | docs/, all final decisions            |
| Assigns | Tasks to agents; manages handoffs     |
| Reviews | All agent output before committing    |
| Commits | Human only, no agent commits directly |

Rules: One agent per task at a time. Commit between handoffs. Never accept output without reading the diff.

## PL - Planner

| Item     | Detail                                                                              |
| -------- | ----------------------------------------------------------------------------------- |
| Trigger  | Human asks for a plan before a new feature or phase                                 |
| Reads    | docs/PRD.md, docs/TRD.md, docs/ROADMAP.md                                           |
| Produces | Structured task breakdown in docs/PLAN.md (checkboxes, scope, implementation steps) |
| Updates  | docs/PLAN.md only                                                                   |

Rules: Does not implement. Flags ambiguities back to HUMAN before writing the plan. Does not modify protected files.

## PG - Programmer

| Task Type                                                              |
| ---------------------------------------------------------------------- |
| Route handlers, middleware, validators, service functions, boilerplate |
| Debugging Codex output that failed QA                                  |

All programmers must:

- Read docs/PLAN.md and docs/TRD.md before starting.
- Read the relevant .claude/skills/ skill file before implementing.
- Tick completed checkboxes in docs/PLAN.md and update docs/PROGRESS.md after each task.
- Surface ambiguity in output, never resolve by guessing.

## QA - QA Reviewer

| Item    | Detail                                                                                 |
| ------- | -------------------------------------------------------------------------------------- |
| Trigger | PROG completes a task; human requests review before committing                         |
| Checks  | Correctness, type safety, edge cases, code style, API contract alignment (docs/TRD.md) |
| Verdict | Approve / Approve with comments / Reject with reasons                                  |

Rules: Review only; does not rewrite files. Does not re-litigate architecture decisions in docs/TRD.md.

## AD - Technical Advisor

| Item     | Detail                                                                     |
| -------- | -------------------------------------------------------------------------- |
| Trigger  | Human has an implementation question, approach validation, or risk concern |
| Produces | Explanations, recommendations, trade-off analysis, plan input              |

Rules: Advisory only; does not modify source files.

## Others - Assistant

Handles anything outside the above roles: documentation edits, commit message suggestions, quick lookups, formatting. Same no-implementation constraint as AD unless explicitly instructed by PO.

## Handoff Protocol

PO assigns task -> PL plans -> PG implements -> QA reviews -> PO reads verdict, commits if approved -> Next task
