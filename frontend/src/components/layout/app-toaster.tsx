'use client'

import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'

/**
 * react-hot-toast toast layer mounted once in the root layout.
 *
 * The actual toast JSX (dark command-center pill with ringed severity icon
 * + centered title/description) is rendered by `fireToast()` in
 * `@/lib/toast` via `toast.custom(...)`. This component only mounts the
 * container that hosts those toasts.
 *
 * Mounting is gated behind a `mounted` flag so the first server pass
 * produces no output and we never ship a hydration mismatch.
 */
export function AppToaster() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Toaster position="bottom-center" gutter={10} containerStyle={{ bottom: 24 }} toastOptions={{ duration: 4000 }} />
  )
}
