"""Tests for the manual-entry intake path.

The key invariant: given the Aisyah JSON payload, `build_profile_from_manual_entry`
produces a `Profile` equal to `AISYAH_PROFILE` field-for-field, and feeding that
built `Profile` through the same rule engine the upload path uses produces the
same `SchemeMatch[]` list as the fixture's `AISYAH_SCHEME_MATCHES`.
"""

from __future__ import annotations

import json
from datetime import date
from typing import Any
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app import auth as auth_module
from app.agents.tools.build_profile import (
    _age_from_dob,
    _classify_income_band,
    build_profile_from_manual_entry,
    derive_household_flags,
)
from app.fixtures.aisyah import AISYAH_PROFILE, AISYAH_SCHEME_MATCHES
from app.rules import i_saraan, jkm_bkk, jkm_warga_emas, lhdn_form_b, perkeso_sksps, str_2026
from app.schema.manual_entry import DependantInput, ManualEntryPayload
from app.schema.profile import Dependant

# --- fixtures ------------------------------------------------------------


AISYAH_PAYLOAD_JSON = {
    "name": "Aisyah binti Ahmad",
    "date_of_birth": "1992-03-24",
    "ic_last4": "4321",
    "monthly_income_rm": 2800,
    "employment_type": "gig",
    "address": "No. 42, Jalan IM 7/10, Bandar Indera Mahkota, 25200 Kuantan, Pahang",
    "dependants": [
        {"relationship": "child", "age": 10},
        {"relationship": "child", "age": 7},
        {"relationship": "parent", "age": 70},
    ],
}


# A reference date that makes Aisyah 34 (matches the fixture).
# DOB 1992-03-24 + this reference → 34 years old.
_FIXED_TODAY = date(2026, 4, 21)


# --- _classify_income_band -------------------------------------------------


@pytest.mark.parametrize(
    "income,has_kids,expected",
    [
        (0.0, False, "b40_hardcore"),
        (1499.99, False, "b40_hardcore"),
        (1500.0, False, "b40_household"),
        (2500.0, False, "b40_household"),
        (2500.01, False, "b40_household"),  # RM2,500.01 — still in "2,501–5,000" bucket, no kids
        (2800.0, True, "b40_household_with_children"),
        (2800.0, False, "b40_household"),
        (5000.0, True, "b40_household_with_children"),
        (5000.01, True, "m40"),
        (10000.0, True, "m40"),
        (10000.01, True, "t20"),
    ],
)
def test_classify_income_band_matches_extract_prompt(
    income: float, has_kids: bool, expected: str
) -> None:
    assert _classify_income_band(income, has_kids) == expected


# --- derive_household_flags -----------------------------------------------


def test_derive_household_flags_matches_fixture_for_aisyah() -> None:
    dependants = [
        Dependant(relationship="child", age=10),
        Dependant(relationship="child", age=7),
        Dependant(relationship="parent", age=70),
    ]
    flags = derive_household_flags(2800.0, dependants)
    assert flags == AISYAH_PROFILE.household_flags


def test_derive_household_flags_child_18_is_not_under_18() -> None:
    # Age 18 is NOT "under 18" — the rule gate is strict <18.
    flags = derive_household_flags(3000.0, [Dependant(relationship="child", age=18)])
    assert flags.has_children_under_18 is False


def test_derive_household_flags_parent_under_60_is_not_elderly() -> None:
    flags = derive_household_flags(3000.0, [Dependant(relationship="parent", age=59)])
    assert flags.has_elderly_dependant is False


# --- _age_from_dob --------------------------------------------------------


def test_age_from_dob_before_birthday() -> None:
    # Birthday is 24 March; ref date 21 March → still 33.
    assert _age_from_dob(date(1992, 3, 24), today=date(2026, 3, 21)) == 33


def test_age_from_dob_on_birthday() -> None:
    assert _age_from_dob(date(1992, 3, 24), today=date(2026, 3, 24)) == 34


def test_age_from_dob_after_birthday() -> None:
    assert _age_from_dob(date(1992, 3, 24), today=_FIXED_TODAY) == 34


# --- build_profile_from_manual_entry round-trip ---------------------------


