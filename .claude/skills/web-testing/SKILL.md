---
name: web-testing
description: 'E2E web testing using Browser Use CLI. Creates a test plan, drives a headless browser through each test, records observations, and updates the plan with results. Checks for browser-use installation first.'
---

# Web Testing with Browser Use CLI

Automate end-to-end web testing by driving a real browser through Browser Use CLI. The agent creates a structured test plan, executes each test via CLI commands, captures evidence (screenshots, DOM state, network status), and records pass/fail observations back into the plan.

<HARD-GATE>
Do NOT begin any browser interaction until:
1. Browser Use CLI installation is confirmed (or the user is guided through setup).
2. A `docs/test.md` exists with the full test matrix.
3. The user has reviewed and approved the test plan.
</HARD-GATE>

## When to Use

- The user asks to test a web application, page, or feature end-to-end.
- The user provides a URL and wants functional verification.
- The user says "test this", "run E2E tests", "check if this works", "verify the UI", or similar.
- The user provides or references a test plan and wants it executed.

## When NOT to Use

- Unit tests or integration tests that run in code (use `dotnet test`, `pytest`, etc.).
- API-only testing with no browser interaction (use `curl`, Postman, etc.).
- Performance/load testing (use k6, Artillery, etc.).

---

## Checklist

You MUST create a task for each of these items and complete them in order:

1. **Verify Browser Use CLI** — confirm installation or guide setup.
2. **Gather test scope** — understand what to test (URL, credentials, features).
3. **Create test plan** — write `docs/test.md` with the full test matrix.
4. **User approves plan** — present the plan and wait for approval before testing.
5. **Execute tests** — drive the browser through each test, section by section.
6. **Record results** — update `docs/test.md` with observations after each section.
7. **Present summary** — show a pass/partial/fail/not-tested summary table.

---

## Phase 0: Verify Browser Use CLI

Before anything else, check that `browser-use` is available.

```bash
which browser-use 2>/dev/null || echo "NOT FOUND"
browser-use doctor 2>&1
```

### If installed

Confirm the output of `browser-use doctor` shows all checks passing. Proceed to Phase 1.

### If NOT installed

Guide the user through installation. Present the options below and ask which they prefer:

**Option A — pip (virtual environment recommended):**
```bash
python3 -m venv ~/.browser-use-env
source ~/.browser-use-env/bin/activate
pip install browser-use
browser-use install   # installs Chromium + system deps
```

**Option B — uv (faster):**
```bash
uv venv ~/.browser-use-env
source ~/.browser-use-env/bin/activate
uv pip install browser-use
browser-use install
```

**Option C — pipx (isolated):**
```bash
pipx install browser-use
browser-use install
```

After installation, verify:
```bash
browser-use doctor
```

If `cloudflared` is also needed (for tunnel features), guide installation based on architecture:
```bash
# Check architecture
uname -m
# x86_64 → amd64, aarch64 → arm64

# Debian/Ubuntu
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb && rm /tmp/cloudflared.deb
```

<HARD-GATE>
Do NOT proceed past this phase until `browser-use doctor` shows all checks passing.
</HARD-GATE>

---

## Phase 1: Gather Test Scope

Ask the user for the following (one question at a time if not already provided):

1. **Target URL** — the base URL of the application to test.
2. **Credentials** — login email/password if authentication is required.
3. **Test scope** — which pages, features, or flows to cover.
4. **Known issues** — anything to skip or watch out for.

If the user already provided a test plan file, read it and skip to Phase 2 approval.

---

## Phase 2: Create Test Plan

Create `docs/test.md` (create the `docs/` directory if it does not exist).

### Test Plan Format

```markdown
# E2E Test Guide — <Area/Feature Name>

**URL:** <base URL>

**Login:** <credentials or "N/A">

## 1. <Section Name> (<route>)

| #   | Test           | What to check              | Observation |
| --- | -------------- | -------------------------- | ----------- |
| 1.1 | <test name>   | <what to verify>           |             |
| 1.2 | <test name>   | <what to verify>           |             |

## 2. <Next Section> (<route>)

| #   | Test           | What to check              | Observation |
| --- | -------------- | -------------------------- | ----------- |
| 2.1 | <test name>   | <what to verify>           |             |
```

### Guidelines for Writing Tests

- Group tests by page or feature area.
- Each test should be independently verifiable (not dependent on prior test state, where possible).
- Write "What to check" as a concrete, observable assertion — not vague descriptions.
- Leave the Observation column empty; it gets filled during execution.
- Include setup tests first (page loads, data visible) before interaction tests (click, filter, submit).

### Present for Approval

After writing the plan, show the user a summary:

> Test plan written to `docs/test.md` with **N sections** and **M total tests**. Please review and let me know if you want to add, remove, or change any tests before I start.

<HARD-GATE>
Do NOT start browser testing until the user approves the test plan.
</HARD-GATE>

---

## Phase 3: Execute Tests

### Browser Session Lifecycle

```
1. Open browser         →  browser-use open <url>
2. Handle SSL warnings  →  click Advanced → Proceed (if needed)
3. Authenticate         →  fill login form, submit
4. Run tests by section →  navigate, interact, observe, screenshot
5. Close browser        →  browser-use close
```

### Core Command Reference

