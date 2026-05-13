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

**`--cd` MUST be the absolute path to the repo root**, not `.` and not a sub-directory path. The Codex sandbox is rooted at `--cd`; if you set it to `backend/` (or inherit a non-root shell cwd via `.`), Codex will silently reject writes anywhere else in the repo (e.g. `frontend/`, `docs/`, `.claude/`) with a `patch rejected: writing outside of the project` error and stop without applying anything. Burned us on Phase 8 Tasks 5 and 6 — both failed first try until re-dispatched with the absolute path.

**`-c 'hooks={}'` MUST be on every `codex exec` line below.** This single flag is the only thing standing between the run and an immediate exit-1 with `Error loading config.toml: invalid type: sequence, expected struct HooksToml in 'hooks'`. The user's global `~/.codex/config.toml` carries a legacy `[[hooks]]` array-of-tables that codex ≥ 0.130 rejects on startup, before the model is even contacted. The failure has nothing to do with the model — both `gpt-5.5` and `gpt-5.4-mini` die identically without this flag. **Do not strip `-c 'hooks={}'` when "falling back" to a smaller model; the smaller model will fail the same way for the same reason.** If the stderr mentions `HooksToml` or `config.toml`, the fix is always to add this flag, never to swap the model.

### Hard task: GPT-5.5 (High)

```bash
cat <<'EOF' | codex exec \
  --cd /absolute/path/to/repo \
  --sandbox workspace-write \
  --model gpt-5.5 \
  -c model_reasoning_effort=high \
  -c 'hooks={}' \
  -
<one self-contained prompt>
EOF
```

### Easy or redundant task: GPT-5.4 mini (High)

```bash
cat <<'EOF' | codex exec \
  --cd /absolute/path/to/repo \
  --sandbox workspace-write \
  --model gpt-5.4-mini \
  -c model_reasoning_effort=high \
  -c 'hooks={}' \
  -
<one self-contained prompt>
EOF
```

Run in background (`run_in_background: true`) when the job is long. `codex exec` streams progress to `stderr` and prints the final agent message to `stdout`, so the tool output is already easy to review once the process completes.

## Flags (locked for this project)

| Flag                             | Why                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exec`                           | Stable non-interactive Codex mode for scripted subagent runs.                                                                                                                                                                                                                                                                                            |
| `--cd <abs-path>`                | Sandbox root + working directory. MUST be the absolute repo root, never `.` or a sub-directory.                                                                                                                                                                                                                                                          |
| `--sandbox workspace-write`      | Writable sandbox rooted at `--cd`. Replaces the deprecated `--full-auto` shorthand from codex 0.121 and earlier. `codex exec` already defaults to never-pause approvals; no extra approval flag needed.                                                                                                                                                  |
| `--model <name>`                 | Explicitly selects the intended model for the delegated task.                                                                                                                                                                                                                                                                                            |
| `-c model_reasoning_effort=high` | Forces high reasoning on supported models.                                                                                                                                                                                                                                                                                                               |
| `-c 'hooks={}'`                  | Disables any user-level Codex hooks (e.g. `~/.codex/config.toml` `[[hooks]]` entries) for this run. Required if the user's global Codex config still uses the legacy array-of-tables `[[hooks]]` schema, which codex ≥0.130 rejects with `invalid type: sequence, expected struct HooksToml`. Safe to leave in even after the global config is migrated. |
| `-`                              | Reads the prompt from stdin, which is safer and cleaner for long prompts than shell-escaping one giant string.                                                                                                                                                                                                                                           |

## Model selection

Pick exactly one of these:

- **Hard task:** `--model gpt-5.5 -c model_reasoning_effort=high`
- **Easy redundant task:** `--model gpt-5.4-mini -c model_reasoning_effort=high`

Use `gpt-5.5` when the delegated task needs stronger judgement across multiple files, subtle preservation boundaries, or more careful reasoning.

Use `gpt-5.4-mini` when the job is mostly repetitive, mechanical, or easy but still large enough that offloading saves context.

`gpt-5.5` requires **codex-cli ≥ 0.130.0**. Older builds return `The 'gpt-5.5' model requires a newer version of Codex. Please upgrade...`; upgrade with `npm install -g @openai/codex@latest` and re-verify `codex --version` before retrying. If the model string is ever rejected, check the current Codex CLI docs before substituting anything.

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
  --cd /home/adam/CS/Layak \
  --sandbox workspace-write \
  --model gpt-5.5 \
  -c model_reasoning_effort=high \
  -c 'hooks={}' \
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
  --cd /home/adam/CS/Layak \
  --sandbox workspace-write \
  --model gpt-5.4-mini \
  -c model_reasoning_effort=high \
  -c 'hooks={}' \
  -
Read docs/progress.md and the recent git history, then reorder the progress entries so they are newest first with one consistent date prefix format.

PRESERVE the wording of each existing entry unless a timestamp format must be normalized.

Do not invent new events. Do not delete information. Only reorder entries, normalize date prefixes, and fix obvious duplicated headings caused by prior manual edits.

After saving the file, print a one-sentence summary and stop.
Do not commit, push, create a branch, or open a PR.
EOF
```

