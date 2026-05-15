/**
 * Shared discovery-pipeline types — extracted out of `admin-discovery.ts` so
 * the mock layer (`admin-discovery-mock.ts`) and the real network layer
 * (`admin-discovery.ts`) can both depend on a common surface without a
 * circular import.
 */

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
