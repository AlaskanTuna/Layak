#!/usr/bin/env python
"""Phase 12 Feature 7 — Day-1 seed for `verified_schemes/{scheme_id}`.

Layak's schemes-page stats strip renders a "Latest Update" tile derived
from `max(verified_at)` across the `verified_schemes` Firestore
collection. The wiring auto-refreshes whenever an admin approves a new
discovery candidate (Phase 11 Feature 1's `_finalize_approval` writes
`SERVER_TIMESTAMP`). But on a brand-new deployment, the collection is
empty — the locked schemes were hand-coded into the rule modules and
have never been through the admin moderation flow. Without a seed, the
tile renders "—" until the first admin approval.

This script idempotently upserts a `verifiedAt` per locked scheme so the
tile shows a real value day-one. Re-running is a no-op: existing docs
keep their existing `verifiedAt` (preserving any admin-approval
timestamps that have landed since).

Usage
-----

Dry-run (prints the plan, no Firestore writes)::

    python backend/scripts/seed_verified_schemes.py

Execute::

    python backend/scripts/seed_verified_schemes.py --execute

The script reads from `app.schema.scheme.SchemeId` so adding new locked
schemes to the Literal is the only thing required to extend coverage —
no list of names to update here.
"""

from __future__ import annotations

import argparse
import logging
import sys
from typing import get_args

from google.cloud.firestore_v1 import SERVER_TIMESTAMP

from app.auth import get_firestore
from app.schema.scheme import SchemeId

logger = logging.getLogger(__name__)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Opt in to real Firestore writes. Omit for a dry-run.",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Verbose logging.",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    scheme_ids: tuple[str, ...] = get_args(SchemeId)
    if not scheme_ids:
        logger.error("No SchemeId values found — refusing to seed an empty collection.")
        return 1

    logger.info("Planning seed for %d locked scheme(s): %s", len(scheme_ids), ", ".join(scheme_ids))

    if not args.execute:
        logger.info("Dry-run mode. Re-run with --execute to write.")
        return 0

    db = get_firestore()
    collection = db.collection("verified_schemes")

    created = 0
    skipped = 0
    for scheme_id in scheme_ids:
        doc_ref = collection.document(scheme_id)
        snapshot = doc_ref.get()
        if snapshot.exists:
            data = snapshot.to_dict() or {}
            if data.get("verifiedAt") is not None:
                logger.info("  · %s: existing verifiedAt — leaving in place", scheme_id)
                skipped += 1
                continue
        doc_ref.set(
            {
                "schemeId": scheme_id,
                "verifiedAt": SERVER_TIMESTAMP,
                # Phase 12 seed marker — distinguishes the day-1 stamp from
                # a real admin-discovery approval. The frontend doesn't read
                # this; it's an audit-trail field for operators.
                "seedSource": "phase12-day1-seed",
            },
            merge=True,
        )
        logger.info("  · %s: seeded with SERVER_TIMESTAMP", scheme_id)
        created += 1

    logger.info("Seed complete: %d created, %d skipped (already present).", created, skipped)
    return 0


if __name__ == "__main__":
    sys.exit(main())