## Troubleshooting

If a `codex exec` dispatch fails, **read the stderr before retrying**. Do not "fall back" to a different model on impulse — the most common failure here has nothing to do with the model.

| Symptom (in stderr or the shell tool error)                                                        | Real cause                                                                                                                               | Fix                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `Error loading config.toml: invalid type: sequence, expected struct HooksToml in 'hooks'` (exit 1) | Missing `-c 'hooks={}'` flag. Codex ≥ 0.130 chokes on the legacy `[[hooks]]` block in `~/.codex/config.toml` before any model handshake. | Add `-c 'hooks={}'` to the `codex exec` command exactly as shown in the templates above. Re-run with the same model.     |
| `The 'gpt-5.5' model requires a newer version of Codex. Please upgrade...` (HTTP 400)              | codex-cli < 0.130.0 installed.                                                                                                           | `npm install -g @openai/codex@latest`; confirm with `codex --version`. Re-run with the same model.                       |
| `error: unexpected argument '--full-auto'` or `--ask-for-approval`                                 | Stale flag from a pre-0.130 template.                                                                                                    | Replace `--full-auto` with `--sandbox workspace-write`. Drop `--ask-for-approval` entirely — `codex exec` never prompts. |
| `warning: --full-auto is deprecated; use --sandbox workspace-write instead.`                       | 0.130+ accepts `--full-auto` but warns. Run still succeeds.                                                                              | Swap to `--sandbox workspace-write` to silence it; not blocking.                                                         |
| `patch rejected: writing outside of the project`                                                   | `--cd` was `.` or a sub-directory; sandbox confined to the wrong subtree.                                                                | Re-dispatch with `--cd <absolute repo root>`.                                                                            |

**Anti-pattern: "codex rejected gpt-5.5, falling back to gpt-5.4".** Codex doesn't reject a model with a `HooksToml` error or a generic exit-1. If you see those, the dispatcher (this skill's template) is incomplete — fix the command, not the model. Both `gpt-5.5` and `gpt-5.4-mini` fail identically when `-c 'hooks={}'` is missing.

## Caveats

- **Git repo check:** `codex exec` expects to run inside a Git repository. Use `--skip-git-repo-check` only for clearly safe one-off directories.
- **Sandbox root = `--cd`:** the absolute path passed to `--cd` is the writable boundary. Setting `--cd .` while the shell cwd is a sub-directory (e.g. `backend/`) silently confines Codex to that sub-tree and rejects every cross-tree edit. Always pass the absolute repo root, especially when the delegated task spans multiple top-level directories (`frontend/`, `docs/`, `.claude/`).
- **Codex CLI version drift:** `gpt-5.5` needs codex-cli ≥ 0.130.0. Older builds error with `The 'gpt-5.5' model requires a newer version of Codex`. Upgrade with `npm install -g @openai/codex@latest` and re-check `codex --version`. Note that 0.130 also **deprecates `--full-auto`** in favour of `--sandbox workspace-write` (still functional with a warning, but the new flag is canonical) and **rejects `--ask-for-approval never`** from earlier builds.
- **Legacy `[[hooks]]` in `~/.codex/config.toml`:** codex ≥ 0.130 expects `hooks` to be a struct (typically a separate `hooks.json` referenced from config). If the user's global config still uses the old `[[hooks]]` array-of-tables, every `codex exec` aborts with `Error loading config.toml: invalid type: sequence, expected struct HooksToml`. The `-c 'hooks={}'` override in the templates above neutralises that for this skill's runs; the global config should be migrated separately so other Codex sessions don't break.
- **Permissions:** this skill assumes `--sandbox workspace-write`'s writable-workspace policy is enough. If the task needs network, secrets, or broader filesystem access, do not silently widen permissions.
- **Secrets:** avoid prompts that tell the delegated run to inspect `.env`, credentials, or unrelated private state.
- **Git actions:** do not delegate commit, push, branching, or PR creation. The main agent remains responsible for all Git operations after review.
- **Out-of-scope churn:** Codex sometimes touches unrelated files (whitespace / line-ending normalisation, IDE-style cleanups). Always `git diff -w` after the run and `git checkout` files where the only delta is whitespace before staging.