def test_aisyah_payload_builds_profile_equal_to_fixture() -> None:
    """The whole point of the feature — the built Profile must match AISYAH_PROFILE."""
    payload = ManualEntryPayload.model_validate(AISYAH_PAYLOAD_JSON)
    built = build_profile_from_manual_entry(payload, today=_FIXED_TODAY)
    assert built == AISYAH_PROFILE


def test_built_profile_drives_same_scheme_matches_as_fixture() -> None:
    """Feeding the built Profile into the rule engine produces the same matches."""
    payload = ManualEntryPayload.model_validate(AISYAH_PAYLOAD_JSON)
    built = build_profile_from_manual_entry(payload, today=_FIXED_TODAY)
    results = [
        str_2026.match(built),
        jkm_warga_emas.match(built),
        jkm_bkk.match(built),
        lhdn_form_b.match(built),
        i_saraan.match(built),
        perkeso_sksps.match(built),
    ]
    qualifying = [m for m in results if m.qualifies]
    # Same dual-key sort as `app.agents.tools.match.match_schemes` + the
    # Aisyah fixture: upside first (annual_rm desc), required_contribution last.
    qualifying.sort(key=lambda m: (m.kind != "upside", -m.annual_rm))
    assert qualifying == AISYAH_SCHEME_MATCHES


def test_salaried_employment_maps_to_form_be() -> None:
    payload = ManualEntryPayload.model_validate({**AISYAH_PAYLOAD_JSON, "employment_type": "salaried"})
    built = build_profile_from_manual_entry(payload, today=_FIXED_TODAY)
    assert built.form_type == "form_be"


def test_name_is_stripped_but_preserves_case() -> None:
    payload = ManualEntryPayload.model_validate({**AISYAH_PAYLOAD_JSON, "name": "  Aisyah binti Ahmad  "})
    built = build_profile_from_manual_entry(payload, today=_FIXED_TODAY)
    assert built.name == "Aisyah binti Ahmad"


def test_household_size_equals_one_plus_dependants() -> None:
    payload = ManualEntryPayload.model_validate({**AISYAH_PAYLOAD_JSON, "dependants": []})
    built = build_profile_from_manual_entry(payload, today=_FIXED_TODAY)
    assert built.household_size == 1


def test_adult_household_income_rolls_into_household_total_only() -> None:
    payload = ManualEntryPayload.model_validate(
        {
            **AISYAH_PAYLOAD_JSON,
            "monthly_income_rm": 8000,
            "dependants": [
                {"relationship": "spouse", "age": 34, "monthly_income_rm": 6000},
                {"relationship": "spouse", "age": 31, "monthly_income_rm": 0},
                {"relationship": "child", "age": 8},
                {"relationship": "child", "age": 6},
                {"relationship": "child", "age": 7},
                {"relationship": "child", "age": 5},
            ],
        }
    )
    built = build_profile_from_manual_entry(payload, today=_FIXED_TODAY)

    assert built.applicant_income_rm == 8000
    assert built.household_income_rm == 14000
    assert built.monthly_income_rm == 14000
    assert built.household_size == 7
    assert built.household_flags.income_band == "t20"

    # STR/JKM see household income; applicant-only schemes still see the filer.
    assert str_2026.match(built).qualifies is False
    assert jkm_bkk.match(built).qualifies is False
    lhdn_match = lhdn_form_b.match(built)
    assert lhdn_match.qualifies is True
    assert lhdn_match.annual_rm == lhdn_form_b.match(
        built.model_copy(update={"monthly_income_rm": 8000, "household_monthly_income_rm": 8000})
    ).annual_rm


def test_address_is_optional() -> None:
    body = {**AISYAH_PAYLOAD_JSON}
    del body["address"]
    payload = ManualEntryPayload.model_validate(body)
    built = build_profile_from_manual_entry(payload, today=_FIXED_TODAY)
    assert built.address is None


# --- ManualEntryPayload validation ---------------------------------------


def test_validation_rejects_empty_name() -> None:
    with pytest.raises(ValueError):
        ManualEntryPayload.model_validate({**AISYAH_PAYLOAD_JSON, "name": ""})


def test_validation_rejects_non_4_digit_ic_last4() -> None:
    with pytest.raises(ValueError):
        ManualEntryPayload.model_validate({**AISYAH_PAYLOAD_JSON, "ic_last4": "432"})


