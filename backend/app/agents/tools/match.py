"""Stub `match_schemes` FunctionTool for Phase 1 Task 1.

Task 4 replaces this with a Pydantic rule engine covering STR 2026, JKM Warga Emas,
and five LHDN Form B reliefs, each citing a source PDF via Vertex AI Search (Task 3).
The stub returns the canned Aisyah matches so the SSE stream shape is stable and the
frontend can be developed against a fixed expected output.
"""

from __future__ import annotations

from app.fixtures.aisyah import AISYAH_SCHEME_MATCHES
from app.schema.profile import Profile
from app.schema.scheme import SchemeMatch


async def match_schemes(profile: Profile) -> list[SchemeMatch]:
    """Match a profile to eligible schemes with rule citations.

    Args:
        profile: Validated citizen profile from the extract step.

    Returns:
        A list of `SchemeMatch` objects, one per scheme the profile qualifies for.
        Each match carries at least one `RuleCitation` (grounding invariant NFR-2).
    """
    del profile
    return AISYAH_SCHEME_MATCHES
