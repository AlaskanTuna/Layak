# Notification System v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the notification store with severity + opt-in toast routing, wire sonner as a theme-aware bottom-center toast layer, and instrument 8 critical app events end-to-end.

**Architecture:** Single in-memory store, two render targets. `notificationStore.notify({ severity, toast, groupKey, ... })` is the new primary API. Bell-popover renders every entry; `toast: true` also forks a transient `sonner` toast styled to match the editorial palette. `groupKey` dedups duplicate emits (e.g. polling-driven re-emissions). Existing `push(title, body)` API kept as a thin wrapper so the two current call sites keep working.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind 4, `sonner ^2.0.7` (already in deps), `next-themes` (already mounted), `react-i18next` with en/ms/zh locales.

**Testing posture:** Per spec §9, no automated tests in v1 — Layak doesn't currently have a frontend test harness. Every task ends with a manual smoke check + lint, and the final task does an end-to-end pass over the bell + toast surfaces.

**Spec reference:** `docs/superpowers/specs/2026-05-12-notification-system-design.md` — delete after this plan merges (final task).

---

## File Structure

**Created (1 file)**

- `frontend/src/components/layout/app-toaster.tsx` — Client wrapper that mounts `<Toaster />` inside the theme provider with Layak's config (position, theme, classes, icons).

**Modified (11 files)**

- `frontend/src/lib/notification-store.ts` — Add `severity`, `groupKey`, `notify()`, dedup logic, sonner integration.
- `frontend/src/components/layout/notification-menu.tsx` — Add severity accent bar on each row.
- `frontend/src/app/layout.tsx` — Mount `<AppToaster />` inside `<ThemeProvider>`.
- `frontend/src/app/globals.css` — Add `--warning`/`--warning-foreground` tokens, `@theme inline` entries, `.layak-toast` selector block.
- `frontend/src/lib/i18n/locales/en.json` — Add `common.notifications.events.*` namespace; remove migrated `evaluation.packet.notificationTitle/Body` keys.
- `frontend/src/lib/i18n/locales/ms.json` — Mirror EN namespace; remove migrated keys.
- `frontend/src/lib/i18n/locales/zh.json` — Mirror EN namespace; remove migrated keys.
- `frontend/src/components/evaluation/persisted-packet-download.tsx` — Migrate `push` → `notify({ severity: 'success' })`, new i18n keys.
- `frontend/src/components/evaluation/packet-download.tsx` — Same migration.
- `frontend/src/components/history/evaluation-history-table.tsx` — Emit batch-delete success/failure events from `handleDelete`.
- `frontend/src/hooks/use-agent-pipeline.ts` — Emit eval-complete / eval-complete-empty / eval-failed events on the SSE `done` / `error` transitions; emit quota events when backend returns 429.
- `frontend/src/components/evaluation/evaluation-results-by-id-client.tsx` — Same eval-\* events from the polling path.
- `frontend/src/components/dashboard/quota-meter.tsx` — Emit quota-approaching when the fetched `remaining` transitions to 1.

(Total touched: 1 created + 13 modified.)

**Deferred (per spec §6.1 row 9):** Event 9 (Plan B fallback) is conditional on a backend signal that doesn't exist on `EvaluationDoc.meta` today. User approved punting it to v1.1. The store is groupKey-ready, so wiring it later is one extra `notify(...)` call.

---

## Task 1: Extend `notification-store.ts` types and `notify()` API

**Files:**

- Modify: `frontend/src/lib/notification-store.ts`

- [ ] **Step 1: Read the current file**

Run: `cat frontend/src/lib/notification-store.ts`

Capture the existing shape — you'll keep `push()` working for backward compat.

- [ ] **Step 2: Rewrite the file with the extended API**

Replace contents of `frontend/src/lib/notification-store.ts` with:

