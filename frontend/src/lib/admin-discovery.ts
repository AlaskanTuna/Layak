'use client'

import { authedFetch } from '@/lib/firebase'
import {
  isMockEnabled,
  mockApprove,
  mockDelete,
  mockFetchCandidate,
  mockFetchQueue,
  mockFetchSchemeHealth,
  mockReject,
  mockRequestChanges,
  mockTrigger
} from '@/lib/admin-discovery-mock'

export type {
  ActionResponse,
  CandidateDetail,
  CandidateRow,
  CandidateStatus,
  DiscoveryRunSummary,
  QueueFilter,
  QueueResponse,
  SchemeCandidate,
  SchemeHealthResponse,
  SchemeHealthRow,
  SourceCitation
} from '@/lib/admin-discovery-types'

import type {
  ActionResponse,
  CandidateDetail,
  DiscoveryRunSummary,
  QueueFilter,
  QueueResponse,
  SchemeHealthResponse
} from '@/lib/admin-discovery-types'

const backendBase = (): string => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { detail?: string }
      if (body.detail) detail = body.detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  return (await res.json()) as T
}

export async function fetchQueue(filter: QueueFilter): Promise<QueueResponse> {
  if (isMockEnabled()) return mockFetchQueue(filter)
  const url = new URL(`${backendBase()}/api/admin/discovery/queue`)
  url.searchParams.set('status', filter)
  const res = await authedFetch(url.toString())
  return jsonOrThrow<QueueResponse>(res)
}

export async function fetchCandidate(candidateId: string): Promise<CandidateDetail> {
  if (isMockEnabled()) return mockFetchCandidate(candidateId)
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/${candidateId}`)
  return jsonOrThrow<CandidateDetail>(res)
}

export async function triggerDiscovery(): Promise<DiscoveryRunSummary> {
  if (isMockEnabled()) return mockTrigger()
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/trigger`, {
    method: 'POST'
  })
  return jsonOrThrow<DiscoveryRunSummary>(res)
}

export async function approveCandidate(candidateId: string, note?: string): Promise<ActionResponse> {
  if (isMockEnabled()) return mockApprove(candidateId, note)
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/${candidateId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: note ?? null })
  })
  return jsonOrThrow<ActionResponse>(res)
}

export async function rejectCandidate(candidateId: string, note?: string): Promise<ActionResponse> {
  if (isMockEnabled()) return mockReject(candidateId, note)
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/${candidateId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: note ?? null })
  })
  return jsonOrThrow<ActionResponse>(res)
}

export async function requestChangesCandidate(candidateId: string, note?: string): Promise<ActionResponse> {
  if (isMockEnabled()) return mockRequestChanges(candidateId, note)
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/${candidateId}/request-changes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: note ?? null })
  })
  return jsonOrThrow<ActionResponse>(res)
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  if (isMockEnabled()) {
    mockDelete(candidateId)
    return
  }
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/${candidateId}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    throw new Error(`${candidateId}: ${res.status} ${res.statusText}`)
  }
}

export async function fetchSchemeHealth(): Promise<SchemeHealthResponse> {
  if (isMockEnabled()) return mockFetchSchemeHealth()
  const res = await authedFetch(`${backendBase()}/api/admin/schemes/health`)
  return jsonOrThrow<SchemeHealthResponse>(res)
}
