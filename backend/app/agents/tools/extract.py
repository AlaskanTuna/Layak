"""`extract_profile` — Gemini 2.5 Flash multimodal.

Reads the three uploaded documents (IC, payslip / income proof, utility bill)
with Gemini 2.5 Flash and returns a validated `Profile`. Privacy invariant
(Phase 12): NO IC information is returned in the structured output. The
instruction explicitly forbids emitting the IC number — the model derives
`age` from the IC's YYMMDD prefix in its own working memory and returns only
the integer. The MyKad image bytes never persist past this request.
"""

from __future__ import annotations

from google.genai import types

from app.agents.gemini import FAST_MODEL, detect_mime, generate_with_retry, get_client, strip_json_fences
from app.schema.profile import Profile

_INSTRUCTION = """
You are the `extract_profile` agent for Layak — a Malaysian social-assistance
concierge. Three documents have been uploaded: an IC (MyKad), an income
statement, and a utility bill. Extract the citizen's profile into the JSON
schema provided.

Rules (enforce strictly):
- **Privacy**: do NOT emit the IC number anywhere in your response — not the
  full 12 digits, not a tail, not the place-of-birth code, nothing. Derive
  `age` from the IC's YYMMDD prefix in your own working memory and return
  only the integer.
- `name` is the citizen's full name as it appears on the IC, uppercased.
- `age` is derived from the IC prefix (`YYMMDD`) against today's date. If a
  date is ambiguous, prefer the older interpretation.
- `monthly_income_rm` is the gross monthly income in MYR from the income
  document — net payout for Grab / gig workers, basic pay for salaried.
  Return a bare number (e.g. `2800.0`). Never use currency symbols or thousand
  separators; `"RM2,800"` or `"2,800.00"` will fail validation.
- `household_size` includes the applicant. If the documents don't disclose
  household size, default to `1` and leave `dependants` empty.
- `dependants` lists each child / parent / spouse / sibling / grandparent / other in the
  household. Each entry contains EXACTLY these keys: `relationship` (one of
  child, parent, spouse, sibling, grandparent, other), `age` (integer). Do NOT include
  `name`, `gender`, `ic`, `occupation`, or any other field on a dependant —
  extra fields are silently dropped and just waste output tokens.
- `household_flags`:
  - `has_children_under_18`: true if any dependant has relationship `child`
    and age < 18.
  - `has_elderly_dependant`: true if any dependant has relationship `parent`
    and age >= 60.
  - `income_band`: one of
    `b40_hardcore` (monthly < RM1,500),
    `b40_household` (RM1,500 – RM2,500),
    `b40_household_with_children` (RM2,501 – RM5,000 with children under 18),
    `m40` (RM5,001 – RM10,000),
    `t20` (> RM10,000).
- `form_type`: `form_b` if the income document implies self-employment / gig
  work (Grab, e-wallet, i-Saraan, no EA Form); `form_be` if a regular salary
  slip from a named employer.
- `monthly_cost_rm`: number — total monthly electricity cost in MYR from the
  utility bill (TNB). Optional: omit or set to `null` if the total isn't
  legible. Return a bare number; no currency symbol.
- `monthly_kwh`: integer — total monthly electricity consumption in kWh from
  the utility bill (TNB). Optional: omit the field entirely or set it to
  `null` if the bill doesn't show consumption legibly. Never fabricate.

Respond with nothing but the JSON object — no preamble, no markdown fences,
no ```json tags, no commentary before or after.
""".strip()


async def extract_profile(ic_bytes: bytes, payslip_bytes: bytes, utility_bytes: bytes) -> Profile:
    """Extract a citizen profile from three uploaded documents via Gemini 2.5 Flash.

    Args:
        ic_bytes: raw bytes of the IC / MyKad document (PDF or image).
        payslip_bytes: raw bytes of the income document (payslip or Grab earnings).
        utility_bytes: raw bytes of the utility bill (TNB).

    Returns:
        Validated `Profile`. NO IC information is retained — only `age`.
    """
    client = get_client()
    # Default filename suffix = .pdf so detect_mime falls back to application/pdf
    # when magic bytes don't match — PDF is the most common upload in this flow.
    parts = [
        types.Part.from_bytes(data=ic_bytes, mime_type=detect_mime("ic.pdf", ic_bytes)),
        types.Part.from_bytes(data=payslip_bytes, mime_type=detect_mime("payslip.pdf", payslip_bytes)),
        types.Part.from_bytes(data=utility_bytes, mime_type=detect_mime("utility.pdf", utility_bytes)),
        types.Part.from_text(text=_INSTRUCTION),
    ]
    response = generate_with_retry(
        client,
        model=FAST_MODEL,
        contents=parts,
        # Gemini's response_schema dialect rejects `additional_properties` that
        # Pydantic's `extra="forbid"` emits, so we skip the server-side schema
        # and validate the returned JSON on the client side instead.
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0,
        ),
    )
    return Profile.model_validate_json(strip_json_fences(response.text))