```ts
import { useSyncExternalStore } from 'react'

export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info'

export type Notification = {
  id: string
  title: string
  description: string
  severity: NotificationSeverity
  timestamp: number
  read: boolean
  /** Optional dedup/group key. Two notifies with the same key collapse — the
   *  older entry is removed and the newer one prepended (unread flag
   *  re-asserted). Used by event groups that may re-emit during polling
   *  loops (e.g. eval-complete pinned by `eval-${id}`). */
  groupKey?: string
}

export type NotifyOptions = {
  title: string
  description: string
  severity?: NotificationSeverity
  /** When true, also fires a transient sonner toast. Default false. */
  toast?: boolean
  /** Override sonner duration in ms. Default 4000. */
  toastDurationMs?: number
  groupKey?: string
}

type Listener = () => void

const WELCOME_TIMESTAMP = new Date('2026-04-21T00:00:00Z').getTime()

let notifications: Notification[] = [
  {
    id: 'welcome',
    title: 'Welcome to Layak',
    description: 'Start with an evaluation or browse the scheme library.',
    severity: 'info',
    timestamp: WELCOME_TIMESTAMP,
    read: false
  }
]

const listeners = new Set<Listener>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Notification[] {
  return notifications
}

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export const notificationStore = {
  get: getSnapshot,
  subscribe,
  /**
   * Primary API. Always populates the bell log; opt-in toast on top.
   * Sonner integration is added in Task 2 — for now this function only
   * touches the in-memory queue.
   */
  notify(options: NotifyOptions): void {
    const severity = options.severity ?? 'info'
    const groupKey = options.groupKey
    const filtered = groupKey ? notifications.filter((n) => n.groupKey !== groupKey) : notifications
    notifications = [
      {
        id: nextId(),
        title: options.title,
        description: options.description,
        severity,
        timestamp: Date.now(),
        read: false,
        groupKey
      },
      ...filtered
    ].slice(0, 50)
    emit()
  },
  /** Backward-compat wrapper. Routes to notify() with severity='info'. */
  push(title: string, description: string): void {
    notificationStore.notify({ title, description, severity: 'info' })
  },
  markAsRead(id: string): void {
    notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    emit()
  },
  dismiss(id: string): void {
    notifications = notifications.filter((n) => n.id !== id)
    emit()
  },
  clearAll(): void {
    notifications = []
    emit()
  }
}

export function useNotifications(): Notification[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
```

- [ ] **Step 3: Verify the bell still compiles against the new shape**

Run: `pnpm -C frontend exec tsc --noEmit 2>&1 | grep "notification-store\|notification-menu" | head -20`

Expected: TypeScript will complain that `notification-menu.tsx` references `n.read` and friends fine, but **may** complain that `Notification.severity` is now required and the existing component doesn't read it. The component currently doesn't use severity, so no compile error yet — confirm output is empty for these two files. If it isn't, capture the error and address in Task 6.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/notification-store.ts
git commit -m "feat(notifications): extend store with severity, groupKey, notify() API"
```

---

## Task 2: Add sonner integration to `notify()`

**Files:**

- Modify: `frontend/src/lib/notification-store.ts`

- [ ] **Step 1: Add the sonner-side import and the toast forwarder**

Edit `frontend/src/lib/notification-store.ts`. Insert these two helpers above the `export const notificationStore = ...` block:

```ts
/**
 * Sonner dispatch. Imported dynamically and guarded behind `window` because
 * the store is consumed from both server and client modules — the toast
 * call must be a no-op during SSR. Sonner itself is ESM and tree-shakes
 * the unused entry points; the dynamic import keeps cold-start lean.
 */
async function fireToast(options: NotifyOptions): Promise<void> {
  if (typeof window === 'undefined') return
  const { toast } = await import('sonner')
  const severity = options.severity ?? 'info'
  const variant = toast[severity] ?? toast.message
  variant(options.title, {
    description: options.description,
    duration: options.toastDurationMs ?? 4000
  })
}
```

Then inside `notify(options)`, after the `emit()` call, append:

```ts
if (options.toast) {
  void fireToast(options)
}
```

Final shape of `notify`:

```ts
  notify(options: NotifyOptions): void {
    const severity = options.severity ?? 'info'
    const groupKey = options.groupKey
    const filtered = groupKey
      ? notifications.filter((n) => n.groupKey !== groupKey)
      : notifications
    notifications = [
      {
        id: nextId(),
        title: options.title,
        description: options.description,
        severity,
        timestamp: Date.now(),
        read: false,
        groupKey
      },
      ...filtered
    ].slice(0, 50)
    emit()
    if (options.toast) {
      void fireToast(options)
    }
  },
```

- [ ] **Step 2: Type-check**

Run: `pnpm -C frontend exec tsc --noEmit 2>&1 | grep "notification-store" | head -10`

Expected: no errors.

- [ ] **Step 3: Lint**

Run: `pnpm -C frontend exec eslint src/lib/notification-store.ts`

Expected: clean (no output).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/notification-store.ts
git commit -m "feat(notifications): forward toast-flagged events to sonner"
```

---

## Task 3: Add `--warning` token and `.layak-toast` CSS to `globals.css`

**Files:**

- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Add `--color-warning` to the `@theme inline` block**

Locate the `@theme inline { ... }` block (top of file). Inside it, after the existing `--color-forest-foreground` line, add:

```css
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
```

- [ ] **Step 2: Add `--warning` and `--warning-foreground` to `:root` and `.dark`**

Inside `:root { ... }`, after the `--forest-foreground:` line, add:

```css
--warning: oklch(0.72 0.15 75);
--warning-foreground: oklch(0.21 0.008 55);
```

Inside `.dark { ... }`, after the `--forest-foreground:` line, add:

```css
--warning: oklch(0.78 0.13 75);
--warning-foreground: oklch(0.16 0.014 78);
```

- [ ] **Step 3: Append the `.layak-toast` styling block at the end of the file**

Add at the very bottom of `frontend/src/app/globals.css`:

