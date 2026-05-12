"""Pydantic models for the Cross-Scheme Strategy Optimizer (Phase 11 Feature 2).

A `StrategyAdvice` record is a single cross-scheme advisory — e.g. "if your
sibling files taxes too, only one of you should claim the dependent-parent
relief." Each advisory is grounded in a hand-coded interaction rule from
`backend/app/data/scheme_interactions.yaml` AND a citation to a source PDF.

v1 grounding stack (4 of 5 layers from spec §3.5):
  1. YAML registry: `interaction_id` MUST exist in `scheme_interactions.yaml`;
     unknown ids are dropped before reaching the frontend.
  2. Pydantic schema: this module — mandatory `interaction_id`, `citation`,
     `confidence`, severity literal, length caps on headline/rationale.
  3. (DEFERRED to v1.1) Vertex AI Search re-grounding of citation page refs.
  4. Few-shot prompt: hand-written Aisyah-style worked examples in
     `backend/app/agents/optimizer_prompt.py`.
  5. Frontend confidence gating: ≥ 0.8 full card; 0.5–0.8 soft suggestion +
     force-show CTA; < 0.5 suppressed entirely.

The optimizer step runs between `match_schemes` and `compute_upside`; the
output is persisted to `evaluations/{evalId}.strategy` so post-load chat
and what-if (Feature 3) can reference the advisories.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schema.scheme import SchemeId

# `info` — informational only, no user action implied.
# `warn` — proceed with caution; a sibling might be claiming the same relief.
# `act`  — clear action item ("only one filer should claim X").
StrategySeverity = Literal["info", "warn", "act"]


class StrategyCitation(BaseModel):
    """Grounding citation for a StrategyAdvice — required, non-null.

    Mirrors the shape of `RuleCitation` (in `app.schema.scheme`) but
    intentionally narrower: the optimizer cites the PDF page that defines
    the interaction (e.g. PR-4/2024 §5.2 p.12 for dependent-parent relief),
    not a Vertex retrieval result. v1.1 will add re-grounding via Vertex AI
    Search to verify the (pdf, page) pair exists in the source PDFs.
    """

    model_config = ConfigDict(extra="forbid")

    pdf: str = Field(min_length=1, max_length=120)
    section: str | None = Field(default=None, max_length=40)
    page: int | None = Field(default=None, ge=1, le=2000)


class StrategyAdvice(BaseModel):
    """One cross-scheme advisory rendered as a card on the results page.

    `interaction_id` MUST exist in `scheme_interactions.yaml` — the optimizer
    drops any record whose id does not resolve. `applies_to_scheme_ids`
    enumerates which matched schemes the advisory touches so the frontend
    can highlight those cards alongside the strategy section.

    `suggested_chat_prompt` populates the chat input when the user clicks
    the "Ask Cik Lay about this" CTA. `None` means no CTA is shown.
    """

    model_config = ConfigDict(extra="forbid")

    advice_id: str = Field(min_length=1)
    interaction_id: str = Field(min_length=1)
    severity: StrategySeverity
    headline: str = Field(min_length=1, max_length=80)
    rationale: str = Field(min_length=1, max_length=280)
    citation: StrategyCitation
    confidence: float = Field(ge=0.0, le=1.0)
    suggested_chat_prompt: str | None = Field(default=None, max_length=240)
    applies_to_scheme_ids: list[SchemeId] = Field(default_factory=list)


class SchemeInteractionRule(BaseModel):
    """One loaded entry from `backend/app/data/scheme_interactions.yaml`.

    `applies_to` and `trigger_conditions` describe when the rule should be
    surfaced as an advisory candidate; `advice_template` is the editorial
    rationale text the Gemini call may use as-is or paraphrase per locale;
    `citation` is the grounding source for the rule.
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    applies_to: list[SchemeId] = Field(min_length=1)
    trigger_conditions: dict[str, object] = Field(default_factory=dict)
    rule: str = Field(min_length=1)
    advice_template: str = Field(min_length=1)
    severity: StrategySeverity
    citation: StrategyCitation
    suggested_chat_prompt: str | None = Field(default=None, max_length=240)
