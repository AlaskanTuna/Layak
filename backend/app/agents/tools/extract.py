"""Stub `extract_profile` FunctionTool for Phase 1 Task 1.

Task 3 replaces this with a Gemini 2.5 Flash multimodal call that reads the three
uploaded documents and returns a validated `Profile`. Until then the stub ignores
the inputs and returns the canned Aisyah profile so the pipeline is demo-able
end-to-end without any Gemini wiring.
"""

from __future__ import annotations

from app.fixtures.aisyah import AISYAH_PROFILE
from app.schema.profile import Profile


async def extract_profile(ic_bytes: bytes, payslip_bytes: bytes, utility_bytes: bytes) -> Profile:
    """Extract a citizen profile from three uploaded document blobs.

    Args:
        ic_bytes: Raw bytes of the uploaded MyKad IC (image or PDF).
        payslip_bytes: Raw bytes of the uploaded payslip or e-wallet income screenshot.
        utility_bytes: Raw bytes of the uploaded utility bill (image or PDF).

    Returns:
        Validated `Profile` with IC last-4 only (full IC never leaves this function).
    """
    del ic_bytes, payslip_bytes, utility_bytes
    return AISYAH_PROFILE
