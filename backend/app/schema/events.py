"""SSE event models. The frontend SSE consumer reads these shapes verbatim.

Locked wire format:

    step_started  { "type": "step_started", "step": <Step> }
    step_result   { "type": "step_result",  "step": <Step>, "data": <StepData> }
    narrative     { "type": "narrative",    "step": <Step>, "headline": str, "data_point": str|null }
    technical     { "type": "technical",    "step": <Step>, "timestamp": str, "log_lines": [str] }
    done          { "type": "done",         "packet": <Packet> }
    error         { "type": "error",        "step": <Step|null>, "message": str }

Step = extract | classify | match | compute_upside | generate.

`data` payload varies per step — see the per-step result classes below.

Phase 11 Feature 4 added the `narrative` + `technical` events. They are
informational — existing consumers can ignore them safely because the
discriminated-union dispatch is exhaustive only over the four legacy
event types in the frontend's switch statement (default branch is a
no-op pass-through). The five-step pipeline emits one narrative + one
technical event after each `step_result` so the frontend two-tier
reasoning surface can render lay narration + developer transcript
without re-deriving content from the raw step payloads.
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schema.packet import Packet
from app.schema.profile import HouseholdClassification, Profile
from app.schema.scheme import SchemeMatch
from app.schema.strategy import StrategyAdvice

# Pipeline steps in execution order. `optimize_strategy` (Phase 11 Feature 2)
# slots between `match` and `compute_upside` — the strategy advisor reasons
# over the matched set, and the upside total is computed afterwards so any
# advisory note can also influence packet copy in the generate step.
Step = Literal[
    "extract",
    "classify",
    "match",
    "optimize_strategy",
    "compute_upside",
    "generate",
]


class ExtractResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile: Profile


class ClassifyResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    classification: HouseholdClassification


class MatchResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    matches: list[SchemeMatch]


class ComputeUpsideResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    python_snippet: str
    stdout: str
    total_annual_rm: float = Field(ge=0)
    per_scheme_rm: dict[str, float]


class OptimizeStrategyResult(BaseModel):
    """Output of the new `optimize_strategy` step.

    The optimizer emits 0–3 grounded `StrategyAdvice` records. An empty list
    is a valid output — it means the profile + matches didn't trip any
    interaction rule, and the frontend renders the "no conflicts detected"
    state without a CTA. See spec §3.10 acceptance criteria.
    """

    model_config = ConfigDict(extra="forbid")

    advisories: list[StrategyAdvice] = Field(default_factory=list, max_length=3)


class GenerateResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    packet: Packet


StepData = (
    ExtractResult
    | ClassifyResult
    | MatchResult
    | OptimizeStrategyResult
    | ComputeUpsideResult
    | GenerateResult
)


class StepStartedEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["step_started"] = "step_started"
    step: Step


class StepResultEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["step_result"] = "step_result"
    step: Step
    data: StepData


class PipelineNarrativeEvent(BaseModel):
    """Lay-language tier of the two-tier reasoning surface.

    Emitted once per pipeline step right after `StepResultEvent`. The
    frontend renders these as always-visible checkmark lines. `headline`
    is action-oriented prose; `data_point` is the single most useful
    number or short label produced by the step, surfaced inline.

    `headline` and `data_point` are pre-localised strings — the backend
    knows the user's `language` at pipeline construction and emits the
    right copy directly. The frontend never re-translates these fields.
    """

    model_config = ConfigDict(extra="forbid")

    type: Literal["narrative"] = "narrative"
    step: Step
    headline: str = Field(min_length=1, max_length=80)
    data_point: str | None = Field(default=None, max_length=40)


class PipelineTechnicalEvent(BaseModel):
    """Developer-grade tier of the two-tier reasoning surface.

    Emitted once per pipeline step right after the matching
    `PipelineNarrativeEvent`. The frontend renders these inside a
    collapsed-by-default monospaced log card. `log_lines` is a 1–N list
    of pre-formatted lines; the frontend joins them with newlines.

    PII rules:
      - NEVER includes raw IC numbers (use last-4 + masked prefix).
      - NEVER includes raw uploaded-doc bytes / base64 payloads.
      - Profile free-text fields (name, address) MUST be redacted or
        omitted entirely.
    """

    model_config = ConfigDict(extra="forbid")

    type: Literal["technical"] = "technical"
    step: Step
    timestamp: str = Field(min_length=1)  # ISO-8601 UTC
    log_lines: list[str] = Field(min_length=1, max_length=20)


class DoneEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["done"] = "done"
    packet: Packet
    # Populated with the `evaluations/{evalId}` doc ID so the frontend can
    # route to `/dashboard/evaluation/results/[id]` on done. Optional so
    # callers that never touch Firestore still emit a valid Done event (e.g.
    # the mock-replay fixture).
    eval_id: str | None = None


ErrorCategory = Literal[
    "quota_exhausted",
    "service_unavailable",
    "deadline_exceeded",
    "permission_denied",
    "extract_validation",
]


class ErrorEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["error"] = "error"
    step: Step | None = None
    message: str = Field(min_length=1)
    # Stamped by `gemini.humanize_error()` so the frontend can render
    # category-tailored CTAs (retry / switch-to-manual / settings link)
    # instead of substring-matching the humanised message. `None` surfaces the
    # generic "something broke" recovery card.
    category: ErrorCategory | None = None
    # Optional legacy field. Failed evaluations are now discarded from
    # Firestore, so current callers leave this unset.
    eval_id: str | None = None


AgentEvent = Annotated[
    StepStartedEvent
    | StepResultEvent
    | PipelineNarrativeEvent
    | PipelineTechnicalEvent
    | DoneEvent
    | ErrorEvent,
    Field(discriminator="type"),
]