def test_validation_rejects_negative_income() -> None:
    with pytest.raises(ValueError):
        ManualEntryPayload.model_validate({**AISYAH_PAYLOAD_JSON, "monthly_income_rm": -1})


def test_validation_rejects_under_18_dependant_income() -> None:
    with pytest.raises(ValueError):
        ManualEntryPayload.model_validate(
            {
                **AISYAH_PAYLOAD_JSON,
                "dependants": [{"relationship": "child", "age": 17, "monthly_income_rm": 500}],
            }
        )


def test_validation_rejects_more_than_four_spouses() -> None:
    with pytest.raises(ValueError):
        ManualEntryPayload.model_validate(
            {
                **AISYAH_PAYLOAD_JSON,
                "dependants": [{"relationship": "spouse", "age": 30 + i} for i in range(5)],
            }
        )


def test_validation_rejects_unknown_employment_type() -> None:
    with pytest.raises(ValueError):
        ManualEntryPayload.model_validate({**AISYAH_PAYLOAD_JSON, "employment_type": "freelance"})


def test_validation_rejects_extra_fields() -> None:
    with pytest.raises(ValueError):
        ManualEntryPayload.model_validate({**AISYAH_PAYLOAD_JSON, "full_ic": "900324-06-4321"})


def test_validation_rejects_over_15_dependants() -> None:
    too_many = [{"relationship": "other", "age": 20}] * 16
    with pytest.raises(ValueError):
        ManualEntryPayload.model_validate({**AISYAH_PAYLOAD_JSON, "dependants": too_many})


def test_dependant_input_rejects_bad_relationship() -> None:
    with pytest.raises(ValueError):
        DependantInput.model_validate({"relationship": "cousin", "age": 20})


# --- /api/agent/intake_manual route --------------------------------------


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """TestClient with auth + Firestore fully stubbed.

    Two collections are mocked:
      - `users/{uid}` — the auth-layer lazy-upsert path, snapshot.exists=True.
      - `evaluations/{autoId}` — persistence. `.document()` with no argument
        (auto-id) returns a ref with `id="test-eval-id"`; `.set()` / `.update()`
        are callable but no-op.
    """
    monkeypatch.setenv("FIREBASE_ADMIN_KEY", json.dumps({"type": "service_account"}))
    monkeypatch.setattr(auth_module, "_init_firebase_admin", lambda: MagicMock())

    # users collection mock — default snapshot for lazy-upsert.
    # `_upsert_user_doc` reads `tier` from the snapshot to surface it on
    # `UserInfo`; explicit to_dict response keeps this deterministic.
    users_snapshot = MagicMock()
    users_snapshot.exists = True
    users_snapshot.to_dict.return_value = {"tier": "free"}
    users_doc = MagicMock()
    users_doc.get.return_value = users_snapshot

    # evaluations collection mock — document() with no arg returns an auto-id ref
    eval_ref = MagicMock()
    eval_ref.id = "test-eval-id"
    evaluations_collection = MagicMock()
    evaluations_collection.document.return_value = eval_ref

    users_collection = MagicMock()
    users_collection.document.return_value = users_doc

    def collection_side_effect(name: str) -> MagicMock:
        return evaluations_collection if name == "evaluations" else users_collection

    db = MagicMock()
    db.collection.side_effect = collection_side_effect
    monkeypatch.setattr(auth_module, "_get_firestore", lambda: db)

    verify = MagicMock(return_value={"uid": "test-uid", "email": "test@example.com"})
    monkeypatch.setattr(auth_module, "verify_firebase_id_token", verify)

    from app.main import app

    return TestClient(app)


def test_intake_manual_rejects_missing_auth(client: TestClient) -> None:
    resp = client.post("/api/agent/intake_manual", json=AISYAH_PAYLOAD_JSON)
    assert resp.status_code == 401


def test_intake_manual_rejects_malformed_body(client: TestClient) -> None:
    resp = client.post(
        "/api/agent/intake_manual",
        headers={"Authorization": "Bearer valid"},
        json={"name": "x"},  # missing every other required field
    )
    assert resp.status_code == 422


