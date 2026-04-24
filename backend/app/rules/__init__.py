"""Rule engine modules for the locked scheme corpus.

Each module exposes a single `match(profile) -> SchemeMatch` entry point. Every
numeric threshold is sourced from a cached PDF under `backend/data/schemes/` and
pinned by a matching assertion in `backend/tests/` — except where the source
document is pending commit (noted in the rule module docstring).
"""

from app.rules import i_saraan, jkm_bkk, jkm_warga_emas, lhdn_form_b, perkeso_sksps, str_2026

__all__ = ["i_saraan", "jkm_bkk", "jkm_warga_emas", "lhdn_form_b", "perkeso_sksps", "str_2026"]
