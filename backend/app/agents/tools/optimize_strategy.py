"""`optimize_strategy` — Cross-Scheme Strategy Optimizer (Phase 11 Feature 2).

Produces 0–3 grounded `StrategyAdvice` records from the user's profile +
matched schemes by:

1. **Trip filter** (deterministic Python): walk every rule in
   `scheme_interactions.yaml` and keep only those whose `trigger_conditions`
   actually match the user's profile/matches. This guarantees the model
   never sees an interaction rule that doesn't apply.
2. **Gemini structured-output call** (Gemini 2.5 Pro): emit a
   `list[StrategyAdvice]` JSON, one per surviving rule, with editorial
   `headline` + `rationale` and confidence self-report. Few-shot prompt
   (see `app.agents.optimizer_prompt`) anchors the shape.
3. **Schema validation**: every record must Pydantic-validate cleanly.
4. **Layer 1 (registry) validation**: drop any record whose
   `interaction_id` does not resolve to a YAML entry.
5. **Confidence floor**: drop records with `confidence < 0.5`. The
   frontend gates 0.5–0.8 separately (soft-suggestion copy).

Layer 3 (Vertex AI Search re-grounding of citation page refs) is deferred
to v1.1 per the plan.md amendment. v1 trusts the citation triple as
carried verbatim from the YAML rule.
"""

from __future__ import annotations

import json
import logging
import uuid
from pathlib import Path
from typing import Any

import yaml
from google.genai import types
from pydantic import ValidationError

from app.agents.gemini import (
    HEAVY_MODEL,
    generate_with_retry,
    get_client,
    strip_json_fences,
)
from app.agents.optimizer_prompt import FEW_SHOT_BLOCK
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.profile import HouseholdClassification, Profile
from app.schema.scheme import SchemeMatch
from app.schema.strategy import (
    SchemeInteractionRule,
    StrategyAdvice,
)

_logger = logging.getLogger(__name__)

_INTERACTIONS_YAML = Path(__file__).resolve().parent.parent.parent / "data" / "scheme_interactions.yaml"

_CONFIDENCE_FLOOR = 0.5