def test_intake_manual_accepts_aisyah_and_streams_sse(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The route returns a text/event-stream and starts emitting events.

    We stub classify/compute_upside/generate so the test doesn't hit Gemini
    or WeasyPrint — the route-layer contract is what we're asserting here.
    """
    from app.agents import root_agent as ra
    from app.schema.events import ComputeUpsideResult
    from app.schema.packet import Packet
    from app.schema.profile import HouseholdClassification

    async def _fake_classify(_profile: Any, **_kwargs: Any) -> Any:
        return HouseholdClassification(
            has_children_under_18=True,
            has_elderly_dependant=True,
            income_band="b40_household_with_children",
            per_capita_monthly_rm=700.0,
            notes=[],
        )

    async def _fake_compute_upside(matches: Any, **_kwargs: Any) -> Any:
        return ComputeUpsideResult(
            python_snippet="",
            stdout="",
            total_annual_rm=sum(m.annual_rm for m in matches),
            per_scheme_rm={m.scheme_id: m.annual_rm for m in matches},
        )

    async def _fake_generate(_profile: Any, _matches: Any, **_kwargs: Any) -> Packet:
        from datetime import datetime

        return Packet(drafts=[], generated_at=datetime(2026, 4, 21, 15, 0, 0))

    async def _fake_optimize(_profile: Any, _matches: Any, _classification: Any, **_kwargs: Any) -> list[Any]:
        # Optimizer fail-opens to [] when Gemini is unreachable; stub here so
        # the test doesn't depend on network availability OR a live API key.
        return []

    monkeypatch.setattr(ra, "classify_household", _fake_classify)
    monkeypatch.setattr(ra, "compute_upside", _fake_compute_upside)
    monkeypatch.setattr(ra, "generate_packet", _fake_generate)
    monkeypatch.setattr(ra, "optimize_strategy", _fake_optimize)

    with client.stream(
        "POST",
        "/api/agent/intake_manual",
        headers={"Authorization": "Bearer valid"},
        json=AISYAH_PAYLOAD_JSON,
    ) as resp:
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        events = [line for line in resp.iter_lines() if line.startswith("data:")]

    # Full healthy stream (Phase 11 Features 2 + 4): per step we now emit
    # step_started → step_result → narrative → technical, then a final done.
    # Feature 2 added the optimize_strategy step between match and
    # compute_upside, so 6 steps × 4 + 1 done = 25 events.
    assert len(events) == 25
    parsed = [json.loads(e[5:].strip()) for e in events]
    expected_per_step = ["step_started", "step_result", "narrative", "technical"]
    assert [p.get("type") for p in parsed] == expected_per_step * 6 + ["done"]
    extract_result = parsed[1]
    assert extract_result["step"] == "extract"
    assert extract_result["data"]["profile"]["name"] == "Aisyah binti Ahmad"
    assert extract_result["data"]["profile"]["household_flags"]["income_band"] == "b40_household_with_children"
    # Done event carries the evaluations/{evalId} doc ID so the frontend can
    # route to `/dashboard/evaluation/results/[id]`.
    done_event = parsed[-1]
    assert done_event["type"] == "done"
    assert done_event["eval_id"] == "test-eval-id"
    # No Gemini call was made on the extract step — the profile equals what
    # `build_profile_from_manual_entry` produced deterministically.
    assert extract_result["data"]["profile"]["form_type"] == "form_b"
    assert extract_result["data"]["profile"]["household_size"] == 4
    # PII-sanitisation contract: the technical layer must NEVER carry the
    # extracted profile's free-text name or address. Verifies the narration
    # helper module's redaction rules (Phase 11 Feature 4).
    extract_technical = parsed[3]
    assert extract_technical["type"] == "technical"
    assert extract_technical["step"] == "extract"
    technical_text = " ".join(extract_technical["log_lines"])
    assert "Aisyah" not in technical_text
    assert "Jalan IM" not in technical_text
    assert "***-**-4321" in technical_text  # masked ic_last4 present
    # Lay narration carries the rounded gross-pay as the data point.
    extract_narrative = parsed[2]
    assert extract_narrative["type"] == "narrative"
    assert extract_narrative["data_point"] == "RM 2,800"
