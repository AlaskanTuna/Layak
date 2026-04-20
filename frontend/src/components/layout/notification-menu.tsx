'use client'

import { Bell, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { notificationStore, useNotifications } from '@/lib/notification-store'
import { cn } from '@/lib/utils'

export function NotificationMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const notifications = useNotifications()
  const unreadCount = notifications.reduce((sum, n) => sum + (n.read ? 0 : 1), 0)

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(v => !v)}
        className="relative size-8"
      >
        <Bell className="size-4" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount}
          </span>
        )}
      </Button>
      <div
        role="menu"
        aria-hidden={!isOpen}
        className={cn(
          'absolute right-0 top-full z-50 mt-2 w-80 max-h-[400px] overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-card shadow-xl',
          'origin-top-right transition-all duration-200',
          isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {notifications.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => notificationStore.clearAll()}
            >
              Clear all
            </Button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="mx-auto size-8 text-muted-foreground/40" aria-hidden />
            <p className="mt-2 text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map(n => (
              <li
                key={n.id}
                role="menuitem"
                className="group relative p-4 transition-colors hover:bg-accent/40"
                onClick={() => notificationStore.markAsRead(n.id)}
              >
                <div className="flex items-start gap-2 pr-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                      <h4 className="text-sm font-medium">{n.title}</h4>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{n.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={event => {
                    event.stopPropagation()
                    notificationStore.dismiss(n.id)
                  }}
                  className="absolute right-3 top-3 rounded-md p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