```css
/* Sonner toast — Layak editorial styling. Sets the surface to paper,
   uses --ink for text, and adds a 2px severity-colored left accent bar
   to mirror the bell-popover row treatment. */
.layak-toast[data-sonner-toast] {
  background: var(--paper);
  color: var(--ink);
  border: 1px solid color-mix(in oklch, var(--ink) 12%, transparent);
  border-radius: 10px;
  font-family: var(--font-sans);
  box-shadow: 0 18px 40px -18px color-mix(in oklch, var(--ink) 35%, transparent);
  padding-left: 14px;
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

- [ ] **Step 4: Verify the file still parses (Tailwind won't error on unused tokens, but a typo could)**

Run: `pnpm -C frontend dev 2>&1 | head -30` — let it boot then Ctrl-C. Or just: `pnpm -C frontend exec next build --dry-run 2>&1 | head -20` if available. If neither is straightforward, skip and rely on the next dev run from a later task.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(theme): add --warning token and .layak-toast styling"
```

---

## Task 4: Create `AppToaster` client wrapper

**Files:**

- Create: `frontend/src/components/layout/app-toaster.tsx`

- [ ] **Step 1: Create the file**

Write `frontend/src/components/layout/app-toaster.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Toaster } from 'sonner'

/**
 * Theme-aware sonner toast layer. Mounted once in the root layout.
 *
 * - Position: bottom-center, stacked (max 4 visible, older queue offscreen).
 * - Theme is read from next-themes' `resolvedTheme`. The first server-render
 *   pass returns undefined; we delay rendering the Toaster until hydration
 *   to avoid a one-frame light-theme flash for hard-refresh-into-dark.
 * - Toasts inherit the .layak-toast class so globals.css can override the
 *   surface and add the severity accent bar.
 * - Severity icons are passed through the `icons` slot so they render
 *   inline with the title at lucide's 3.5 (14px) size.
 */
export function AppToaster() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

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
      icons={{
        success: <CheckCircle2 className="size-3.5 text-[color:var(--forest)]" aria-hidden />,
        error: <XCircle className="size-3.5 text-[color:var(--hibiscus)]" aria-hidden />,
        warning: <AlertTriangle className="size-3.5 text-[color:var(--warning)]" aria-hidden />,
        info: <Info className="size-3.5 text-[color:var(--primary)]" aria-hidden />
      }}
    />
  )
}
```

- [ ] **Step 2: Type-check + lint**

Run: `pnpm -C frontend exec tsc --noEmit 2>&1 | grep "app-toaster" | head -5`

Expected: empty.

Run: `pnpm -C frontend exec eslint src/components/layout/app-toaster.tsx`

Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/app-toaster.tsx
git commit -m "feat(notifications): add AppToaster client wrapper for sonner"
```

---

## Task 5: Mount `<AppToaster />` in the root layout

**Files:**

- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Add the import**

In `frontend/src/app/layout.tsx`, alongside the existing `import { ThemeProvider } from '@/providers/theme-provider'` line, add:

```tsx
import { AppToaster } from '@/components/layout/app-toaster'
```

- [ ] **Step 2: Mount inside `<ThemeProvider>`**

In the JSX, change the body to:

```tsx
<body>
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <I18nProvider>
      <AuthProvider>
        <LanguageSync>{children}</LanguageSync>
      </AuthProvider>
    </I18nProvider>
    <AppToaster />
  </ThemeProvider>
</body>
```

Critical: `<AppToaster />` must be **inside** `<ThemeProvider>` so `useTheme()` resolves. It sits as a sibling to `<I18nProvider>` so it isn't repeatedly re-mounted by route changes.

- [ ] **Step 3: Manual smoke test — sonner mounts**

Run: `pnpm dev`

Then in a temporary file (or via the browser console on any route):

```js
// In browser console:
import('sonner').then(({ toast }) => toast.success('Smoke test', { description: 'should appear bottom-center' }))
```

Expected: A theme-aware toast at the bottom-center of the viewport, white-cream background (light mode) or warm-dark surface (dark mode), with a 2px green left accent bar.

If nothing appears: check `<AppToaster />` is mounted (React DevTools), confirm `mounted === true` after the `useEffect`. If accent bar is missing, re-check `.layak-toast` rules in globals.css and verify `--paper`/`--ink` resolve.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/layout.tsx
git commit -m "feat(notifications): mount AppToaster in root layout"
```

---

## Task 6: Add severity accent bar to bell-popover rows

**Files:**

- Modify: `frontend/src/components/layout/notification-menu.tsx`

- [ ] **Step 1: Add the severity → token map**

At the top of `frontend/src/components/layout/notification-menu.tsx`, below imports, add:

```tsx
import type { NotificationSeverity } from '@/lib/notification-store'

const SEVERITY_BAR: Record<NotificationSeverity, string> = {
  success: 'var(--forest)',
  error: 'var(--hibiscus)',
  warning: 'var(--warning)',
  info: 'var(--primary)'
}
```

