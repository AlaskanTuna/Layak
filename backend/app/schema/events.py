"""SSE event models. The frontend SSE consumer reads these shapes verbatim.

Locked wire format (see docs/plan.md Phase 1 Task 1):

    step_started  { "type": "step_started", "step": <Step> }
    step_result   { "type": "step_result",  "step": <Step>, "data": <StepData> }
    done          { "type": "done",         "packet": <Packet> }
    error         { "type": "error",        "step": <Step|null>, "message": str }

Step = extract | classify | match | compute_upside | generate.

`data` payload varies per step — see the per-step result classes below. Task 1 only
emits extract and match; the other three land in Phase 1 Task 3 (classify,
compute_upside) and Task 5 (generate).
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schema.packet import Packet
from app.schema.profile import HouseholdClassification, Profile
from app.schema.scheme import SchemeMatch

Step = Literal["extract", "classify", "match", "compute_upside", "generate"]


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


class GenerateResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    packet: Packet


StepData = ExtractResult | ClassifyResult | MatchResult | ComputeUpsideResult | GenerateResult


class StepStartedEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["step_started"] = "step_started"
    step: Step


class StepResultEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["step_result"] = "step_result"
    step: Step
    data: StepData


class DoneEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["done"] = "done"
    packet: Packet
    # Phase 3 Task 1: populated with the `evaluations/{evalId}` doc ID so the
    # frontend can route to `/dashboard/evaluation/results/[id]` on done.
    # Optional so pre-Phase-3 callers that never touch Firestore still emit a
    # valid Done event (e.g. the mock-replay fixture).
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
    # Phase 7 Task 6: stamped by `gemini.humanize_error()` so the frontend can
    # render category-tailored CTAs (retry / switch-to-manual / settings link)
    # instead of substring-matching the humanised message. `None` surfaces the
    # generic "something broke" recovery card.
    category: ErrorCategory | None = None
    # Phase 3 Task 1: populated when the evaluation doc was already created
    # before the error — lets the frontend link the user to the failed eval.
    eval_id: str | None = None


AgentEvent = Annotated[
    StepStartedEvent | StepResultEvent | DoneEvent | ErrorEvent,
    Field(discriminator="type"),
]
