'use client'

import { authedFetch } from '@/lib/firebase'

const backendBase = (): string => process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'

export type CandidateStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested'

export type QueueFilter = CandidateStatus | 'all'

export type CandidateRow = {
  candidate_id: string
  source_id: string
  scheme_id: string | null
  name: string
  agency: string
  status: CandidateStatus
  created_at: string | null
  reviewed_at: string | null
  confidence: number
}

export type QueueResponse = {
  items: CandidateRow[]
}

export type SourceCitation = {
  source_url: string
  snippet: string
}

export type SchemeCandidate = {
  candidate_id: string
  source_id: string
  scheme_id: string | null
  name: string
  agency: string
  eligibility_summary: string
  rate_summary: string
  citation: SourceCitation
  source_url: string
  source_content_hash: string
  extracted_at: string
  confidence: number
}

export type CandidateDetail = {
  candidate: SchemeCandidate
  status: CandidateStatus
  reviewed_by: string | null
  reviewed_at: string | null
  admin_note: string | null
}

export type ActionResponse = {
  candidate_id: string
  status: CandidateStatus
  manifest_path: string | null
  manifest_yaml: string | null
}

export type DiscoveryRunSummary = {
  started_at: string
  finished_at: string
  sources_checked: number
  sources_changed: number
  candidates_extracted: number
  candidates_persisted: number
  errors: string[]
}

export type SchemeHealthRow = {
  scheme_id: string
  verified_at: string | null
  source_content_hash: string | null
}

export type SchemeHealthResponse = {
  items: SchemeHealthRow[]
}

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
  const url = new URL(`${backendBase()}/api/admin/discovery/queue`)
  url.searchParams.set('status', filter)
  const res = await authedFetch(url.toString())
  return jsonOrThrow<QueueResponse>(res)
}

export async function fetchCandidate(candidateId: string): Promise<CandidateDetail> {
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/${candidateId}`)
  return jsonOrThrow<CandidateDetail>(res)
}

export async function triggerDiscovery(): Promise<DiscoveryRunSummary> {
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/trigger`, {
    method: 'POST'
  })
  return jsonOrThrow<DiscoveryRunSummary>(res)
}

export async function approveCandidate(candidateId: string, note?: string): Promise<ActionResponse> {
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/${candidateId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: note ?? null })
  })
  return jsonOrThrow<ActionResponse>(res)
}

export async function rejectCandidate(candidateId: string, note?: string): Promise<ActionResponse> {
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/${candidateId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: note ?? null })
  })
  return jsonOrThrow<ActionResponse>(res)
}

export async function requestChangesCandidate(candidateId: string, note?: string): Promise<ActionResponse> {
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/${candidateId}/request-changes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: note ?? null })
  })
  return jsonOrThrow<ActionResponse>(res)
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  const res = await authedFetch(`${backendBase()}/api/admin/discovery/${candidateId}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    throw new Error(`${candidateId}: ${res.status} ${res.statusText}`)
  }
}

export async function fetchSchemeHealth(): Promise<SchemeHealthResponse> {
  const res = await authedFetch(`${backendBase()}/api/admin/schemes/health`)
  return jsonOrThrow<SchemeHealthResponse>(res)
}