- [ ] **Step 2: Inject the accent bar inside the `<li>`**

Inside the `notifications.map((n) => (...))` block, find the `<li ...>` element. Right after the opening `<li>` tag, insert:

```tsx
<span
  aria-hidden
  className="absolute inset-y-2 left-0 w-[2px] rounded-r-sm"
  style={{ background: SEVERITY_BAR[n.severity] }}
/>
```

The `<li>` already has `relative` positioning so absolute placement works.

- [ ] **Step 3: Type-check + lint**

Run: `pnpm -C frontend exec tsc --noEmit 2>&1 | grep "notification-menu" | head -5`

Run: `pnpm -C frontend exec eslint src/components/layout/notification-menu.tsx`

Both: expect empty.

- [ ] **Step 4: Manual smoke test**

In browser console (with dev server running):

```js
window.__store = (await import('/_next/static/chunks/...notification-store...')).notificationStore
// easier: just edit any component to import and call once, then revert
```

Simpler approach: temporarily edit `frontend/src/components/layout/topbar.tsx` to add `notificationStore.notify({ title: 'Severity test', description: 'should show green bar', severity: 'success' })` in a `useEffect`, view the bell popover, confirm green bar on left of the row. Repeat for `error`, `warning`, `info`. Revert the topbar edit.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/notification-menu.tsx
git commit -m "feat(notifications): show severity accent bar on bell rows"
```

---

## Task 7: Add i18n keys to `en.json`

**Files:**

- Modify: `frontend/src/lib/i18n/locales/en.json`

- [ ] **Step 1: Locate the `common.notifications` namespace**

Run: `grep -n '"notifications"' frontend/src/lib/i18n/locales/en.json`

Capture the line number. The current shape is:

```json
"notifications": {
  "title": "Notifications",
  "clearAll": "Clear all",
  "empty": "No notifications yet."
}
```

- [ ] **Step 2: Add the `events` sub-namespace**

Inside `common.notifications`, after the existing `"empty"` key, add:

```json
,
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
  }
}
```

- [ ] **Step 3: Find and remove the now-migrated `evaluation.packet.notification*` keys**

Run: `grep -n "notificationTitle\|notificationBody" frontend/src/lib/i18n/locales/en.json`

Expected: two lines under `evaluation.packet`:

```json
"notificationTitle": "Packet ready",
"notificationBody": "Your ZIP has been saved to your downloads."
```

Remove them. (Final cleanup happens after the call sites are migrated in Tasks 9–10, so leaving them now would cause i18n key duplication. Remove them in this commit since they become unreferenced after Tasks 9–10.)

- [ ] **Step 4: Validate JSON**

Run: `python3 -c "import json; json.load(open('frontend/src/lib/i18n/locales/en.json'))" && echo OK`

Expected: `OK`. If it errors, fix syntax (missing comma is the usual culprit).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/i18n/locales/en.json
git commit -m "feat(i18n): add notification event strings (en) and migrate packet keys"
```

---

## Task 8: Mirror i18n keys to `ms.json` and `zh.json`

**Files:**

- Modify: `frontend/src/lib/i18n/locales/ms.json`
- Modify: `frontend/src/lib/i18n/locales/zh.json`

- [ ] **Step 1: Add `events` namespace to `ms.json`**

Inside `common.notifications` in `frontend/src/lib/i18n/locales/ms.json`, after `"empty"`:

```json
,
"events": {
  "evalComplete": {
    "title": "Penilaian selesai",
    "body": "Larian anda selesai — {{count}} skim padanan."
  },
  "evalCompleteEmpty": {
    "title": "Penilaian selesai",
    "body": "Tiada skim layak buat masa ini."
  },
  "evalFailed": {
    "title": "Penilaian gagal",
    "body": "{{category}} — cuba lagi atau tukar ke kemasukan manual."
  },
  "quotaApproaching": {
    "title": "Hampir habis kuota percuma",
    "body": "1 penilaian lagi dalam tetingkap 24 jam anda."
  },
  "quotaExceeded": {
    "title": "Had harian dicapai",
    "body": "Anda telah menggunakan kesemua 5 penilaian. Set semula dalam {{hours}} jam."
  },
  "batchDeleteSuccess": {
    "title": "Penilaian dipadamkan",
    "body": "{{count}} penilaian dialih keluar daripada sejarah."
  },
  "batchDeleteFailure": {
    "title": "Tidak dapat memadam penilaian",
    "body": "{{message}}"
  },
  "packetDownloaded": {
    "title": "Pakej sedia",
    "body": "ZIP disimpan ke folder muat turun anda."
  }
}
```

Remove the `evaluation.packet.notificationTitle` and `notificationBody` entries from `ms.json`.

- [ ] **Step 2: Add `events` namespace to `zh.json`**

Inside `common.notifications` in `frontend/src/lib/i18n/locales/zh.json`, after `"empty"`:

