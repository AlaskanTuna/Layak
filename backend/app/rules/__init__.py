"""Rule engine modules for the locked scheme corpus.

Each module exposes a single `match(profile) -> SchemeMatch` entry point. Every
numeric threshold is sourced from a cached PDF under `backend/data/schemes/` and
pinned by a matching assertion in `backend/tests/` — except where the source
document is pending commit (noted in the rule module docstring).
"""

from app.rules import (
    bantuan_elektrik,
    bap,
    budi95,
    i_saraan,
    i_suri,
    jkm_bkk,
    jkm_warga_emas,
    lhdn_form_b,
    mykasih,
    mysalam,
    peka_b40,
    perkeso_sksps,
    rmt,
    sara,
    str_2026,
)

__all__ = [
    "bantuan_elektrik",
    "bap",
    "budi95",
    "i_saraan",
    "i_suri",
    "jkm_bkk",
    "jkm_warga_emas",
    "lhdn_form_b",
    "mykasih",
    "mysalam",
    "peka_b40",
    "perkeso_sksps",
    "rmt",
    "sara",
    "str_2026",
]