def load_scheme_interactions(path: Path | None = None) -> list[SchemeInteractionRule]:
    """Load + validate the YAML registry.

    Fail-loud on any malformed entry: the optimizer cannot reason about a
    rule whose shape is wrong, and silently dropping it would erode the
    Layer 1 grounding contract.
    """
    resolved = path or _INTERACTIONS_YAML
    if not resolved.is_file():
        raise RuntimeError(f"scheme_interactions.yaml missing at {resolved}")
    raw = yaml.safe_load(resolved.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise RuntimeError("scheme_interactions.yaml must be a YAML list")
    rules: list[SchemeInteractionRule] = []
    for idx, entry in enumerate(raw):
        try:
            rules.append(SchemeInteractionRule.model_validate(entry))
        except ValidationError as exc:
            raise RuntimeError(f"scheme_interactions.yaml entry #{idx} invalid: {exc}") from exc
    return rules


def _has_spouse(profile: Profile) -> bool:
    return any(d.relationship == "spouse" for d in profile.dependants)


def _rule_trips(
    rule: SchemeInteractionRule,
    *,
    profile: Profile,
    classification: HouseholdClassification,
    matched_ids: set[str],
) -> bool:
    """Evaluate a rule's `trigger_conditions` against the user's state.

    Conventions:
      - Missing condition keys default to True (no constraint).
      - `"unknown"` literal means "trip whenever the value isn't in profile",
        which for v1 we treat as always-trip (we err toward surfacing the
        advisory; the reviewer can edit the YAML to narrow if a real signal
        appears in `Profile`).
      - `matched_scheme: X` trips only when X is in the qualifying matches.
      - `max_monthly_income_rm: N` trips when applicant income <= N.
    """
    for key, expected in rule.trigger_conditions.items():
        if key == "has_elderly_dependant":
            if bool(expected) != classification.has_elderly_dependant:
                return False
        elif key == "has_children_under_18":
            if bool(expected) != classification.has_children_under_18:
                return False
        elif key == "form_type":
            if str(expected) != profile.form_type:
                return False
        elif key == "matched_scheme":
            if str(expected) not in matched_ids:
                return False
        elif key == "max_monthly_income_rm":
            if profile.applicant_income_rm > float(expected):  # type: ignore[arg-type]
                return False
        elif key == "filer_has_siblings_filing_taxes":
            # `unknown` → always trip; v1 has no profile signal for siblings,
            # so the optimizer leans toward surfacing the advisory and lets
            # Cik Lay walk the user through it on the chat handoff.
            if expected != "unknown" and bool(expected) is not True:
                return False
        elif key == "has_spouse_dependant":
            if expected == "unknown":
                continue  # always trip
            if bool(expected) != _has_spouse(profile):
                return False
        else:
            _logger.warning("optimize_strategy: unknown trigger_condition key=%s", key)
            return False
    return True


_INSTRUCTION = """\
You are the `optimize_strategy` agent. You produce cross-scheme advisories
for a Malaysian social-assistance evaluation.

You are given:
  - A user `Profile` snapshot (already redacted: no full IC, no address).
  - The user's qualifying `SchemeMatch` list.
  - A pre-filtered list of `triggered_rules` from
    `scheme_interactions.yaml` — ONLY rules whose trigger conditions
    actually match the user's state. You MUST produce exactly one
    StrategyAdvice per triggered rule (no more, no less). If
    `triggered_rules` is empty, respond with `[]`.

For each rule, emit a JSON record matching this shape:

  {{
    "advice_id": "<uuid4 hex>",
    "interaction_id": "<rule.id from the input>",
    "severity": "info"|"warn"|"act",   // copy from rule.severity
    "headline": str (<= 80 chars, action-oriented prose),
    "rationale": str (<= 280 chars, plain-language reason),
    "citation": {{"pdf": str, "section": str|null, "page": int|null}},
    "confidence": float in [0, 1],
    "suggested_chat_prompt": str|null,  // copy from rule.suggested_chat_prompt
    "applies_to_scheme_ids": [<one or more SchemeId from rule.applies_to>]
  }}

Hard rules:
  - The `interaction_id`, `severity`, and `citation` fields MUST be copied
    verbatim from the matched rule. Do NOT invent citations or change
    severity.
  - `applies_to_scheme_ids` must be the intersection of `rule.applies_to`
    and the user's matched schemes.
  - `headline` and `rationale` may paraphrase `rule.advice_template` for
    fluency but must NOT introduce numbers, thresholds, or eligibility
    claims that aren't in the rule's `rule` or `advice_template` fields.
  - `confidence` reflects how unambiguously the rule applies. Use 0.85+
    when the trip was deterministic and the advisory text is well-aligned
    with the user's situation; 0.5–0.8 when there's interpretive judgement
    needed; <0.5 will be suppressed downstream (the model should avoid
    emitting <0.5 records — drop them entirely instead).

Output:
  A JSON array of these records — no markdown fences, no commentary, no
  preamble. Empty array `[]` is valid.

{few_shot}

USER STATE
==========

Profile (redacted):
{profile_json}

Matched schemes (qualifying only):
{matches_json}

Triggered rules:
{triggered_json}
"""


def _redact_profile_for_prompt(profile: Profile) -> dict[str, Any]:
    """Strip name + address from the profile payload sent to Gemini.

    The optimizer reasons over numbers + flags, never free-text fields.
    Keeping the prompt blob tight also reduces token cost on Gemini 2.5 Pro.
    """
    data = profile.model_dump(mode="json")
    data.pop("name", None)
    data.pop("address", None)
    return data


def _validate_and_filter(
    raw_records: list[Any],
    *,
    triggered_ids: set[str],
) -> list[StrategyAdvice]:
    """Schema + registry validation. Drops any record that doesn't fit."""
    survivors: list[StrategyAdvice] = []
    for record in raw_records:
        if not isinstance(record, dict):
            continue
        # Layer 2 — Pydantic schema validation.
        try:
            advice = StrategyAdvice.model_validate(record)
        except ValidationError:
            _logger.warning("optimize_strategy dropped record (schema): %s", record)
            continue
        # Layer 1 — registry membership.
        if advice.interaction_id not in triggered_ids:
            _logger.warning(
                "optimize_strategy dropped record (interaction_id=%s not in triggered set)",
                advice.interaction_id,
            )
            continue
        # Layer 5 floor (frontend handles 0.5–0.8 separately).
        if advice.confidence < _CONFIDENCE_FLOOR:
            continue
        survivors.append(advice)
    return survivors[:3]  # spec §3.7 caps at 3 cards


async def optimize_strategy(
    profile: Profile,
    matches: list[SchemeMatch],
    classification: HouseholdClassification,
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
    interactions: list[SchemeInteractionRule] | None = None,
) -> list[StrategyAdvice]:
    """End-to-end optimizer. Returns 0–3 grounded advisories.

    `language` is accepted for parity with sibling tools but the optimizer
    output is editorial English in v1 — translation lands in Task 12 if
    the demo needs it. Most strategy text is intentionally short and the
    chat handoff converts to the user's language on the next Cik Lay
    turn anyway.
    """
    _ = language  # reserved for v1.1 translation pass.
    rules = interactions if interactions is not None else load_scheme_interactions()
    matched_ids = {m.scheme_id for m in matches if m.qualifies}

    triggered = [r for r in rules if _rule_trips(r, profile=profile, classification=classification, matched_ids=matched_ids)]
    # Intersect rule.applies_to with the user's matches; drop rules that
    # apply to none of the matched schemes (the advisory would be
    # actionless).
    triggered = [r for r in triggered if any(sid in matched_ids for sid in r.applies_to)]
    if not triggered:
        return []

    triggered_payload = [
        {
            "id": r.id,
            "applies_to": r.applies_to,
            "rule": r.rule.strip(),
            "advice_template": r.advice_template.strip(),
            "severity": r.severity,
            "citation": r.citation.model_dump(mode="json"),
            "suggested_chat_prompt": (r.suggested_chat_prompt or "").strip() or None,
        }
        for r in triggered
    ]

    prompt = _INSTRUCTION.format(
        few_shot=FEW_SHOT_BLOCK,
        profile_json=json.dumps(_redact_profile_for_prompt(profile), indent=2),
        matches_json=json.dumps(
            [{"scheme_id": m.scheme_id, "scheme_name": m.scheme_name, "annual_rm": m.annual_rm} for m in matches if m.qualifies],
            indent=2,
        ),
        triggered_json=json.dumps(triggered_payload, indent=2),
    )

    client = get_client()
    try:
        response = generate_with_retry(
            client,
            model=HEAVY_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
    except Exception:  # noqa: BLE001 — fail-open per module contract.
        _logger.exception("optimize_strategy Gemini call failed")
        return []

    try:
        raw = json.loads(strip_json_fences(response.text))
    except (ValueError, AttributeError):
        _logger.warning("optimize_strategy: non-JSON response")
        return []

    if not isinstance(raw, list):
        _logger.warning("optimize_strategy: response not a JSON list")
        return []

    # Patch missing advice_ids with uuid4 — the model is asked to emit them
    # but we don't want a missing field to drop an otherwise-valid record.
    for record in raw:
        if isinstance(record, dict) and not record.get("advice_id"):
            record["advice_id"] = uuid.uuid4().hex

    return _validate_and_filter(raw, triggered_ids={r.id for r in triggered})
