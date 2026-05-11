# Notification System — Design Spec

**Date:** 2026-05-12
**Scope:** Extend the existing notification store to carry severity + an opt-in toast flag, wire `sonner` as a theme-aware bottom-center toast layer, and instrument 8 critical app events.

---

## 1. Goals & non-goals

**Goals**

- One mental model for all in-app notifications: every event lands in the bell-popover log; opt-in events ALSO emit a transient toast.
- Theme-aware (light / dark via existing `next-themes`), minimalist, stackable toasts pinned to bottom-center.
- Instrument 8 critical events so the bell stops being a near-empty surface.
- Preserve all existing call sites (`notificationStore.push(title, body)` keeps working).

**Non-goals**

- Server-pushed / web-socket notifications.
- Persistence across reloads (store remains in-memory; the bootstrap "Welcome" entry continues to seed on each load).
- Per-user notification preferences UI.
- Notification grouping/threading beyond simple dedup keys.

---

## 2. Architecture — single stream, two views

Every notification flows through one store. The bell-popover renders the full log. A caller-controlled `toast: true` flag forks a transient sonner toast on top of that.

```
caller          notificationStore           bell popover (always)
  │   notify({ ... toast: true })  │  ──────► persists in queue (max 50)
  │  ─────────────────────────────►│
  │                                │   ──────► sonner.toast.{severity}(...)  toast layer (opt-in)
```

No second store, no separate toast API. The bell and toast are two render targets of the same event stream.

---

## 3. Store API

### 3.1 Type changes

```ts
// frontend/src/lib/notification-store.ts
export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info'

export type Notification = {
  id: string
  title: string
  description: string
  severity: NotificationSeverity // NEW
  timestamp: number
  read: boolean
  /** Optional dedup/group key. Two pushes with the same `groupKey` collapse
   *  into one bell entry (newest content wins; unread flag re-asserted). */
  groupKey?: string // NEW
}
```

### 3.2 Primary API

```ts
type NotifyOptions = {
  title: string
  description: string
  severity?: NotificationSeverity   // default 'info'
  toast?: boolean                   // default false
  toastDurationMs?: number          // default 4000 (sonner default)
  groupKey?: string
}

notificationStore.notify(options): void
```

### 3.3 Backward-compat wrapper

```ts
notificationStore.push(title, description): void
  // → notify({ title, description, severity: 'info' })
```

Existing call sites in `persisted-packet-download.tsx:51` and `packet-download.tsx:23` are migrated to `notify({ ..., severity: 'success' })` as part of this work, but `push()` remains in the public API so the migration is a refactor, not a contract break.

### 3.4 Dedup via `groupKey`

When a `notify(...)` call carries a `groupKey` matching an existing notification, the older entry is removed and the new one prepended. This is what stops "Plan B fallback active" from stacking 4 copies as the polling loop re-confirms the fallback.

The bootstrap "Welcome to Layak" notification keeps `id: 'welcome'` and no `groupKey`.

---

## 4. Bell-popover visual treatment

### 4.1 Severity → token map

| Severity  | Token                  | Light hex (approx) | Dark hex (approx) |
| --------- | ---------------------- | ------------------ | ----------------- |
| `success` | `var(--forest)`        | #5b8d6c            | #84b693           |
| `error`   | `var(--hibiscus)`      | #c45a47            | #d97c5e           |
| `warning` | `var(--warning)` (NEW) | #d4a13a            | #e6b75c           |
| `info`    | `var(--primary)`       | #4d8a87            | #93cbc8           |

### 4.2 New CSS token

Added to `frontend/src/app/globals.css`:

```css
:root {
  --warning: oklch(0.72 0.15 75);
  --warning-foreground: oklch(0.21 0.008 55);
}
.dark {
  --warning: oklch(0.78 0.13 75);
  --warning-foreground: oklch(0.16 0.014 78);
}
```

And to `@theme inline`:

```css
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
```

### 4.3 Row markup