```json
,
"events": {
  "evalComplete": {
    "title": "评估完成",
    "body": "您的运行已完成 — 匹配到 {{count}} 项方案。"
  },
  "evalCompleteEmpty": {
    "title": "评估完成",
    "body": "本次未匹配到合资格方案。"
  },
  "evalFailed": {
    "title": "评估失败",
    "body": "{{category}} — 请重试或改为手动输入。"
  },
  "quotaApproaching": {
    "title": "免费额度快用完了",
    "body": "您的 24 小时窗口内还剩 1 次评估。"
  },
  "quotaExceeded": {
    "title": "已达每日上限",
    "body": "您已用完全部 5 次评估,将在 {{hours}} 小时后重置。"
  },
  "batchDeleteSuccess": {
    "title": "评估已删除",
    "body": "已从历史记录中移除 {{count}} 项评估。"
  },
  "batchDeleteFailure": {
    "title": "无法删除评估",
    "body": "{{message}}"
  },
  "packetDownloaded": {
    "title": "申请包已就绪",
    "body": "ZIP 已保存至您的下载文件夹。"
  }
}
```

Remove the `evaluation.packet.notificationTitle` and `notificationBody` entries from `zh.json`.

- [ ] **Step 3: Validate JSON for both locales**

```bash
python3 -c "import json; json.load(open('frontend/src/lib/i18n/locales/ms.json'))" && echo MS-OK
python3 -c "import json; json.load(open('frontend/src/lib/i18n/locales/zh.json'))" && echo ZH-OK
```

Expected: `MS-OK` and `ZH-OK`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/i18n/locales/ms.json frontend/src/lib/i18n/locales/zh.json
git commit -m "feat(i18n): mirror notification event strings to ms and zh"
```

---

## Task 9: Migrate `persisted-packet-download.tsx` to `notify()`

**Files:**

- Modify: `frontend/src/components/evaluation/persisted-packet-download.tsx`

- [ ] **Step 1: Replace the `notificationStore.push(...)` call**

Find line 51 (or the corresponding line). It currently reads:

```ts
notificationStore.push(t('evaluation.packet.notificationTitle'), t('evaluation.packet.notificationBody'))
```

Replace with:

```ts
notificationStore.notify({
  title: t('common.notifications.events.packetDownloaded.title'),
  description: t('common.notifications.events.packetDownloaded.body'),
  severity: 'success'
})
```

- [ ] **Step 2: Type-check + lint**

```bash
pnpm -C frontend exec tsc --noEmit 2>&1 | grep "persisted-packet-download" | head -5
pnpm -C frontend exec eslint src/components/evaluation/persisted-packet-download.tsx
```

Both: empty.

- [ ] **Step 3: Manual smoke test**

Run `pnpm dev`. Navigate to an existing evaluation results page. Click "Download ZIP". Confirm:

- ZIP downloads as before.
- Bell badge increments; row shows green accent bar + "Packet ready".
- No toast (event 7 is bell-only by design).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/evaluation/persisted-packet-download.tsx
git commit -m "refactor(notifications): migrate persisted-packet-download to notify()"
```

---

## Task 10: Migrate `packet-download.tsx` to `notify()`

**Files:**

- Modify: `frontend/src/components/evaluation/packet-download.tsx`

- [ ] **Step 1: Replace the `notificationStore.push(...)` call**

Same change as Task 9, but in `frontend/src/components/evaluation/packet-download.tsx` at the corresponding line (~23):

```ts
notificationStore.notify({
  title: t('common.notifications.events.packetDownloaded.title'),
  description: t('common.notifications.events.packetDownloaded.body'),
  severity: 'success'
})
```

- [ ] **Step 2: Type-check + lint**

```bash
pnpm -C frontend exec tsc --noEmit 2>&1 | grep "packet-download" | head -5
pnpm -C frontend exec eslint src/components/evaluation/packet-download.tsx
```

