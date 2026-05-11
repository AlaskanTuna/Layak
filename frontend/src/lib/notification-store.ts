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

/**
 * Toast dispatch via react-hot-toast's custom JSX renderer. The store is
 * consumed from both server and client modules, so the call is guarded
 * behind `window` to make it a no-op during SSR; the actual renderer in
 * `./toast.tsx` is dynamically imported to keep cold-start lean.
 *
 * `groupKey` is passed as the react-hot-toast `id` so duplicate emits
 * (e.g. a polling loop confirming the same evaluation completion) collapse
 * into a single visible toast.
 */
async function dispatchToast(options: NotifyOptions): Promise<void> {
  if (typeof window === 'undefined') return
  const { fireToast } = await import('./toast')
  fireToast({
    title: options.title,
    description: options.description,
    severity: options.severity ?? 'info',
    durationMs: options.toastDurationMs ?? 4000,
    id: options.groupKey
  })
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
    if (options.toast) {
      void dispatchToast(options)
    }
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
