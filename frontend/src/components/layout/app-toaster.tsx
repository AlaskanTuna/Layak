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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
