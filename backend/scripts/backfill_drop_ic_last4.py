"""One-time backfill: strip the legacy `profile.ic_last4` field from evaluation docs.

`ic_last4` was removed from `Profile` in the Phase-12 privacy pivot (NO IC info on
the persisted profile), but evaluation docs written before that still carry it.
Because `Profile`/`EvaluationDoc` use `extra="forbid"`, reading those docs now
raises ValidationError → `GET /api/evaluations/{id}` returns 500. Removing the
stale field fixes the read AND deletes IC-tail data that shouldn't be stored.

Dry-run by default (read-only). Pass --execute to apply.

Usage:
    cd backend && python -m scripts.backfill_drop_ic_last4            # dry-run
    cd backend && python -m scripts.backfill_drop_ic_last4 --execute  # apply
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

# Standalone script (run outside uvicorn) — preload repo-root .env so
# FIREBASE_ADMIN_KEY is in os.environ before app.auth initialises Firebase.
_DOTENV = Path(__file__).resolve().parent.parent.parent / ".env"
if _DOTENV.is_file():
    for _line in _DOTENV.read_text(encoding="utf-8").splitlines():
        if _line.startswith("#") or "=" not in _line:
            continue
        _k, _v = _line.split("=", 1)
        os.environ.setdefault(_k.strip(), _v.strip())

from google.cloud.firestore_v1 import DELETE_FIELD  # noqa: E402

from app.auth import get_firestore  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Strip legacy profile.ic_last4 from evaluation docs.")
    parser.add_argument("--execute", action="store_true", help="Apply the deletes (default: dry-run).")
    args = parser.parse_args()

    db = get_firestore()
    affected: list[str] = []
    for snap in db.collection("evaluations").stream():
        data = snap.to_dict() or {}
        profile = data.get("profile")
        if isinstance(profile, dict) and "ic_last4" in profile:
            affected.append(snap.id)
            if args.execute:
                snap.reference.update({"profile.ic_last4": DELETE_FIELD})

    verb = "Stripped ic_last4 from" if args.execute else "Would strip ic_last4 from"
    print(f"{verb} {len(affected)} evaluation doc(s).")
    for doc_id in affected:
        print(f"  {doc_id}")
    if not args.execute and affected:
        print("\nDry-run only. Re-run with --execute to apply.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