| Action | Command |
|--------|---------|
| Navigate | `browser-use open <url>` |
| Page state | `browser-use state` |
| Screenshot | `browser-use screenshot <path>` |
| Full-page screenshot | `browser-use screenshot <path> --full` |
| Click element | `browser-use click <index>` |
| Click coordinates | `browser-use click <x> <y>` |
| Type into focused field | `browser-use type <text>` |
| Type into specific input | `browser-use input <index> <text>` |
| Select dropdown | `browser-use select <index> <value>` |
| Press key | `browser-use keys <key>` |
| Scroll | `browser-use scroll down` / `browser-use scroll up --amount 500` |
| Run JavaScript | `browser-use eval <js>` |
| Wait for element | `browser-use wait selector <css> --timeout 5000` |
| Wait for text | `browser-use wait text <text> --timeout 5000` |
| Get page title | `browser-use get title` |
| Get element text | `browser-use get text <index>` |
| Get input value | `browser-use get value <index>` |
| Get HTML | `browser-use get html --selector <css>` |
| Upload file | `browser-use upload <index> <path>` |
| Hover | `browser-use hover <index>` |
| Go back | `browser-use back` |
| Manage cookies | `browser-use cookies get` / `set` / `clear` / `export` / `import` |
| Close browser | `browser-use close` |

### Execution Pattern Per Test

For each test in the plan, follow this pattern:

```
1.  Navigate to the page (if not already there).
2.  Wait for page to settle (sleep 2-3s or use `wait` command).
3.  Run `browser-use state` to get current element indices.
4.  Perform the interaction (click, type, select, scroll, etc.).
5.  Capture evidence:
      - `browser-use screenshot /tmp/test-<id>.png`
      - `browser-use eval <js>` for DOM assertions
      - `browser-use state` for post-action element state
6.  Determine result: Pass / Partial / Fail / Not Tested.
7.  Record a concise observation.
```

### Handling Common Scenarios

**SSL certificate warnings:**
```bash
browser-use state          # find "Advanced" button index
browser-use click <index>  # click Advanced
browser-use state          # find "Proceed" link index
browser-use click <index>  # click Proceed
```

**Login via form:**
```bash
browser-use state                          # find input indices
browser-use input <email_idx> "user@example.com"
browser-use input <pass_idx> "password"
browser-use click <submit_idx>             # click Sign In
sleep 3                                    # wait for redirect
browser-use screenshot /tmp/post-login.png
```

**Verifying data via JavaScript:**
```bash
# Count table rows
browser-use eval "document.querySelectorAll('tbody tr').length"

# Read metric text
browser-use eval "document.getElementById('metric-users').textContent"

# Check network requests
browser-use eval "performance.getEntriesByType('resource').filter(e => e.name.includes('api')).length"

# Check for SignalR/WebSocket connections
browser-use eval "performance.getEntriesByType('resource').filter(e => e.name.includes('negotiate')).map(e => e.name)"
```

**Handling popups and modals (SweetAlert2, Bootstrap modals, etc.):**
```bash
browser-use state          # modal elements will appear in the state tree
browser-use click <index>  # click confirm/cancel button in modal
```

**Checking HTMX partial updates (no full page reload):**
```bash
# Before action: note the element count or content
browser-use eval "document.querySelectorAll('tbody tr').length"
# Perform action (click filter, submit form, etc.)
browser-use click <index>
sleep 2
# After action: verify content changed without URL change
browser-use eval "window.location.pathname"  # should be same URL
browser-use eval "document.querySelectorAll('tbody tr').length"  # should differ
```

### Evidence Storage

Save screenshots to `/tmp/test-<section>-<id>.png` during testing. These are ephemeral evidence — the real record is the Observation column in the test plan.

### After Each Section

Update the Observation column in `docs/test.md` for every test in that section before moving to the next. Use concise result prefixes:

| Prefix | Meaning |
|--------|---------|
| **Pass** | Test assertion fully met |
| **Partial** | Some aspects work, some do not — explain what failed |
| **Fail** | Test assertion not met — explain the failure |
| **Not tested** | Could not be tested — explain why (e.g., insufficient data, CLI limitation) |

Example observations:
- `Pass — 4 metric cards visible: Users (5), Assets (12), Storage (1.2 GB), Reviews (3)`
- `Partial — Chart renders but data is all zeros (no uploads exist yet)`
- `Fail — POST returned HTTP 400; antiforgery token not included in request`
- `Not tested — Only 1 log entry; insufficient data for infinite scroll`

---

## Phase 4: Present Summary

After all tests are executed, present a summary table:

```markdown
### Results

| Section | Pass | Partial | Fail | Not Tested |
|---------|------|---------|------|------------|
| 1. ... | N | N | N | N |
| 2. ... | N | N | N | N |
| **Total** | **N** | **N** | **N** | **N** |
```

Then list key findings — failures, partial results, and anything the user should investigate manually.

Close the browser session:
```bash
browser-use close
```

---

## Known CLI Limitations

Document these when relevant to test results:

- **No viewport resize** — `browser-use` cannot change the browser viewport size. Responsive/mobile tests require manual testing or a separate tool.
- **Antiforgery tokens** — CLI-driven clicks may not trigger framework-specific request headers (e.g., HTMX `RequestVerificationToken`). POST/DELETE actions that require antiforgery tokens may return HTTP 400.
- **Element index staleness** — After any page mutation (HTMX swap, modal open, navigation), element indices from a prior `state` call are stale. Always re-run `browser-use state` before interacting.
- **JavaScript eval limits** — Complex expressions that return `null` or `undefined` show as `None`. Prefer returning simple strings or numbers.
- **No file download verification** — The CLI cannot inspect downloaded files. Use `eval` to check download triggers.
- **WebSocket inspection** — Direct WS frame inspection is not available. Use `performance.getEntriesByType('resource')` to verify negotiate/handshake requests, and `eval` to check data changes over time as a proxy for real-time updates.