Each bell row gains a 2px left accent bar colored by severity. The existing unread blue dot stays (orthogonal — it's read-state, not severity).

```tsx
<li className="group relative p-4 ...">
  <span
    aria-hidden
    className="absolute inset-y-2 left-0 w-[2px] rounded-r-sm"
    style={{ background: SEVERITY_TOKEN[n.severity] }}
  />
  {/* existing title/body/dismiss button */}
</li>
```

No row-level icons in v1 — the bar plus title carries the signal in a 320px column.

### 4.4 Click behavior

Unchanged: click marks the row read. No navigation. (User confirmed during design.)

---

## 5. Sonner integration

### 5.1 Toaster mount

`frontend/src/app/layout.tsx` (root) gains a single `<Toaster />` instance inside the existing `<ThemeProvider>` so `useTheme()` resolves. Use a thin client-only wrapper component (`AppToaster`) so the layout can stay a Server Component.

```tsx
// frontend/src/components/layout/app-toaster.tsx
'use client'
import { Toaster } from 'sonner'
import { useTheme } from 'next-themes'

export function AppToaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      position="bottom-center"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      duration={4000}
      visibleToasts={4}
      closeButton={false}
      richColors={false}
      gap={8}
      toastOptions={{ className: 'layak-toast' }}
    />
  )
}
```

Mount in `layout.tsx` directly after `<ThemeProvider>` children open.

### 5.2 Toast styling

Sonner exposes `[data-sonner-toast][data-type="success" | "error" | "warning" | "info"]`. Override in `globals.css`:

```css
.layak-toast[data-sonner-toast] {
  background: var(--paper);
  color: var(--ink);
  border: 1px solid color-mix(in oklch, var(--ink) 12%, transparent);
  border-radius: 10px;
  font-family: var(--font-sans);
  box-shadow: 0 18px 40px -18px color-mix(in oklch, var(--ink) 35%, transparent);
  padding-left: 14px; /* room for the accent bar */
  position: relative;
}
.layak-toast[data-sonner-toast]::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  border-radius: 0 2px 2px 0;
}
.layak-toast[data-type='success']::before {
  background: var(--forest);
}
.layak-toast[data-type='error']::before {
  background: var(--hibiscus);
}
.layak-toast[data-type='warning']::before {
  background: var(--warning);
}
.layak-toast[data-type='info']::before {
  background: var(--primary);
}
```

### 5.3 Toast icons

`<Toaster icons={{ ... }}>` slot — pass lucide icons sized `w-3.5 h-3.5` at the matching severity color:

- `success` → `CheckCircle2`
- `error` → `XCircle`
- `warning` → `AlertTriangle`
- `info` → `Info`

### 5.4 Wiring `notify()` → sonner

```ts
// inside notificationStore.notify
if (options.toast) {
  const fn = sonnerToast[options.severity ?? 'info']
  fn(options.title, {
    description: options.description,
    duration: options.toastDurationMs ?? 4000
  })
}
```

Sonner is dynamic-imported inside the store to avoid pulling it into any SSR'd module that imports the store, and to satisfy "no `'use client'` in a lib file" — the import is wrapped in a `typeof window !== 'undefined'` guard so server-rendered code paths skip the toast call entirely.

### 5.5 Reduced motion

Sonner natively respects `prefers-reduced-motion: reduce` (kills the slide-in animation). No extra wiring required.

---

## 6. Event catalog

### 6.1 Map of v1 events

| #   | Event                                         | Severity  | Toast | groupKey          | Fire location                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------- | --------- | ----- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Evaluation complete (>=1 match)               | `success` | ✅    | `eval-${id}`      | `use-agent-pipeline.ts` on `phase === 'done'` and `evaluation-results-by-id-client.tsx` on polled status transition to `complete`                                                                                                                                                                                      |
| 2   | Evaluation complete (0 matches)               | `info`    | ✅    | `eval-${id}`      | Same two spots, branched on `matches.filter(qualifies).length === 0`                                                                                                                                                                                                                                                   |
| 3   | Evaluation failed                             | `error`   | ✅    | `eval-${id}`      | Same two spots on `phase === 'error'` or `status === 'error'`. Body uses translated `error.category`                                                                                                                                                                                                                   |
| 4   | Quota approaching (1 remaining in 24h window) | `warning` | ✅    | `quota-warn`      | After a successful eval start, when the subsequent `/api/quota` response returns `remaining === 1`. Fire inside the QuotaMeter hook on the transition `prevRemaining > 1 → remaining === 1` so it doesn't re-fire on page refresh in the same state                                                                    |
| 5   | Quota exceeded                                | `error`   | ✅    | `quota-exceeded`  | When the eval start `POST` returns a `429` with `RateLimitErrorBody` (already typed in `agent-types.ts`), or when `/api/quota` reports `remaining === 0`. Whichever wins; the groupKey dedups                                                                                                                          |
| 6   | Batch delete success                          | `success` | ✅    | none              | `evaluation-history-table.tsx` `handleDelete` after success                                                                                                                                                                                                                                                            |
| 7   | Batch delete failure                          | `error`   | ✅    | none              | Same, in catch. Inline `setDeleteError` retained for in-card feedback                                                                                                                                                                                                                                                  |
| 8   | Packet ZIP downloaded                         | `success` | ❌    | none              | Existing `notificationStore.push(...)` in `persisted-packet-download.tsx:51` and `packet-download.tsx:23` migrated to `notify({ severity: 'success' })`                                                                                                                                                                |
| 9   | Plan B fallback active                        | `warning` | ❌    | `planB-${evalId}` | `evaluation-results-by-id-client.tsx` when `doc.meta?.fallback === true` (fire once per eval, guarded by groupKey). **Conditional**: this field does not exist on `EvaluationDoc` today. If the implementation plan finds adding it to backend is out of scope for this slice, defer event 9 — the other 8 still ship. |

Total: **9 entries from 8 logical events** (eval-complete branches by match count → counts as one trigger).

### 6.2 Branching for "evaluation complete"

```ts
if (matches.filter((m) => m.qualifies).length > 0) {
  notificationStore.notify({
    title: t('common.notifications.events.evalComplete.title'),
    description: t('common.notifications.events.evalComplete.body', { count }),
    severity: 'success',
    toast: true,
    groupKey: `eval-${evalId}`
  })
} else {
  notificationStore.notify({
    title: t('common.notifications.events.evalCompleteEmpty.title'),
    description: t('common.notifications.events.evalCompleteEmpty.body'),
    severity: 'info',
    toast: true,
    groupKey: `eval-${evalId}`
  })
}
```

### 6.3 Dedup behavior

The `eval-${id}` group key guarantees:

- A streaming completion + a polling-loop completion don't double-fire.
- Re-loading a results page doesn't restock the bell with a stale "complete" entry on top of itself.

The `quota-*` group keys guarantee:

- "Approaching" doesn't toast on every subsequent page navigation in the same session.

---

## 7. i18n strings

New nested namespace `common.notifications.events.*` added to `en.json`, `ms.json`, `zh.json`. Existing `evaluation.packet.notificationTitle` / `notificationBody` are migrated into `common.notifications.events.packetDownloaded.*` and removed from `evaluation.packet`.

### 7.1 English (canonical)

```json
"events": {
  "evalComplete": {
    "title": "Evaluation complete",
    "body": "Your run finished — {{count}} scheme(s) matched."
  },
  "evalCompleteEmpty": {
    "title": "Evaluation complete",
    "body": "No qualifying schemes this round."
  },
  "evalFailed": {
    "title": "Evaluation failed",
    "body": "{{category}} — try again or switch to manual entry."
  },
  "quotaApproaching": {
    "title": "Almost out of free runs",
    "body": "1 evaluation left in your 24-hour window."
  },
  "quotaExceeded": {
    "title": "Daily limit reached",
    "body": "You've used all 5 evaluations. Resets in {{hours}}h."
  },
  "batchDeleteSuccess": {
    "title": "Evaluations deleted",
    "body": "{{count}} evaluation(s) removed from history."
  },
  "batchDeleteFailure": {
    "title": "Couldn't delete evaluations",
    "body": "{{message}}"
  },
  "packetDownloaded": {
    "title": "Packet ready",
    "body": "ZIP saved to your downloads."
  },
  "planBFallback": {
    "title": "Using offline grounding",
    "body": "Vertex AI Search unreachable — citations came from inline PDFs."
  }
}
```

### 7.2 MS and ZH

Implementation plan locks exact wording matching Layak's existing translation tone. Keys mirror the English shape verbatim.

---

## 8. Files touched

**New**

- `frontend/src/components/layout/app-toaster.tsx`

**Modified**

- `frontend/src/lib/notification-store.ts` — `NotificationSeverity` type, `notify()` method, dedup via `groupKey`, sonner integration.
- `frontend/src/components/layout/notification-menu.tsx` — severity accent bar in each row.
- `frontend/src/app/layout.tsx` — mount `<AppToaster />` inside the existing `<ThemeProvider>`.
- `frontend/src/app/globals.css` — `--warning` and `--warning-foreground` tokens; `.layak-toast` styling block; `@theme inline` additions.
- `frontend/src/hooks/use-agent-pipeline.ts` — emit events 1/2/3/4/5.
- `frontend/src/components/evaluation/evaluation-results-by-id-client.tsx` — emit events 1/2/3 from the polling path; emit event 9 (Plan B fallback).
- `frontend/src/components/history/evaluation-history-table.tsx` — emit events 6/7 from `handleDelete`.
- `frontend/src/components/evaluation/persisted-packet-download.tsx` — migrate to `notify({ severity: 'success' })`.
- `frontend/src/components/evaluation/packet-download.tsx` — migrate to `notify({ severity: 'success' })`.
- `frontend/src/lib/i18n/locales/{en,ms,zh}.json` — new `common.notifications.events.*` namespace; remove migrated `evaluation.packet.notification*` keys.

---

## 9. Testing plan

Manual smoke tests after implementation:

- Trigger each of the 9 event cases in light + dark mode; confirm bell row + (where applicable) toast appear with the right severity color.
- Confirm sonner toast position is `bottom-center` on mobile (375px) and desktop (1440px). No overlap with floating Cik Lay help button or sidebar.
- Confirm `prefers-reduced-motion: reduce` kills the slide animation but the toast still appears.
- Confirm bell row click marks read; X-button dismisses; "Clear all" empties the queue.
- Confirm group-key dedup: poll an evaluation results page twice → bell shows ONE "Evaluation complete" entry, not two.
- Confirm `notificationStore.push(title, body)` (legacy API) still creates an `info` severity bell entry with no toast.
- Confirm theme flip while a toast is visible: toast colors swap without dismounting the toast.
- Type-check: `pnpm -C frontend run lint` clean.

No automated tests in v1 (matches the project's current testing posture).

---

## 10. Risks & rollback

- **Sonner SSR import** — sonner's import is module-side-effect-free but the `<Toaster />` render is client-only. The `'use client'` directive on `AppToaster` is the firewall.
- **Theme flip flicker** — sonner reads `theme` as a prop; `next-themes`' `resolvedTheme` is `undefined` on the first server render. Mitigated by mounting `AppToaster` only after hydration via `useTheme()` defaulting to light until resolved (visually one frame of light-theme toast in a hard-refresh-into-dark; acceptable).
- **i18n key migration** — `evaluation.packet.notification*` removal is a breaking change for any third party reading translations; safe inside this repo because no consumers exist. Migrating both old and new keys in the same commit avoids a window of missing strings.
- **Rollback** — single-commit revert restores the prior store + drops the `<Toaster />` mount. The `--warning` CSS token can stay; it's purely additive.
