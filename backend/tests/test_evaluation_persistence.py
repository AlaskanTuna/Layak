"""Unit tests for `app.services.evaluation_persistence`.

Firestore is stubbed with a minimal `MagicMock` surface that captures every
`.set()` / `.update()` call so each test asserts the Firestore side-effect
matches the SSE event it was triggered by.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime
from typing import Any
from unittest.mock import MagicMock

import pytest
from firebase_admin import firestore

from app.fixtures.aisyah import AISYAH_PROFILE, AISYAH_SCHEME_MATCHES
from app.schema.events import (
    ClassifyResult,
    ComputeUpsideResult,
    DoneEvent,
    ErrorEvent,
    ExtractResult,
    GenerateResult,
    MatchResult,
    StepResultEvent,
    StepStartedEvent,
)
from app.schema.packet import Packet
from app.schema.profile import HouseholdClassification
from app.services.evaluation_persistence import (
    create_running_evaluation,
    persist_event_stream,
)


@pytest.fixture
def doc_ref() -> MagicMock:
    """Fresh MagicMock doc ref per test; `.id` is a predictable string."""
    ref = MagicMock()
    ref.id = "eval-xyz"
    return ref


@pytest.fixture
def db(doc_ref: MagicMock) -> MagicMock:
    """Firestore client mock wired so `db.collection('evaluations').document()` returns `doc_ref`."""
    db_mock = MagicMock()
    db_mock.collection.return_value.document.return_value = doc_ref
    return db_mock


# --- create_running_evaluation ------------------------------------------


def test_create_running_evaluation_writes_initial_shape_no_profile(
    db: MagicMock, doc_ref: MagicMock
) -> None:
    eval_id, returned_ref = create_running_evaluation(db, user_id="uid-aisyah")
    assert eval_id == "eval-xyz"
    assert returned_ref is doc_ref
    db.collection.assert_called_with("evaluations")
    doc_ref.set.assert_called_once()
    payload = doc_ref.set.call_args.args[0]
    assert payload["userId"] == "uid-aisyah"
    assert payload["status"] == "running"
    assert payload["createdAt"] is firestore.SERVER_TIMESTAMP
    assert payload["profile"] is None
    assert payload["classification"] is None
    assert payload["matches"] == []
    assert payload["totalAnnualRM"] == 0.0
    assert payload["stepStates"] == {
        "extract": "pending",
        "classify": "pending",
        "match": "pending",
        "compute_upside": "pending",
        "generate": "pending",
    }
    assert payload["error"] is None


def test_create_running_evaluation_embeds_profile_when_provided(
    db: MagicMock, doc_ref: MagicMock
) -> None:
    """Manual-entry path supplies the profile up-front — no extract step to wait for."""
    create_running_evaluation(db, user_id="uid-aisyah", profile=AISYAH_PROFILE)
    payload = doc_ref.set.call_args.args[0]
    assert payload["profile"]["name"] == AISYAH_PROFILE.name
    assert payload["profile"]["household_flags"]["income_band"] == "b40_household_with_children"


def test_create_running_evaluation_503_on_firestore_failure(db: MagicMock, doc_ref: MagicMock) -> None:
    doc_ref.set.side_effect = RuntimeError("network blip")
    with pytest.raises(Exception) as excinfo:
        create_running_evaluation(db, user_id="uid-aisyah")
    assert getattr(excinfo.value, "status_code", None) == 503


# --- persist_event_stream -----------------------------------------------


async def _events(*items: Any) -> AsyncIterator[Any]:
    for item in items:
        yield item


async def _collect(stream: AsyncIterator[Any]) -> list[Any]:
    out: list[Any] = []
    async for ev in stream:
        out.append(ev)
    return out


@pytest.mark.asyncio
async def test_persist_forwards_step_started_and_flips_running_state(
    doc_ref: MagicMock,
) -> None:
    events = _events(StepStartedEvent(step="extract"))
    out = await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    assert len(out) == 1
    assert isinstance(out[0], StepStartedEvent)
    doc_ref.update.assert_called_once_with({"stepStates.extract": "running"})


@pytest.mark.asyncio
async def test_persist_step_result_extract_stores_profile(doc_ref: MagicMock) -> None:
    events = _events(
        StepResultEvent(step="extract", data=ExtractResult(profile=AISYAH_PROFILE))
    )
    await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    doc_ref.update.assert_called_once()
    update_payload = doc_ref.update.call_args.args[0]
    assert update_payload["stepStates.extract"] == "complete"
    assert update_payload["profile"]["name"] == AISYAH_PROFILE.name


@pytest.mark.asyncio
async def test_persist_step_result_classify_stores_classification(doc_ref: MagicMock) -> None:
    classification = HouseholdClassification(
        has_children_under_18=True,
        has_elderly_dependant=True,
        income_band="b40_household_with_children",
        per_capita_monthly_rm=700.0,
        notes=[],
    )
    events = _events(
        StepResultEvent(step="classify", data=ClassifyResult(classification=classification))
    )
    await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    payload = doc_ref.update.call_args.args[0]
    assert payload["stepStates.classify"] == "complete"
    assert payload["classification"]["income_band"] == "b40_household_with_children"


@pytest.mark.asyncio
async def test_persist_step_result_match_stores_matches(doc_ref: MagicMock) -> None:
    events = _events(
        StepResultEvent(step="match", data=MatchResult(matches=AISYAH_SCHEME_MATCHES))
    )
    await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    payload = doc_ref.update.call_args.args[0]
    assert payload["stepStates.match"] == "complete"
    assert len(payload["matches"]) == len(AISYAH_SCHEME_MATCHES)
    assert payload["matches"][0]["scheme_id"] == AISYAH_SCHEME_MATCHES[0].scheme_id


@pytest.mark.asyncio
async def test_persist_step_result_compute_upside_stores_total(doc_ref: MagicMock) -> None:
    upside = ComputeUpsideResult(
        python_snippet="",
        stdout="",
        total_annual_rm=8208.0,
        per_scheme_rm={"str_2026": 450.0, "jkm_warga_emas": 7200.0, "lhdn_form_b": 558.0},
    )
    events = _events(StepResultEvent(step="compute_upside", data=upside))
    await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    payload = doc_ref.update.call_args.args[0]
    assert payload["stepStates.compute_upside"] == "complete"
    assert payload["totalAnnualRM"] == 8208.0


@pytest.mark.asyncio
async def test_persist_step_result_generate_does_not_store_packet_bytes(doc_ref: MagicMock) -> None:
    """Spec §3.7 — packets are regenerated on demand; never persisted."""
    packet = Packet(drafts=[], generated_at=datetime(2026, 4, 21, 15, 0, 0))
    events = _events(StepResultEvent(step="generate", data=GenerateResult(packet=packet)))
    await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    payload = doc_ref.update.call_args.args[0]
    assert payload["stepStates.generate"] == "complete"
    # Packet bytes deliberately NOT written.
    assert "packet" not in payload
    assert "drafts" not in payload


@pytest.mark.asyncio
async def test_persist_done_event_stamps_completed(doc_ref: MagicMock) -> None:
    packet = Packet(drafts=[], generated_at=datetime(2026, 4, 21, 15, 0, 0))
    events = _events(DoneEvent(packet=packet))
    out = await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    done = out[0]
    # eval_id stamped onto the yielded event for the frontend.
    assert isinstance(done, DoneEvent)
    assert done.eval_id == "eval-xyz"
    payload = doc_ref.update.call_args.args[0]
    assert payload["status"] == "complete"
    assert payload["completedAt"] is firestore.SERVER_TIMESTAMP
    assert payload["stepStates.generate"] == "complete"


@pytest.mark.asyncio
async def test_persist_error_event_stamps_error_and_sanitizes(doc_ref: MagicMock) -> None:
    # Message contains a full-IC digit run that must be sanitized before
    # reaching Firestore (privacy invariant NFR-3).
    events = _events(
        ErrorEvent(step="extract", message="ValidationError: bad IC 900324064321 in payload")
    )
    out = await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    err = out[0]
    assert isinstance(err, ErrorEvent)
    assert err.eval_id == "eval-xyz"
    payload = doc_ref.update.call_args.args[0]
    assert payload["status"] == "error"
    assert payload["error"]["step"] == "extract"
    # sanitize_error_message redacts the IC digits.
    assert "900324064321" not in payload["error"]["message"]
    assert "[redacted]" in payload["error"]["message"]
    assert payload["stepStates.extract"] == "error"


@pytest.mark.asyncio
async def test_persist_error_event_without_step_skips_step_state_update(doc_ref: MagicMock) -> None:
    events = _events(ErrorEvent(step=None, message="generic failure"))
    await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    payload = doc_ref.update.call_args.args[0]
    assert payload["status"] == "error"
    # No dynamic `stepStates.{step}` key since the step was unknown.
    assert not any(k.startswith("stepStates.") for k in payload)


@pytest.mark.asyncio
async def test_persist_swallows_firestore_failure_to_keep_stream_open(doc_ref: MagicMock) -> None:
    """A Firestore write failure must not break the client's SSE stream."""
    doc_ref.update.side_effect = RuntimeError("transient firestore blip")
    events = _events(StepStartedEvent(step="extract"))
    out = await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    assert len(out) == 1
    assert isinstance(out[0], StepStartedEvent)


@pytest.mark.asyncio
async def test_persist_full_stream_order_preserved(doc_ref: MagicMock) -> None:
    """Every event flows to the client in the same order it was emitted."""
    events = _events(
        StepStartedEvent(step="extract"),
        StepResultEvent(step="extract", data=ExtractResult(profile=AISYAH_PROFILE)),
        StepStartedEvent(step="match"),
        DoneEvent(packet=Packet(drafts=[], generated_at=datetime(2026, 4, 21, 15, 0, 0))),
    )
    out = await _collect(persist_event_stream(events, eval_id="eval-xyz", doc_ref=doc_ref))
    assert [type(e).__name__ for e in out] == [
        "StepStartedEvent",
        "StepResultEvent",
        "StepStartedEvent",
        "DoneEvent",
    ]
