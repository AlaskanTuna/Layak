"""`compute_upside` — Gemini 2.5 Flash + code_execution tool (Task 3 Path 2).

Sends the rule-engine matches to Gemini with the Code Execution tool enabled.
Gemini writes a short Python script, runs it in a sandbox, and returns the
executable source + stdout. We parse both out of the response parts and
populate `ComputeUpsideResult` — the frontend pipeline step renders the
`<pre>`-block exactly as Gemini produced it.

Why Flash and not Pro: `gemini-2.5-pro` returns 429 RESOURCE_EXHAUSTED on the
free-tier API key we're demoing against. Flash supports the Code Execution
tool with identical payload shape and is safely under quota.
"""

from __future__ import annotations

import json

from google.genai import types

from app.agents.gemini import FAST_MODEL, get_client
from app.schema.events import ComputeUpsideResult
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
3. Prints a formatted table using `print("{{:<42s}}{{:>12s}}".format(...))`:

   - A header row: `Scheme` / `Annual (RM)`.
   - A separator row of 55 `-` characters.
   - One data row per scheme: the scheme's human-readable `scheme_name` on
     the left and its `annual_rm` right-aligned in 12 columns with thousands
     separators.
   - A separator row.
   - A final row: `Total upside (annual)` / formatted total.

Run the code via the code_execution tool. Return nothing but the tool-call
output — do not add commentary.
""".strip()


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


async def compute_upside(matches: list[SchemeMatch]) -> ComputeUpsideResult:
    """Compute annual RM upside via Gemini-run Python (code_execution tool).

    Phase 7 Task 9: `kind="required_contribution"` matches are skipped here —
    they represent money the user PAYS (e.g. PERKESO SKSPS mandatory
    contributions), not upside. Filtering before prompt construction keeps
    them out of the generated Python table; their `annual_rm` is already
    `0.0` so the final sum is unaffected either way, but omitting them from
    the stdout table avoids a misleading "PERKESO SKSPS ... 0" row.
    """
    upside_matches = [m for m in matches if m.kind == "upside"]
    per_scheme = {m.scheme_id: float(m.annual_rm) for m in upside_matches}
    total = sum(per_scheme.values())

    if not upside_matches:
        return ComputeUpsideResult(
            python_snippet="# No qualifying schemes — skipping computation.\n",
            stdout="No qualifying schemes.",
            total_annual_rm=0.0,
            per_scheme_rm={},
        )

    client = get_client()
    prompt = _INSTRUCTION.format(
        matches_json=json.dumps([m.model_dump() for m in upside_matches], default=str, indent=2)
    )
    response = client.models.generate_content(
        model=FAST_MODEL,
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
