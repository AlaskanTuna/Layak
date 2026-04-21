---
name: copilot-delegate
description: Delegate token-heavy content tasks (doc rewrites, bulk boilerplate, structured repetitive edits) to the local GitHub Copilot CLI to save context. Use when a task is well-defined, high-volume, and doesn't need the main agent's conversational judgement.
---

# Copilot CLI Delegation

## When to use

Reach for this skill when the main agent would have to produce a long, structured artifact that has already been planned. Typical fits:

- Translating an approved spec into updates across 2+ documentation files.
- Mass-expanding a task list (e.g. "flesh out Phase N tasks per spec §X").
- Reorganising a chronological log (e.g. `progress.md`) against git history.
- Regenerating a long table / matrix / markdown file from a compact source.
- Any task where the main agent's role is _direction_, not _authorship_.

Do **not** use it for:

- Decisions the main agent still needs to make (brainstorming, trade-offs).
- Code changes in paths that touch runtime behaviour — review those yourself.
- Short edits (<50 lines). The per-call overhead isn't worth it.
- Anything requiring tool calls that the main agent has already started.

## Command template

```bash
copilot -p "$(cat <<'EOF'
<one self-contained prompt>
EOF
)" --model gpt-5.4-mini --reasoning-effort=high --yolo --silent 2>&1
```

Run in background (`run_in_background: true`) when the job is long. You'll get a notification on completion and the output lands in the tool's output file; don't poll.

## Flags (locked for this project)

| Flag                      | Why                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `-p, --prompt`            | Non-interactive mode (exits after completion). Required.                                                                                        |
| `--reasoning-effort=high` | Max reasoning budget; worth it for structural doc rewrites on supported models.                                                                 |
| `--yolo`                  | Equivalent to `--allow-all-tools --allow-all-paths --allow-all-urls`. Copilot needs this to read and write files without the confirmation gate. |
| `--silent` / `-s`         | Strip stats; only the final agent response is emitted. Keeps output parseable.                                                                  |

## Model selection

Use `gpt-5.4-mini` first, with `claude-haiku-4.5` as the fallback when the requested model is unavailable or rejected by the CLI.

- **Primary:** `--model gpt-5.4-mini --reasoning-effort=high`
- **Fallback:** `--model claude-haiku-4.5` (omit `--reasoning-effort`; this model rejects effort configuration)

If either model name is rejected, consult the current Copilot CLI docs or run `copilot --help` / `copilot -p "list available models"` to confirm the exact model string supported by the installed build.

Keep the reasoning effort at `high` for this skill's delegated doc work when using the primary model. If the task needs the fallback model, omit the effort flag. If the task is outside that scope, do not use this skill.

## Writing the prompt

Copilot comes in cold with no session context. The prompt must be self-contained. Include:

1. **Source of truth** — the spec / design doc / reference to read first. Use repo-relative paths (`docs/superpowers/specs/…`). Tell it to read the source in full before editing.
2. **Target file(s)** — explicit path(s) to modify.
3. **Preservation contract** — what must **not** change (line-by-line if needed: "PRESERVE verbatim: all Phase 0 tasks, existing ticked checkboxes…"). This is the single highest-leverage instruction.
4. **Change list** — numbered, surgical. Each item specifies: where to insert, what to say, what style to match. Reference the spec section (`per spec §8.2`) so Copilot can fan out without inventing content.
5. **Style contract** — one short paragraph ("match existing voice: imperative, terse, no emojis, don't rewrite anything not called out").
6. **Report instruction** — "After saving the file, print a one-sentence summary of what changed." Gives the caller a quick sanity signal.

## Verification

Copilot is not deterministic. Always spot-check after:

1. `wc -l <file>` + `git diff --stat <file>` — is the delta in the right order of magnitude?
2. Section-heading scan: `grep -n '^## \|^### ' <file>` — did the structure Copilot produced match what the spec asked for?
3. Read one random new section end-to-end. If quality is good there, density is usually even across the rest.
4. Read any section near a preservation boundary (the first 5–10 lines after an "APPEND here" instruction) to confirm nothing upstream got rewritten.

If a section is subtly wrong, re-dispatch with a narrower prompt pointing at the section only.

## Parallel dispatch

Multiple independent doc updates can run in parallel — dispatch each as its own background `Bash` call in the same tool-use block. Three is a reasonable ceiling; beyond that, Copilot's backend or local CPU starts thrashing.

Each background job writes to its own output file. Read the output file for the summary line; don't grep the doc again just to confirm the CLI finished.

## Example: translate an approved spec into doc updates

```bash
copilot -p "$(cat <<'EOF'
Read docs/superpowers/specs/2026-04-21-v2-saas-pivot-design.md in full, then update docs/plan.md.

PRESERVE verbatim: all Phase 0 tasks (1-7) and Phase 1 tasks (1-6). Do not touch existing checkboxes or owner attributions.

CHANGE 1 — Append four new tasks to Phase 1 as tasks 7-10 per spec §7.1. All PO2 (Adam). Format: '### N. Refinement: Title' then '**Purpose/Issue:**' paragraph then '**Implementation:**' with unticked checkbox bullets.

CHANGE 2 — Update Phase X deadline from 21 Apr 23:00 MYT to 24 Apr 23:59 MYT. Shift the buffer windows proportionally.

CHANGE 3 — Replace the Phase 2 placeholder with Phases 2-6 per spec §7.3. Match Phase 1 density — include concrete file paths (frontend/src/lib/firebase.ts, backend/app/auth.py), Firestore collection names, command examples.

STYLE: imperative, terse, no emojis. Do not rewrite anything not explicitly called out.

After saving the file, print a one-sentence summary.
EOF
)" --effort high --yolo --silent 2>&1
```

## Example: reorganise a chronological log from git history

```bash
copilot -p "The timeline of docs/progress.md is messed up. Use 'gh' and 'git log' to derive the true chronological order of entries, reorder the file to match (newest first, consistent date prefix format), and commit + push to main as 'chore: docs'." \
  --effort high --yolo --silent 2>&1
```

In that example, Copilot writes the commit and push itself — only do that when the task is fully self-contained and the commit scope is exactly what the caller wants. For anything touching the docs contract or code, have Copilot edit only; push from the main agent after spot-checking.

## Caveats

- **Branch awareness**: Copilot operates on the current working directory's branch. `git checkout <branch>` before dispatch if the target branch matters.
- **Working directory**: `copilot` inherits the shell's cwd. Run from the repo root.
- **Secrets**: `--yolo` grants unrestricted tool access. Don't use the skill in sessions where Copilot could touch `.env`, keys, or `gcloud` state beyond the task scope.
- **Commit permissions**: Copilot under `--yolo` can `git commit` and `git push`. The main agent is still responsible for the result; verify before considering the task done.
- **Rate limits**: Parallel dispatches share the caller's Copilot quota. If a job fails with a rate-limit error, back off and retry serially.
