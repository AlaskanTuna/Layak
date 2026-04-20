"""`compute_upside` FunctionTool — stub for Phase 1 Task 3.

Task 3 (sprint start 21 Apr 08:00 MYT) replaces this with Gemini Code Execution
(`tools: [{codeExecution: {}}]`) running Python in a sandbox. Until then the stub
synthesises the same ComputeUpsideResult payload shape from the matched
`SchemeMatch` list so the frontend's stage-Python-on-screen panel has a
deterministic rendering target.

The stub emits a syntactically valid Python script and the stdout it would have
produced — frontend can render both verbatim inside a `<pre>` block.
"""

from __future__ import annotations

from app.schema.events import ComputeUpsideResult
from app.schema.scheme import SchemeMatch


def _python_snippet(matches: list[SchemeMatch]) -> str:
    parts: list[str] = [
        "# Layak — annual RM upside computation",
        "# Gemini Code Execution would run this in a sandbox under Gemini 2.5 Pro.",
        "",
    ]
    for m in matches:
        parts.append(f"{m.scheme_id} = {int(m.annual_rm)}  # {m.scheme_name}")
    parts.append("")
    parts.append(f"total = {' + '.join(m.scheme_id for m in matches) or '0'}")
    parts.extend(
        [
            "",
            'print("{:<42s}{:>12s}".format("Scheme", "Annual (RM)"))',
            'print("-" * 55)',
        ]
    )
    for m in matches:
        parts.append(f'print("{{:<42s}}{{:>12,}}".format({m.scheme_name!r}, {m.scheme_id}))')
    parts.extend(
        [
            'print("-" * 55)',
            'print("{:<42s}{:>12,}".format("Total upside (annual)", total))',
        ]
    )
    return "\n".join(parts)


def _stdout(matches: list[SchemeMatch], total: float) -> str:
    lines = [
        f"{'Scheme':<42s}{'Annual (RM)':>12s}",
        "-" * 55,
    ]
    for m in matches:
        lines.append(f"{m.scheme_name:<42s}{int(m.annual_rm):>12,}")
    lines.append("-" * 55)
    lines.append(f"{'Total upside (annual)':<42s}{int(total):>12,}")
    return "\n".join(lines)


async def compute_upside(matches: list[SchemeMatch]) -> ComputeUpsideResult:
    """Compute annual RM upside per scheme and the aggregate total.

    Args:
        matches: Qualifying `SchemeMatch` list from the `match` step.

    Returns:
        `ComputeUpsideResult` with a deterministic Python snippet, its stdout,
        the aggregate total, and the per-scheme dict the frontend ranked list
        reads for sorting/labelling.
    """
    per_scheme = {m.scheme_id: float(m.annual_rm) for m in matches}
    total = sum(per_scheme.values())
    return ComputeUpsideResult(
        python_snippet=_python_snippet(matches),
        stdout=_stdout(matches, total),
        total_annual_rm=total,
        per_scheme_rm=per_scheme,
    )
