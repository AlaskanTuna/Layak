"""RootAgent — ADK-Python SequentialAgent composition for the five-step pipeline.

Phase 1 Task 3 Path 1 (scaffolding-only tonight; Gemini wiring at sprint start):
  - Wraps all five stub callables as ADK `FunctionTool`s so the real Task 3
    sub-agents can bind them onto Gemini-backed `LlmAgent`s without reshaping.
  - Instantiates a `SequentialAgent` shell with five placeholder `LlmAgent`
    sub-agents (no `model` set — structural stand-ins, never executed by ADK
    in stub mode). Each placeholder's `description` names the Task 3 target
    model + tool binding so the swap is mechanical.
  - Exports `stream_agent_events()`, a direct async orchestrator that bypasses
    `SequentialAgent.run_async()` and emits the locked SSE event stream from
    the stubs. Task 3 Path 2 replaces this with the ADK runner + real Gemini
    calls.

Locked SSE wire shape (see app/schema/events.py and docs/plan.md Phase 1 Task 1):

    step_started → step_result → ... → done | error

Step order: extract → classify → match → compute_upside → generate → done.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from google.adk.agents import LlmAgent, SequentialAgent
from google.adk.tools import FunctionTool

from app.agents.gemini import sanitize_error_message
from app.agents.tools.classify import classify_household
from app.agents.tools.compute_upside import compute_upside
from app.agents.tools.extract import extract_profile
from app.agents.tools.generate_packet import generate_packet
from app.agents.tools.match import match_schemes
from app.schema.events import (
    ClassifyResult,
    DoneEvent,
    ErrorEvent,
    ExtractResult,
    GenerateResult,
    MatchResult,
    Step,
    StepResultEvent,
    StepStartedEvent,
)
from app.schema.profile import Profile

# Tool registry — Task 3 Path 2 binds these to Gemini-backed LlmAgents.
extract_tool = FunctionTool(extract_profile)
classify_tool = FunctionTool(classify_household)
match_tool = FunctionTool(match_schemes)
compute_upside_tool = FunctionTool(compute_upside)
generate_packet_tool = FunctionTool(generate_packet)

root_agent = SequentialAgent(
    name="layak_root_agent",
    description="Five-step pipeline: extract → classify → match → compute_upside → generate.",
    sub_agents=[
        LlmAgent(
            name="extractor_stub",
            description=(
                "Stub extractor. Task 3 Path 2: Gemini 2.5 Flash multimodal reading "
                "IC + payslip + utility-bill uploads into a Profile with structured output."
            ),
        ),
        LlmAgent(
            name="classifier_stub",
            description=(
                "Stub classifier. Task 3 Path 2: Gemini 2.5 Flash structured output "
                "emitting household-flags + per-capita income + income band."
            ),
        ),
        LlmAgent(
            name="matcher_stub",
            description=(
                "Stub matcher. Task 3 Path 2: Vertex AI Search retrieves passage + URL "
                "per rule, then the rule engine in app/rules/ validates thresholds."
            ),
        ),
        LlmAgent(
            name="upside_computer_stub",
            description=(
                "Stub compute_upside. Task 3 Path 2: Gemini 2.5 Pro with code_execution "
                "runs Python in a sandbox; stdout streamed to the UI verbatim."
            ),
        ),
        LlmAgent(
            name="packet_generator_stub",
            description=(
                "Stub packet generator. Task 5: WeasyPrint renders three Jinja HTML "
                "templates into PDFs watermarked 'DRAFT — NOT SUBMITTED'."
            ),
        ),
    ],
)

# Small inter-step delay for perceptible stepper animation in stub mode. At
# real-Gemini latencies (15-20 s per call) this is noise; kept for dev-mode
# smoke tests against canned fixtures.
_INTER_STEP_DELAY_S = 0.1


async def stream_agent_events(
    uploads: dict[str, tuple[str, bytes]] | None = None,
    *,
    prebuilt_profile: Profile | None = None,
) -> AsyncIterator[StepStartedEvent | StepResultEvent | DoneEvent | ErrorEvent]:
    """Stream the five-step pipeline as ordered SSE events.

    Two entry modes:

    - **Upload path** (default, FR-2/FR-3): pass `uploads={"ic"|"payslip"|"utility":
      (filename, bytes)}`. Gemini OCR runs `extract_profile` on the three files.
    - **Manual-entry path** (FR-21): pass `prebuilt_profile=<Profile>`. Extract
      is skipped, but the SSE wire still emits a synthetic `step_started`/
      `step_result` pair for `extract` so the frontend stepper animation is
      unchanged.

    Each step that's in-flight when an exception is raised is recorded as
    `current_step`, so the terminal `ErrorEvent` can identify the failing step
    and the frontend stepper can mark exactly that pill as errored (instead of
    leaving the previously-started step spinning).

    The error message is sanitized (`sanitize_error_message`) to redact any
    5+-digit runs and cap length — this prevents a hallucinated full MyKad IC
    from leaking via a `Profile.model_validate_json` `ValidationError`.

    Yields:
        Pydantic event models in the order the frontend expects to render them.
    """
    if (uploads is None) == (prebuilt_profile is None):
        raise ValueError("stream_agent_events requires exactly one of `uploads` or `prebuilt_profile`")
    current_step: Step | None = None
    try:
        current_step = "extract"
        yield StepStartedEvent(step=current_step)
        await asyncio.sleep(_INTER_STEP_DELAY_S)
        if prebuilt_profile is not None:
            profile = prebuilt_profile
        else:
            assert uploads is not None  # narrowed by the XOR check above
            profile = await extract_profile(
                uploads["ic"][1],
                uploads["payslip"][1],
                uploads["utility"][1],
            )
        yield StepResultEvent(step=current_step, data=ExtractResult(profile=profile))

        current_step = "classify"
        yield StepStartedEvent(step=current_step)
        await asyncio.sleep(_INTER_STEP_DELAY_S)
        classification = await classify_household(profile)
        yield StepResultEvent(step=current_step, data=ClassifyResult(classification=classification))

        current_step = "match"
        yield StepStartedEvent(step=current_step)
        await asyncio.sleep(_INTER_STEP_DELAY_S)
        matches = await match_schemes(profile)
        yield StepResultEvent(step=current_step, data=MatchResult(matches=matches))

        current_step = "compute_upside"
        yield StepStartedEvent(step=current_step)
        await asyncio.sleep(_INTER_STEP_DELAY_S)
        trace = await compute_upside(matches)
        yield StepResultEvent(step=current_step, data=trace)

        current_step = "generate"
        yield StepStartedEvent(step=current_step)
        await asyncio.sleep(_INTER_STEP_DELAY_S)
        packet = await generate_packet(profile, matches)
        yield StepResultEvent(step=current_step, data=GenerateResult(packet=packet))

        yield DoneEvent(packet=packet)
    except Exception as exc:  # noqa: BLE001 — surface every failure to the UI.
        raw = f"{type(exc).__name__}: {exc}"
        yield ErrorEvent(step=current_step, message=sanitize_error_message(raw))
