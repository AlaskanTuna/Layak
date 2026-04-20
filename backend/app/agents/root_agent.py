"""RootAgent — ADK-Python SequentialAgent composition for the five-step pipeline.

Phase 1 Task 1 (this file):
  - Wraps the two stub callables as ADK `FunctionTool`s so Task 3 can bind them
    onto real Gemini-backed `LlmAgent` sub-agents without reshaping.
  - Instantiates a `SequentialAgent` shell with placeholder `LlmAgent` sub-agents
    (no `model` set — they are structural stand-ins, never executed in Task 1).
  - Exports `stream_agent_events()`, a direct async orchestrator that bypasses
    `SequentialAgent.run_async()` and emits the locked SSE event stream from the
    stubs. Task 3 replaces this with the ADK runner + Gemini 2.5 Pro orchestration.

Locked SSE wire shape (see app/schema/events.py and docs/plan.md Phase 1 Task 1):

    step_started → step_result → ... → done | error
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import FunctionTool

from app.agents.tools.extract import extract_profile
from app.agents.tools.match import match_schemes
from app.schema.events import (
    DoneEvent,
    ErrorEvent,
    ExtractResult,
    MatchResult,
    StepResultEvent,
    StepStartedEvent,
)
from app.schema.packet import Packet

extract_tool = FunctionTool(extract_profile)
match_tool = FunctionTool(match_schemes)

root_agent = SequentialAgent(
    name="layak_root_agent",
    description="Five-step pipeline: extract → classify → match → compute_upside → generate.",
    sub_agents=[
        LlmAgent(
            name="extractor_stub",
            description="Stub extractor. Task 3: Gemini 2.5 Flash multimodal + Profile schema.",
        ),
        LlmAgent(
            name="matcher_stub",
            description="Stub matcher. Task 3: rule engine + Vertex AI Search grounding.",
        ),
    ],
)

# Visible step transitions for the frontend stepper in stub mode; real Gemini
# latency in Task 3 makes this unnecessary.
_STUB_STEP_DELAY_S = 0.25


async def stream_agent_events(
    uploads: dict[str, tuple[str, bytes]],
) -> AsyncIterator[StepStartedEvent | StepResultEvent | DoneEvent | ErrorEvent]:
    """Stream the agent pipeline as ordered SSE events.

    Task 1 scaffold emits only the `extract` and `match` step pairs plus a terminal
    `done` event with an empty packet. The missing `classify`, `compute_upside`, and
    `generate` steps land in Task 3 (orchestration) and Task 5 (WeasyPrint packet).

    Args:
        uploads: Mapping of `{"ic"|"payslip"|"utility": (filename, bytes)}`.

    Yields:
        Pydantic event models in the order the frontend expects to render them.
    """
    try:
        yield StepStartedEvent(step="extract")
        await asyncio.sleep(_STUB_STEP_DELAY_S)
        profile = await extract_profile(
            uploads["ic"][1],
            uploads["payslip"][1],
            uploads["utility"][1],
        )
        yield StepResultEvent(step="extract", data=ExtractResult(profile=profile))

        yield StepStartedEvent(step="match")
        await asyncio.sleep(_STUB_STEP_DELAY_S)
        matches = await match_schemes(profile)
        yield StepResultEvent(step="match", data=MatchResult(matches=matches))

        packet = Packet(drafts=[], generated_at=datetime.now(UTC))
        yield DoneEvent(packet=packet)
    except Exception as exc:  # noqa: BLE001 — we want every failure surfaced to the UI.
        yield ErrorEvent(step=None, message=f"{type(exc).__name__}: {exc}")
