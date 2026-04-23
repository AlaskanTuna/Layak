"""Pydantic mirrors of the Firestore document shapes.

Source of truth: docs/superpowers/specs/2026-04-21-v2-saas-pivot-design.md §3.3
(schema summary) and docs/trd.md §5.5. These models are validation-only — the
Firestore Admin SDK still stores dicts with `SERVER_TIMESTAMP` sentinels on
write, so server-side writes build dicts directly. These models are used for
*reading* docs back (validates the shape the frontend will receive), for typing
the persistence helpers, and for unit tests.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import HouseholdClassification, Profile
from app.schema.scheme import SchemeMatch

EvaluationStatus = Literal["running", "complete", "error"]
Tier = Literal["free", "pro"]
StepState = Literal["pending", "running", "complete", "error"]

PIPELINE_STEP_KEYS: tuple[str, ...] = (
    "extract",
    "classify",
    "match",
    "compute_upside",
    "generate",
)


class UserDoc(BaseModel):
    """Mirror of `users/{userId}` — lazy-created by `app.auth._upsert_user_doc`."""

    model_config = ConfigDict(extra="forbid")

    email: str | None = None
    displayName: str | None = None  # noqa: N815 — Firestore field is camelCase
    photoURL: str | None = None  # noqa: N815
    tier: Tier = "free"
    # Phase 9: persisted UI / pipeline language preference. Pre-Phase-9 docs
    # have no `language` field; readers default to `"en"` so missing-field
    # docs validate without a backfill.
    language: SupportedLanguage = DEFAULT_LANGUAGE
    createdAt: datetime | None = None  # noqa: N815 — SERVER_TIMESTAMP resolves async
    lastLoginAt: datetime | None = None  # noqa: N815
    pdpaConsentAt: datetime | None = None  # noqa: N815


class EvaluationError(BaseModel):
    """Embedded inside `evaluations/{evalId}.error` when the pipeline fails."""

    model_config = ConfigDict(extra="forbid")

    step: str | None = None
    message: str


class StepStates(BaseModel):
    """The five pipeline steps' per-step state, mirrored on the Firestore doc.

    Each key moves through `pending → running → complete` (or `error` for the
    failing step). The frontend stepper reads these to drive its pill UI.
    """

    model_config = ConfigDict(extra="forbid")

    extract: StepState = "pending"
    classify: StepState = "pending"
    match: StepState = "pending"
    compute_upside: StepState = "pending"
    generate: StepState = "pending"


class ComputeUpsideTrace(BaseModel):
    """Persisted trace of the `compute_upside` step's Gemini Code Execution call.

    The frontend `CodeExecutionPanel` renders the `<pre>` blocks for the
    Python source and stdout verbatim, so we persist them on the Firestore
    doc. Without this, a results page hydrated from Firestore (post-refresh
    or via a deep link) shows an empty panel.
    """

    model_config = ConfigDict(extra="forbid")

    pythonSnippet: str = ""  # noqa: N815 — Firestore field is camelCase
    stdout: str = ""
    perSchemeRM: dict[str, float] = Field(default_factory=dict)  # noqa: N815


class EvaluationDoc(BaseModel):
    """Mirror of `evaluations/{evalId}` — written by the intake route.

    `profile`, `classification`, and `matches` are populated as the pipeline
    runs. `totalAnnualRM` is computed from the `SchemeMatch[]` on `done`.
    Everything here is embedded — no subcollections, no packet PDFs persisted
    (packets regenerate on-demand from `profile` + `matches`).
    """

    model_config = ConfigDict(extra="forbid")

    userId: str = Field(min_length=1)  # noqa: N815
    status: EvaluationStatus
    # Phase 9: the language the eval ran under. Frozen at create-time so
    # toggling the UI toggle mid-run doesn't silently repaint `why_qualify`
    # strings in a language they weren't generated in. Pre-Phase-9 docs
    # default to `"en"` via the field default below.
    language: SupportedLanguage = DEFAULT_LANGUAGE
    createdAt: datetime | None = None  # noqa: N815 — SERVER_TIMESTAMP sentinel on write
    completedAt: datetime | None = None  # noqa: N815
    profile: Profile | None = None
    classification: HouseholdClassification | None = None
    matches: list[SchemeMatch] = Field(default_factory=list)
    totalAnnualRM: float = Field(default=0.0, ge=0)  # noqa: N815
    upsideTrace: ComputeUpsideTrace | None = None  # noqa: N815
    stepStates: StepStates = Field(default_factory=StepStates)  # noqa: N815
    error: EvaluationError | None = None
