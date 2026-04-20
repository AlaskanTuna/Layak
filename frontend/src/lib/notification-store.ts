import { useSyncExternalStore } from 'react'

export type Notification = {
  id: string
  title: string
  description: string
  timestamp: number
  read: boolean
}

type Listener = () => void

const WELCOME_TIMESTAMP = new Date('2026-04-21T00:00:00Z').getTime()

let notifications: Notification[] = [
  {
    id: 'welcome',
    title: 'Welcome to Layak',
    description: 'Start with an evaluation or browse the scheme library.',
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

export const notificationStore = {
  get: getSnapshot,
  subscribe,
  push(title: string, description: string): void {
    notifications = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        description,
        timestamp: Date.now(),
        read: false
      },
      ...notifications
    ].slice(0, 50)
    emit()
  },
  markAsRead(id: string): void {
    notifications = notifications.map(n => (n.id === id ? { ...n, read: true } : n))
    emit()
  },
  dismiss(id: string): void {
    notifications = notifications.filter(n => n.id !== id)
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
