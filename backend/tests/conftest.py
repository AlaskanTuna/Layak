"""Shared pytest fixtures for the rule-engine tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from pypdf import PdfReader

from app.fixtures.aisyah import AISYAH_PROFILE
from app.schema.profile import Profile

SCHEMES_DIR = Path(__file__).resolve().parent.parent / "data" / "schemes"


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
