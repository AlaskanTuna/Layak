'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { Toaster } from 'sonner'

/**
 * Sonner toast layer mounted once in the root layout.
 *
 * - **Surface:** always dark ("command-center pill") regardless of theme —
 *   surface styling lives in `globals.css` under `.layak-toast`. The Toaster
 *   theme prop is pinned to `dark` so sonner's internal text/border defaults
 *   don't fight our overrides in light mode.
 * - **Position:** bottom-center, expanded stack — every toast renders at full
 *   size so a chain reads as a clean list, not a fanned-and-scaled pile.
 * - **Mounting:** gated behind a `mounted` flag so the first server pass
 *   produces no output and we never ship a hydration mismatch.
 * - **Severity icons:** lucide ringed-icon family (CheckCircle2 / XCircle /
 *   AlertCircle / Info) at 16px in brand colour against the dark surface.
 * - **Animations:** sonner-native (slide-in from bottom + fade-out). The CSS
 *   block deliberately omits `transition:` on the surface to avoid fighting
 *   sonner's data-state transforms.
 */
export function AppToaster() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Toaster
      position="bottom-center"
      theme="dark"
      duration={4000}
      visibleToasts={3}
      expand
      closeButton={false}
      richColors={false}
      gap={12}
      toastOptions={{ className: 'layak-toast' }}
      icons={{
        success: <CheckCircle2 className="size-4 text-[color:var(--forest)]" aria-hidden />,
        error: <XCircle className="size-4 text-[color:var(--hibiscus)]" aria-hidden />,
        warning: <AlertCircle className="size-4 text-[color:var(--warning)]" aria-hidden />,
        info: <Info className="size-4 text-[color:var(--primary)]" aria-hidden />
      }}
    />
  )
}
