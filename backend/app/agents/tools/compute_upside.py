"""`compute_upside` — Gemini 3 Flash Preview + code_execution tool (Phase 8 Task 4).

Sends the rule-engine matches to Gemini with the Code Execution tool enabled.
Gemini writes a short Python script, runs it in a sandbox, and returns the
executable source + stdout. We parse both out of the response parts and
populate `ComputeUpsideResult` — the frontend pipeline step renders the
`<pre>`-block exactly as Gemini produced it.

Phase 8 Task 4 cutover: this step now uses `HEAVY_MODEL` (gemini-3-flash-preview).
The previous `FAST_MODEL` (gemini-2.5-flash) workaround was driven by the
AI Studio Free-tier 429 cliff that the Phase 6 Vertex AI cutover already
solved; with Vertex billing flowing to the project's GCC, we can safely run
the more capable model here. The Phase 8 Task 1 probe
(`backend/scripts/probe_gemini_3_flash.py`, 2026-04-23) confirmed
`code_execution` works against gemini-3-flash-preview in the `global`
location. Fallback: switch the import to `HEAVY_MODEL_FALLBACK` (gemini-2.5-pro)
if the preview model is ever yanked.
"""

from __future__ import annotations

import json

from google.genai import types

from app.agents.gemini import (
    HEAVY_MODEL,
    LANGUAGE_INSTRUCTION_BLOCK,
    generate_with_retry,
    get_client,
)
from app.schema.events import ComputeUpsideResult
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.scheme import SchemeMatch

_INSTRUCTION = """
You are the `compute_upside` agent. Here is a JSON list of Malaysian
social-assistance schemes the user qualifies for, with a pre-computed
`annual_rm` value per scheme from Layak's rule engine:

{matches_json}

Write a short Python program that:
1. Assigns each scheme's `annual_rm` to a variable named after its
   `scheme_id` (e.g. `str_2026 = 450`).
2. Computes `total` as the sum of those variables.
3. Prints a formatted table using `print("{{:<54s}}{{:>12s}}".format(...))`:

   - A header row: left column `{header_scheme}`, right column `{header_annual}`.
   - A separator row of 66 `-` characters.
   - One data row per scheme: the scheme's human-readable `scheme_name` on
     the left and its `annual_rm` right-aligned in 12 columns with thousands
     separators.
   - A separator row.
   - A final row: left column `{total_label}`, right column the formatted total.

Python identifiers, `scheme_id` values, format specifiers, and numeric
output stay ASCII / English — they are code. Only the three printed
labels above ({header_scheme}, {header_annual}, {total_label}) carry the
user's language.

{language_instruction}

Run the code via the code_execution tool. Return nothing but the tool-call
output — do not add commentary.
""".strip()


# Per-language labels substituted into the compute_upside prompt. The
# values are UI copy ONLY; Python identifiers + `scheme_id` slugs + number
# formatting stay language-neutral ASCII so the code remains executable.
_COMPUTE_UPSIDE_LABELS: dict[str, dict[str, str]] = {
    "en": {
        "header_scheme": "Scheme",
        "header_annual": "Annual (RM)",
        "total_label": "Total upside (annual)",
    },
    "ms": {
        "header_scheme": "Skim",
        "header_annual": "Tahunan (RM)",
        "total_label": "Jumlah manfaat (tahunan)",
    },
    "zh": {
        "header_scheme": "计划",
        "header_annual": "年额 (RM)",
        "total_label": "年度总收益",
    },
}


def _extract_exec_parts(response: object) -> tuple[str, str]:
    """Pull `executable_code` source and `code_execution_result` output from the response."""
    python_snippet = ""
    stdout = ""
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", None) or []:
            code = getattr(part, "executable_code", None)
            if code is not None:
                code_src = getattr(code, "code", None)
                if code_src:
                    python_snippet = code_src
            result = getattr(part, "code_execution_result", None)
            if result is not None:
                out = getattr(result, "output", None)
                if out:
                    stdout = out
    return python_snippet, stdout


_EMPTY_STDOUT: dict[str, str] = {
    "en": "No qualifying schemes.",
    "ms": "Tiada skim yang layak.",
    "zh": "没有符合条件的计划。",
}


async def compute_upside(
    matches: list[SchemeMatch],
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> ComputeUpsideResult:
    """Compute annual RM upside via Gemini-run Python (code_execution tool).

    Phase 7 Task 9: `kind="required_contribution"` matches are skipped here —
    they represent money the user PAYS (e.g. PERKESO SKSPS mandatory
    contributions), not upside. Filtering before prompt construction keeps
    them out of the generated Python table; their `annual_rm` is already
    `0.0` so the final sum is unaffected either way, but omitting them from
    the stdout table avoids a misleading "PERKESO SKSPS ... 0" row.

    Phase 9: `language` swaps the printed header / total labels so the
    stdout table renders in the user's chosen language. Python identifiers
    and scheme_id slugs stay English (they're code).
    """
    upside_matches = [m for m in matches if m.kind == "upside"]
    per_scheme = {m.scheme_id: float(m.annual_rm) for m in upside_matches}
    total = sum(per_scheme.values())

    if not upside_matches:
        return ComputeUpsideResult(
            python_snippet="# No qualifying schemes — skipping computation.\n",
            stdout=_EMPTY_STDOUT[language],
            total_annual_rm=0.0,
            per_scheme_rm={},
        )

    client = get_client()
    labels = _COMPUTE_UPSIDE_LABELS[language]
    prompt = _INSTRUCTION.format(
        matches_json=json.dumps([m.model_dump() for m in upside_matches], default=str, indent=2),
        language_instruction=LANGUAGE_INSTRUCTION_BLOCK[language],
        **labels,
    )
    response = generate_with_retry(
        client,
        model=HEAVY_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[types.Tool(code_execution=types.ToolCodeExecution())],
            temperature=0.0,
        ),
    )
    python_snippet, stdout = _extract_exec_parts(response)

    return ComputeUpsideResult(
        python_snippet=python_snippet,
        stdout=stdout,
        total_annual_rm=total,
        per_scheme_rm=per_scheme,
    )