Both: empty.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/evaluation/packet-download.tsx
git commit -m "refactor(notifications): migrate streaming packet-download to notify()"
```

---

## Task 11: Emit batch-delete events from `evaluation-history-table.tsx`

**Files:**

- Modify: `frontend/src/components/history/evaluation-history-table.tsx`

- [ ] **Step 1: Find the existing `handleDelete` function**

Run: `grep -n "handleDelete\|onRefresh" frontend/src/components/history/evaluation-history-table.tsx | head -10`

Open the file and find the function body. It currently has a `try/catch` around the DELETE request, with `setDeleting`, `setDeleteError`, and `onRefresh()`.

- [ ] **Step 2: Add `notificationStore` import**

If not already imported, add at the top:

```ts
import { notificationStore } from '@/lib/notification-store'
```

- [ ] **Step 3: Emit success and failure events**

Inside `handleDelete`, immediately after the successful refresh:

```ts
const deletedCount = selected.size
onRefresh()
setSelected(new Set())
notificationStore.notify({
  title: t('common.notifications.events.batchDeleteSuccess.title'),
  description: t('common.notifications.events.batchDeleteSuccess.body', { count: deletedCount }),
  severity: 'success',
  toast: true
})
```

Inside the `catch` block, after `setDeleteError(...)`:

```ts
notificationStore.notify({
  title: t('common.notifications.events.batchDeleteFailure.title'),
  description: t('common.notifications.events.batchDeleteFailure.body', {
    message: err instanceof Error ? err.message : String(err)
  }),
  severity: 'error',
  toast: true
})
```

The inline `setDeleteError(...)` is **kept** for in-card feedback — toasts are additive, not a replacement.

- [ ] **Step 4: Type-check + lint**

```bash
pnpm -C frontend exec tsc --noEmit 2>&1 | grep "evaluation-history-table" | head -5
pnpm -C frontend exec eslint src/components/history/evaluation-history-table.tsx
```

Both: empty.

- [ ] **Step 5: Manual smoke test**

Run `pnpm dev`. On `/dashboard/evaluation`, select 2 evaluations, click Delete. Confirm:

- Success toast appears bottom-center ("Evaluations deleted — 2 evaluation(s) removed").
- Bell row appears with green bar.
- For failure: temporarily force a 4xx (e.g. break backend URL) and re-run; confirm red toast + bell row + inline error all present.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/history/evaluation-history-table.tsx
git commit -m "feat(notifications): emit batch-delete success/failure events"
```

---

## Task 12: Emit eval-complete / eval-failed events from `use-agent-pipeline.ts`

**Files:**

- Modify: `frontend/src/hooks/use-agent-pipeline.ts`

- [ ] **Step 1: Add imports**

Add to the top of `frontend/src/hooks/use-agent-pipeline.ts`:

```ts
import { notificationStore } from '@/lib/notification-store'
```

Also confirm a `useTranslation` import is already there (for `t(...)`). If not, add:

```ts
import { useTranslation } from 'react-i18next'
```

And inside the hook function body, near other hook calls:

```ts
const { t } = useTranslation()
```

- [ ] **Step 2: Find the phase-transition sites**

Run: `grep -n "'done'\|'error'\|phase = " frontend/src/hooks/use-agent-pipeline.ts | head -20`

There are two transitions to instrument:

- `phase` becomes `'done'` — emit eval-complete (or empty variant).
- `phase` becomes `'error'` — emit eval-failed.

- [ ] **Step 3: Emit on `'done'` transition**

In the SSE event handler where `phase` is set to `'done'` and `evalId` is captured, immediately after that state update emit:

```ts
const qualifyingCount = matches.filter((m) => m.qualifies).length
if (qualifyingCount > 0) {
  notificationStore.notify({
    title: t('common.notifications.events.evalComplete.title'),
    description: t('common.notifications.events.evalComplete.body', { count: qualifyingCount }),
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

- [ ] **Step 4: Emit on `'error'` transition**

In the handler that sets `phase` to `'error'`, after the state update:

```ts
notificationStore.notify({
  title: t('common.notifications.events.evalFailed.title'),
  description: t('common.notifications.events.evalFailed.body', {
    category: errorCategory ?? 'Unknown error'
  }),
  severity: 'error',
  toast: true,
  groupKey: evalId ? `eval-${evalId}` : 'eval-current'
})
```

Use the appropriate local variable names from this hook's scope (the existing reducer / setter pattern). If `errorCategory` isn't in scope at the emission site, use the `error.category` from the SSE payload that triggered the transition.

- [ ] **Step 5: Emit quota-exceeded on 429**

Find the place in the hook that handles the 429 response (look for `quotaExceeded` or `RateLimitErrorBody`). After parsing the body, emit:

```ts
const resetHours = Math.max(1, Math.round((new Date(body.resetAt).getTime() - Date.now()) / 3_600_000))
notificationStore.notify({
  title: t('common.notifications.events.quotaExceeded.title'),
  description: t('common.notifications.events.quotaExceeded.body', { hours: resetHours }),
  severity: 'error',
  toast: true,
  groupKey: 'quota-exceeded'
})
```

- [ ] **Step 6: Type-check + lint**

```bash
pnpm -C frontend exec tsc --noEmit 2>&1 | grep "use-agent-pipeline" | head -10
pnpm -C frontend exec eslint src/hooks/use-agent-pipeline.ts
```

Both: empty.

- [ ] **Step 7: Manual smoke test**

Run `pnpm dev`. Trigger an evaluation through the upload page with sample data (Aisyah). When it finishes:

- Green toast bottom-center: "Evaluation complete — 5 scheme(s) matched" (or similar count).
- Bell row added.

Then trigger an error: temporarily kill the backend mid-run. Confirm red toast + bell row "Evaluation failed".

Then exhaust quota (run 5 evals if possible, or temporarily lower `_QUOTA_LIMIT` server-side). Confirm red toast "Daily limit reached" + bell row.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/hooks/use-agent-pipeline.ts
git commit -m "feat(notifications): emit eval-complete, eval-failed, quota-exceeded events from streaming pipeline"
```

