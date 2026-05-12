"""Pydantic models for the agentic scheme discovery pipeline.

`SchemeCandidate` is the structured output of the Gemini extractor — the
canonical record that lands in the `discovered_schemes` Firestore collection
with status `"pending"` and travels through the admin moderation queue.

`Citation` here is intentionally narrower than `app.schema.scheme.RuleCitation`
— the discovery pipeline cites the source page itself (URL + snippet) rather
than a specific PDF page reference, because the source may be a live HTML
page that has no stable page numbering.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schema.scheme import SchemeId

CandidateStatus = Literal["pending", "approved", "rejected", "changes_requested"]


class SourceCitation(BaseModel):
    """Provenance for a SchemeCandidate.

    The extractor MUST populate every field. A candidate without a citation
    is structurally invalid and is dropped before reaching the moderation
    queue (see `app.agents.tools.extract_candidate`).
    """

    model_config = ConfigDict(extra="forbid")

    source_url: str = Field(min_length=1)
    snippet: str = Field(min_length=1, max_length=800)


class SchemeCandidate(BaseModel):
    """Structured-output target for the Gemini extractor.

    `scheme_id` is `None` when the candidate is a brand-new scheme that
    Layak does not currently support — in that case approval writes a YAML
    manifest under `backend/data/discovered/` for engineer review, but does
    NOT promote the candidate to user-visible matching. Schemes only ship
    once an engineer hand-codes the corresponding Pydantic rule module.
    """

    model_config = ConfigDict(extra="forbid")

    candidate_id: str = Field(min_length=1)
    source_id: str = Field(min_length=1)
    scheme_id: SchemeId | None = None
    name: str = Field(min_length=1, max_length=200)
    agency: str = Field(min_length=1, max_length=80)
    eligibility_summary: str = Field(min_length=1, max_length=800)
    rate_summary: str = Field(min_length=1, max_length=400)
    citation: SourceCitation
    source_url: str = Field(min_length=1)
    source_content_hash: str = Field(min_length=1)
    extracted_at: datetime
    confidence: float = Field(ge=0.0, le=1.0)


class CandidateRecord(BaseModel):
    """Firestore-shape wrapper around a SchemeCandidate.

    Stored under `discovered_schemes/{candidate_id}`. The `status` field
    drives the admin queue filter chips; transitions are: pending → approved
    (terminal user-visible), pending → rejected (terminal), pending →
    changes_requested (returns to pending after admin action).
    """

    model_config = ConfigDict(extra="forbid")

    candidate: SchemeCandidate
    status: CandidateStatus = "pending"
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    admin_note: str | None = Field(default=None, max_length=2000)


class DiscoverySource(BaseModel):
    """Loaded entry from `backend/app/data/discovery_sources.yaml`."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    agency: str = Field(min_length=1)
    url: str = Field(min_length=1)
    content_selector: str | None = None
    check_frequency_hours: int = Field(ge=1, le=720)


class ChangedSource(BaseModel):
    """Payload the source-watcher hands to the extractor when content drifts."""

    model_config = ConfigDict(extra="forbid")

    source: DiscoverySource
    content: str = Field(min_length=1)
    content_hash: str = Field(min_length=1)
    previous_hash: str | None = None
    fetched_at: datetime


class DiscoveryRunSummary(BaseModel):
    """Result of a single end-to-end DiscoveryAgent run."""

    model_config = ConfigDict(extra="forbid")

    started_at: datetime
    finished_at: datetime
    sources_checked: int = Field(ge=0)
    sources_changed: int = Field(ge=0)
    candidates_extracted: int = Field(ge=0)
    candidates_persisted: int = Field(ge=0)
    errors: list[str] = Field(default_factory=list)
