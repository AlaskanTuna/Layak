'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Toaster } from 'sonner'

/**
 * Theme-aware sonner toast layer. Mounted once in the root layout.
 *
 * - Position: bottom-center, expanded stack (each toast at full size) so a
 *   chain of notifications reads as a clean list rather than a fanned pile
 *   with scale-shrunk back members.
 * - Theme is read from next-themes' `resolvedTheme`. The first server-render
 *   pass returns undefined; we delay rendering the Toaster until hydration
 *   to avoid a one-frame light-theme flash for hard-refresh-into-dark.
 * - Toasts inherit the .layak-toast class so globals.css styles the surface
 *   to match `.paper-card`. Severity is communicated by the inline lucide
 *   icon below — no accent strip.
 * - Animations are sonner-native (slide-in from bottom + fade-out). We don't
 *   add CSS transitions on the toast surface because they fight sonner's
 *   data-state transforms.
 */
export function AppToaster() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Toaster
      position="bottom-center"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      duration={4000}
      visibleToasts={3}
      expand
      closeButton={false}
      richColors={false}
      gap={12}
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