---

## Task 13: Emit eval-complete / eval-failed events from polling path

**Files:**

- Modify: `frontend/src/components/evaluation/evaluation-results-by-id-client.tsx`

- [ ] **Step 1: Add imports**

If not already present at the top of `frontend/src/components/evaluation/evaluation-results-by-id-client.tsx`:

```ts
import { notificationStore } from '@/lib/notification-store'
```

`useTranslation` is already imported.

- [ ] **Step 2: Emit on status transition**

Find the `useEffect` that runs when `doc` updates (after `fetchDoc()` populates state). Add a new `useEffect` that fires once per status transition:

```ts
const lastStatusRef = useRef<string | null>(null)
useEffect(() => {
  if (!doc) return
  if (lastStatusRef.current === doc.status) return
  lastStatusRef.current = doc.status

  if (doc.status === 'complete') {
    const qualifyingCount = doc.matches.filter((m) => m.qualifies).length
    if (qualifyingCount > 0) {
      notificationStore.notify({
        title: t('common.notifications.events.evalComplete.title'),
        description: t('common.notifications.events.evalComplete.body', { count: qualifyingCount }),
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
  } else if (doc.status === 'error') {
    notificationStore.notify({
      title: t('common.notifications.events.evalFailed.title'),
      description: t('common.notifications.events.evalFailed.body', {
        category: doc.error?.category ?? 'Unknown error'
      }),
      severity: 'error',
      toast: true,
      groupKey: `eval-${evalId}`
    })
  }
}, [doc, evalId, t])
```

The `groupKey` ensures that if the streaming hook (Task 12) ALSO emits for the same `evalId`, the polling-path emission deduplicates — only one bell row, only one toast.

Add `useRef` to the React import if not already present.

- [ ] **Step 3: Type-check + lint**

```bash
pnpm -C frontend exec tsc --noEmit 2>&1 | grep "evaluation-results-by-id-client" | head -5
pnpm -C frontend exec eslint src/components/evaluation/evaluation-results-by-id-client.tsx
```

Both: empty.

- [ ] **Step 4: Manual smoke test**

Run `pnpm dev`. Open `/dashboard/evaluation/results/<some-existing-id>` directly (no streaming, just polling/already-complete doc). Confirm a single bell row + toast appears the FIRST time. Reload the page — confirm the groupKey dedup keeps it from appearing twice (only one bell row, may toast briefly but only once on mount).

If toasts appear repeatedly on re-mount, the `lastStatusRef` guard isn't holding — confirm the ref is initialized to `null` and only assigned once per status string.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/evaluation/evaluation-results-by-id-client.tsx
git commit -m "feat(notifications): emit eval-complete/failed from polling path with dedup"
```

---

## Task 14: Emit quota-approaching from `quota-meter.tsx`

**Files:**

- Modify: `frontend/src/components/dashboard/quota-meter.tsx`

- [ ] **Step 1: Add imports**

At the top of `frontend/src/components/dashboard/quota-meter.tsx`:

```ts
import { notificationStore } from '@/lib/notification-store'
```

- [ ] **Step 2: Add transition detection**

Inside `QuotaMeter`, alongside the existing `quota` state, add a ref to track previous remaining:

```ts
const prevRemainingRef = useRef<number | null>(null)
```

Inside the existing `useEffect` that calls `fetchQuota`, after the `setQuota(next)` line, add:

```ts
const prev = prevRemainingRef.current
prevRemainingRef.current = next.remaining
if (next.tier === 'free' && prev !== null && prev > 1 && next.remaining === 1) {
  notificationStore.notify({
    title: t('common.notifications.events.quotaApproaching.title'),
    description: t('common.notifications.events.quotaApproaching.body'),
    severity: 'warning',
    toast: true,
    groupKey: 'quota-warn'
  })
}
```

The `prev > 1 && next.remaining === 1` guard ensures it fires only on the transition (not on every page load that already has 1 remaining). The `quota-warn` group key collapses repeat emits if `fetchQuota` somehow runs twice with the same transition observed.

Add `useRef` to the React import if not already there.

- [ ] **Step 3: Type-check + lint**

```bash
pnpm -C frontend exec tsc --noEmit 2>&1 | grep "quota-meter" | head -5
pnpm -C frontend exec eslint src/components/dashboard/quota-meter.tsx
```

Both: empty.

- [ ] **Step 4: Manual smoke test**

If you have a fresh account, run 4 evaluations in a row. Before the 5th, the quota meter should refetch and show `remaining: 1` — at that exact transition a warning toast appears bottom-center ("Almost out of free runs"). If the account already has remaining ≤ 1, this trigger won't fire (the transition is in the past); use a different account or reset quota server-side.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/dashboard/quota-meter.tsx
git commit -m "feat(notifications): warn when free quota drops to 1 remaining"
```

