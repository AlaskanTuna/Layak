'use client'

import { useCallback, useEffect, useState } from 'react'

import { getMockVerifiedOverrides, isMockEnabled, MOCK_CHANGED_EVENT } from '@/lib/admin-discovery-mock'

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
  // In mock mode the backend may not be reachable at all; skip the network
  // round-trip and seed an empty map for the override layer to fill.
  if (isMockEnabled()) {
    return new Map<string, string | null>()
  }
  const res = await fetch(`${backendBase()}/api/schemes/verified`)
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`)
  }
  const body = (await res.json()) as VerifiedResponse
  return new Map(body.items.map((row) => [row.scheme_id, row.verified_at]))
}

function overlayOverrides(map: Map<string, string | null>): Map<string, string | null> {
  if (!isMockEnabled()) return map
  const merged = new Map(map)
  for (const [schemeId, verifiedAt] of Object.entries(getMockVerifiedOverrides())) {
    merged.set(schemeId, verifiedAt)
  }
  return merged
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
    setState(overlayOverrides(map).get(id) ?? null)
  }, [])

  useEffect(() => {
    if (!schemeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(null)
      return
    }
    const signal = { cancelled: false }
    void load(schemeId, signal)

    function onChanged() {
      // Mock layer mutated the override map (approve/reject/delete) — flip
      // the badge instantly without forcing a full page reload.
      void load(schemeId!, signal)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(MOCK_CHANGED_EVENT, onChanged)
    }
    return () => {
      signal.cancelled = true
      if (typeof window !== 'undefined') {
        window.removeEventListener(MOCK_CHANGED_EVENT, onChanged)
      }
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

  const compute = useCallback(async (signal: { cancelled: boolean }) => {
    if (cached === null) {
      cached = loadVerifiedMap().catch(() => new Map<string, string | null>())
    }
    const map = overlayOverrides(await cached)
    if (signal.cancelled) return
    let latest: string | null = null
    for (const value of map.values()) {
      if (value && (latest === null || value > latest)) {
        latest = value
      }
    }
    setState(latest)
  }, [])

  useEffect(() => {
    const signal = { cancelled: false }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void compute(signal)

    function onChanged() {
      void compute(signal)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(MOCK_CHANGED_EVENT, onChanged)
    }
    return () => {
      signal.cancelled = true
      if (typeof window !== 'undefined') {
        window.removeEventListener(MOCK_CHANGED_EVENT, onChanged)
      }
    }
  }, [compute])

  return state
}
