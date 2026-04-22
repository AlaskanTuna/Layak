---
name: codex-delegate
description: Delegate well-scoped, token-heavy content tasks or repetitive implementation work to headless Codex CLI subagents to save main-agent context. Use when a task is self-contained, high-volume, and does not need the main agent's live judgement.
---

# Headless Codex CLI Delegation

## When to use

Reach for this skill when the main agent should stay focused on direction, review, and integration while a separate Codex CLI run handles a bounded task. Good fits:

- Translating an approved spec into updates across 2+ documentation files.
- Mass-expanding a planned task list or checklist from a source document.
- Reorganizing logs, notes, or status files against an already-decided structure.
- Regenerating long tables, matrices, summaries, or markdown artifacts from compact inputs.
- Carrying out repetitive, low-risk edits where the main agent already knows exactly what should change.

Do **not** use it for:

- Open-ended decisions, trade-offs, or brainstorming the main agent still needs to own.
- Risky runtime code changes that need close human steering while they happen.
- Very small edits where CLI spin-up overhead is not worth it.
- Tasks that need broader machine access than the workspace unless you are in a deliberately hardened sandbox.

## Command template

Use `codex exec` in headless mode. Prefer feeding the prompt through stdin so long prompts stay readable and self-contained.

### Hard task: GPT-5.4 (High)

```bash
cat <<'EOF' | codex exec \
  --cd . \
  --sandbox workspace-write \
  --ask-for-approval never \
  --model gpt-5.4 \
  -c model_reasoning_effort=high \
  -
<one self-contained prompt>
EOF
```

### Easy or redundant task: GPT-5.4 mini (High)

```bash
cat <<'EOF' | codex exec \
  --cd . \
  --sandbox workspace-write \
  --ask-for-approval never \
  --model gpt-5.4-mini \
  -c model_reasoning_effort=high \
  -
<one self-contained prompt>
EOF
```

Run in background (`run_in_background: true`) when the job is long. `codex exec` streams progress to `stderr` and prints the final agent message to `stdout`, so the tool output is already easy to review once the process completes.

## Flags (locked for this project)

| Flag                             | Why                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `exec`                           | Stable non-interactive Codex mode for scripted subagent runs.                                                  |
| `--cd .`                         | Starts the delegated run from the repo root so paths resolve consistently.                                     |
| `--sandbox workspace-write`      | Lets the subagent read and edit the workspace without granting full machine access.                            |
| `--ask-for-approval never`       | Keeps the run headless. Delegated jobs should not block waiting for approval.                                  |
| `--model <name>`                 | Explicitly selects the intended model for the delegated task.                                                  |
| `-c model_reasoning_effort=high` | Forces high reasoning on supported models.                                                                     |
| `-`                              | Reads the prompt from stdin, which is safer and cleaner for long prompts than shell-escaping one giant string. |

Prefer the explicit `--sandbox workspace-write --ask-for-approval never` pair over `--full-auto`. Per the Codex docs, `--full-auto` sets `workspace-write` plus `on-request` approvals; for delegated subagent runs, we want "never pause" behavior.

## Model selection

Pick exactly one of these:

- **Hard task:** `--model gpt-5.4 -c model_reasoning_effort=high`
- **Easy redundant task:** `--model gpt-5.4-mini -c model_reasoning_effort=high`

Use `gpt-5.4` when the delegated task needs stronger judgement across multiple files, subtle preservation boundaries, or more careful reasoning.

Use `gpt-5.4-mini` when the job is mostly repetitive, mechanical, or easy but still large enough that offloading saves context.

If either model string is rejected by the installed Codex build, check the current Codex CLI docs before substituting anything.

## Writing the prompt

`codex exec` starts cold. The prompt must be fully self-contained. Include:

1. **Read-first context** - the exact file(s), spec(s), or notes to read before editing.
2. **Target file(s)** - explicit path(s) to modify.
3. **Preservation contract** - exactly what must stay untouched.
4. **Change list** - numbered, precise instructions tied to source sections when possible.
5. **Style contract** - match tone, format, and scope; do not rewrite unrelated content.
6. **Stop condition** - after saving changes, print a short summary and stop.
7. **Git handoff** - explicitly forbid commit, push, branch creation, or PR work; the main agent reviews and handles Git.

## Verification

Headless Codex runs are powerful, but still need a quick review:

1. `git diff --stat <file>` or `git diff --stat` to check the change size.
2. Scan headings or structural anchors to confirm the edit landed in the right place.
3. Read one random new section end-to-end for quality.
4. Read the first lines after any preservation boundary to confirm nothing upstream was rewritten.

If one area is off, re-dispatch a narrower follow-up prompt for that section only.

## Parallel dispatch

Independent delegated jobs can run in parallel, but keep it modest. Two or three concurrent `codex exec` runs are usually enough before local resources and rate limits start to fight you.

Each job should own a different output target or a clearly separate file set. Do not dispatch multiple subagents into the same preservation boundary at once.

## Example: translate an approved spec into doc updates

```bash
cat <<'EOF' | codex exec \
  --cd . \
  --sandbox workspace-write \
  --ask-for-approval never \
  --model gpt-5.4 \
  -c model_reasoning_effort=high \
  -
Read docs/superpowers/specs/2026-04-21-v2-saas-pivot-design.md in full, then update docs/plan.md.

PRESERVE verbatim: all Phase 0 tasks (1-7) and Phase 1 tasks (1-6). Do not touch existing checkboxes or owner attributions.

CHANGE 1 - Append four new tasks to Phase 1 as tasks 7-10 per spec section 7.1. All PO2 (Adam). Format: "### N. Refinement: Title" then "**Purpose/Issue:**" paragraph then "**Implementation:**" with unticked checkbox bullets.

CHANGE 2 - Update the Phase X deadline from 21 Apr 23:00 MYT to 24 Apr 23:59 MYT. Shift the buffer windows proportionally.

CHANGE 3 - Replace the Phase 2 placeholder with Phases 2-6 per spec section 7.3. Match Phase 1 density and include concrete file paths, Firestore collection names, and command examples where the spec provides them.

STYLE: imperative, terse, no emojis. Do not rewrite anything not explicitly called out.

After saving the file, print a one-sentence summary and stop.
Do not commit, push, create a branch, or open a PR.
EOF
```

## Example: regenerate a structured log

```bash
cat <<'EOF' | codex exec \
  --cd . \
  --sandbox workspace-write \
  --ask-for-approval never \
  --model gpt-5.4-mini \
  -c model_reasoning_effort=high \
  -
Read docs/progress.md and the recent git history, then reorder the progress entries so they are newest first with one consistent date prefix format.

PRESERVE the wording of each existing entry unless a timestamp format must be normalized.

Do not invent new events. Do not delete information. Only reorder entries, normalize date prefixes, and fix obvious duplicated headings caused by prior manual edits.

After saving the file, print a one-sentence summary and stop.
Do not commit, push, create a branch, or open a PR.
EOF
```

## Caveats

- **Git repo check:** `codex exec` expects to run inside a Git repository. Use `--skip-git-repo-check` only for clearly safe one-off directories.
- **Working directory:** run from the repo root or set `--cd` explicitly so relative paths stay stable.
- **Permissions:** this skill assumes `workspace-write` is enough. If the task needs network, secrets, or broader filesystem access, do not silently widen permissions.
- **Secrets:** avoid prompts that tell the delegated run to inspect `.env`, credentials, or unrelated private state.
- **Git actions:** do not delegate commit, push, branching, or PR creation. The main agent remains responsible for all Git operations after review.