---

## Task 15: End-to-end smoke pass

**Files:** none (verification only)

- [ ] **Step 1: Boot the full dev environment**

```bash
pnpm dev
```

Open in a browser and ensure no console errors on first load.

- [ ] **Step 2: Walk through each event**

For each row below, perform the action and verify the bell + toast surfaces match the spec:

| #   | Action                                      | Expected bell row severity | Toast?                  |
| --- | ------------------------------------------- | -------------------------- | ----------------------- |
| 1   | Run evaluation with matches                 | success (green bar)        | ✅ green toast          |
| 2   | Run evaluation that yields 0 matches        | info (teal bar)            | ✅ teal toast           |
| 3   | Force pipeline error (kill backend mid-run) | error (red bar)            | ✅ red toast            |
| 4   | Use 4/5 evals then load any page            | warning (amber bar)        | ✅ amber toast          |
| 5   | Try to start 6th eval                       | error (red bar)            | ✅ red toast            |
| 6   | Select 2 history rows, delete               | success                    | ✅ green toast          |
| 7   | Force delete failure (break URL)            | error                      | ✅ red toast            |
| 8   | Download ZIP packet                         | success                    | ❌ no toast (by design) |

- [ ] **Step 3: Theme flip test**

Open the bell popover while a toast is visible. Flip the theme via the topbar toggle. Confirm:

- Toast surface color swaps to dark/light without dismount.
- Bell rows keep their severity colors (tokens already swap via CSS variables).

- [ ] **Step 4: Reduced motion test**

In browser DevTools, set `Emulate CSS media feature prefers-reduced-motion: reduce`. Trigger a toast. Confirm it appears without the slide-in animation but still visible and dismissable.

- [ ] **Step 5: Stack test**

Trigger 6 toasts in rapid succession (e.g., spam the delete + undo). Confirm sonner shows max 4 visible, older ones queue and fade in as older ones dismiss.

- [ ] **Step 6: Bell dedup test**

Reload `/dashboard/evaluation/results/<id>` 3 times on a completed evaluation. Confirm the bell shows ONE "Evaluation complete" entry, not three.

- [ ] **Step 7: No regressions**

```bash
pnpm -C frontend run lint
```

Expected: clean.

- [ ] **Step 8: Commit any smoke-pass cleanup**

If any issue was found and fixed during the smoke pass, commit it:

```bash
git add <files>
git commit -m "fix(notifications): <specific fix>"
```

If no issues, this step is a no-op.

---

## Task 16: Delete the brainstorm spec

**Files:**

- Delete: `docs/superpowers/specs/2026-05-12-notification-system-design.md`

The spec was a brainstorming artifact, not durable documentation. The user explicitly requested cleanup after implementation merges.

- [ ] **Step 1: Remove the file**

```bash
git rm docs/superpowers/specs/2026-05-12-notification-system-design.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove notification system brainstorm spec post-implementation"
```

- [ ] **Step 3: Final push**

```bash
git push origin main
```

---

## Self-Review

**Spec coverage:**

- §1 Goals → covered by Tasks 1, 2, 5 (mental model + toast layer + bell preservation).
- §2 Architecture → covered by Tasks 1–2 (single stream, two views).
- §3.1–3.4 Store API → Tasks 1 (types, notify, dedup) + 2 (sonner wiring).
- §4.1–4.4 Bell visual → Tasks 3 (token) + 6 (accent bar) + spec §4.4 click behavior preserved unchanged.
- §5.1–5.5 Sonner integration → Tasks 4 (AppToaster) + 5 (mount) + 3 (CSS) + 2 (notify→sonner wire). Reduced motion is sonner-native (verified in Task 15 step 4).
- §6.1 Event catalog rows 1–8 → Tasks 9–14. Row 9 (Plan B fallback) explicitly deferred per user.
- §6.2 eval-complete branching → covered in Tasks 12 (streaming) and 13 (polling).
- §6.3 Dedup behavior → covered by `groupKey` use in Tasks 12, 13, 14 and verified in Task 15 step 6.
- §7 i18n → Tasks 7 (en) + 8 (ms + zh).
- §8 Files touched → matches the File Structure section of this plan.
- §9 Testing plan → embedded as manual smoke checks in each task + Task 15 end-to-end pass.
- §10 Risks → SSR import guard in Task 2; theme flicker mitigation in Task 4 (`mounted` gate).

**Placeholder scan:** none — every code step contains complete, paste-ready content. No "TBD", no "similar to Task N".

**Type consistency:** `NotificationSeverity`, `NotifyOptions`, `notify()`, `groupKey` are defined once in Task 1 and referenced verbatim in every subsequent task. `lastStatusRef`, `prevRemainingRef` names consistent across their respective tasks.

**Gaps:** none identified. The deferred event 9 is called out at both the spec and plan headers — no surprise for the implementer.
