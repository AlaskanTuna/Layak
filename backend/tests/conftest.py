"""Shared pytest fixtures for the rule-engine tests."""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from pypdf import PdfReader

from app.fixtures.aisyah import AISYAH_PROFILE
from app.schema.profile import Profile

SCHEMES_DIR = Path(__file__).resolve().parent.parent / "data" / "schemes"

# Disable Phase 10 chat warm-up before any test imports `app.main`. Without
# this, the FastAPI lifespan would fire a real Gemini + Discovery Engine call
# on every TestClient construction — slow + needs live creds + breaks CI.
os.environ.setdefault("LAYAK_WARMUP_ENABLED", "false")


@pytest.fixture(scope="session")
def pdf_text() -> dict[str, dict[int, str]]:
    """Map every committed scheme PDF → {pypdf page index (1-based): extracted text}.

    Tests use this to assert specific RM thresholds + legal references appear on
    the cited page of the source PDF, enforcing the grounding invariant from
    docs/prd.md NFR-2.
    """
    cache: dict[str, dict[int, str]] = {}
    for path in sorted(SCHEMES_DIR.glob("*.pdf")):
        reader = PdfReader(path)
        cache[path.name] = {i + 1: (reader.pages[i].extract_text() or "") for i in range(len(reader.pages))}
    return cache


@pytest.fixture(scope="session")
def aisyah() -> Profile:
    """The locked Aisyah persona profile (docs/prd.md §3.1)."""
    return AISYAH_PROFILE
