"""Rule engine modules for the three locked schemes (docs/plan.md Phase 1 Task 4).

Each module exposes a single `match(profile) -> SchemeMatch` entry point. Every
numeric threshold is sourced from a cached PDF under `backend/data/schemes/` and
pinned by a matching assertion in `backend/tests/`.
"""

from app.rules import jkm_warga_emas, lhdn_form_b, str_2026

__all__ = ["jkm_warga_emas", "lhdn_form_b", "str_2026"]
