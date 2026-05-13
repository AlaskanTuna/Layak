'use client'

import { useCallback, useEffect, useState } from 'react'

const backendBase = (): string => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'

type VerifiedRow = {
  scheme_id: string
  verified_at: string | null
}

type VerifiedResponse = {
  items: VerifiedRow[]
}

// Module-level cache so multiple scheme cards on the same page share one
// fetch rather than each issuing its own GET. The schemes overview renders
// 6+ cards and this used to be a measurable network waste before caching.
let cached: Promise<Map<string, string | null>> | null = null

async function loadVerifiedMap(): Promise<Map<string, string | null>> {
  const res = await fetch(`${backendBase()}/api/schemes/verified`)
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  const body = (await res.json()) as VerifiedResponse
  return new Map(body.items.map((row) => [row.scheme_id, row.verified_at]))
}

export function useVerifiedAt(schemeId: string | null | undefined): string | null | undefined {
  // Tri-state: undefined = loading, null = no record yet, string = ISO timestamp.
  const [state, setState] = useState<string | null | undefined>(undefined)

  const load = useCallback(async (id: string, signal: { cancelled: boolean }) => {
    if (cached === null) {
      cached = loadVerifiedMap().catch(() => new Map<string, string | null>())
    }
    const map = await cached
    if (signal.cancelled) return
    setState(map.get(id) ?? null)
  }, [])

  useEffect(() => {
    if (!schemeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(null)
      return
    }
    const signal = { cancelled: false }
    void load(schemeId, signal)
    return () => {
      signal.cancelled = true
    }
  }, [schemeId, load])

  return state
}

/** Phase 12 — returns the most-recent `verified_at` across the entire
 * `verified_schemes` collection, used by the schemes-page "Latest Update"
 * stats tile. Tri-state: undefined = loading, null = collection empty
 * (shouldn't happen post-seed), string = ISO timestamp. */
export function useLatestVerifiedAt(): string | null | undefined {
  const [state, setState] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    const signal = { cancelled: false }
    if (cached === null) {
      cached = loadVerifiedMap().catch(() => new Map<string, string | null>())
    }
    void cached.then((map) => {
      if (signal.cancelled) return
      let latest: string | null = null
      for (const value of map.values()) {
        if (value && (latest === null || value > latest)) {
          latest = value
        }
      }
      setState(latest)
    })
    return () => {
      signal.cancelled = true
    }
  }, [])

  return state
}
