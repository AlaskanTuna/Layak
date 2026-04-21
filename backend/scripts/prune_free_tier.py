"""Nightly free-tier retention prune — Cloud Run Job entry point.

Contract: spec §3.9 / FR-18 — delete every `evaluations/{evalId}` whose owner
has `tier == "free"` AND `createdAt < now - 30 days`. Pro-tier evaluations are
never touched.

Runs daily at 02:00 MYT via Cloud Scheduler → Cloud Run Job. Deploy + schedule
recipe lives in `docs/runbook.md` §4.

Observability
-------------
A single structured-JSON line is emitted to stdout on every run. Cloud Run
Jobs forward stdout to Cloud Logging verbatim; a JSON payload automatically
populates the `jsonPayload` field so runs show up cleanly in the Logs Explorer.

    {"severity":"INFO","message":"prune_free_tier complete",
     "deletedEvaluations":42,"freeUsersChecked":17,
     "cutoffIso":"2026-03-22T18:00:00+00:00","retentionDays":30,"dryRun":false}

On failure the script logs an ERROR payload and exits non-zero so Cloud
Scheduler records the run as failed.

Authentication
--------------
Application Default Credentials via the Cloud Run Job's attached service
account. The service account needs `roles/datastore.user` (read + delete) on
the project. For local dry-runs: `gcloud auth application-default login`.

Safety invariants
-----------------
- Only `tier == "free"` users have their evals considered. Spec §3.3 makes the
  per-user `tier` field authoritative; a tier flip to Pro before the job runs
  spares that user's history on this run (next night the same rule applies).
- The cutoff is computed once at start-of-run. Users whose evals straddle the
  30-day boundary during a long run are evaluated against a consistent `now`.
- Evaluations without `userId` / `createdAt` are impossible under the backend
  contract (both are written by `create_running_evaluation`), so no defensive
  filter is added — surfacing a KeyError from a malformed doc is preferable to
  silently missing state.
- Batched deletes at 450 ops per commit — stays under Firestore's 500-op
  per-batch cap so a free user with hundreds of stale evals completes cleanly.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import UTC, datetime, timedelta
from typing import Any

_RETENTION_DAYS = 30
# Firestore batch.commit() caps at 500 ops. Mirror the `routes/user.py`
# cascade-delete choice so the leaner cap keeps headroom for SDK-internal ops.
_BATCH_MAX_OPS = 450


def prune_free_tier(
    db: Any,
    *,
    retention_days: int = _RETENTION_DAYS,
    now: datetime | None = None,
    delete: bool = True,
) -> dict[str, Any]:
    """Delete every free-tier evaluation older than `retention_days`.

    Args:
        db: Any object implementing the `google.cloud.firestore.Client`
            surface this function touches (`.collection`, `.batch`). Tests
            inject a `MagicMock`.
        retention_days: Cutoff in days. Defaults to 30.
        now: Anchor time for the cutoff. Defaults to `datetime.now(UTC)`;
            tests inject a fixed timestamp for determinism.
        delete: When False, count stale evaluations without issuing deletes.
            Used by `--dry-run`.

    Returns:
        Summary dict suitable for structured logging:
            deletedEvaluations: total count committed (or counted, when
                delete=False).
            freeUsersChecked: number of users iterated (tier == "free").
            cutoffIso: ISO-8601 UTC anchor — `now - retention_days`.
            retentionDays: the cutoff window in days.
    """
    if now is None:
        now = datetime.now(UTC)
    cutoff = now - timedelta(days=retention_days)

    deleted = 0
    users_checked = 0

    # `.select([])` returns name-only snapshots — we only need `user_snap.id`,
    # so skip fetching email / displayName / createdAt for every free user.
    free_users = db.collection("users").where("tier", "==", "free").select([]).stream()
    for user_snap in free_users:
        users_checked += 1
        uid = user_snap.id
        stale = (
            db.collection("evaluations")
            .where("userId", "==", uid)
            .where("createdAt", "<", cutoff)
            .stream()
        )
        batch = db.batch() if delete else None
        ops_in_batch = 0
        for eval_snap in stale:
            deleted += 1
            if not delete:
                continue
            batch.delete(eval_snap.reference)
            ops_in_batch += 1
            if ops_in_batch >= _BATCH_MAX_OPS:
                batch.commit()
                batch = db.batch()
                ops_in_batch = 0
        if delete and ops_in_batch > 0:
            batch.commit()

    return {
        "deletedEvaluations": deleted,
        "freeUsersChecked": users_checked,
        "cutoffIso": cutoff.isoformat(),
        "retentionDays": retention_days,
    }


def _build_firestore_client() -> Any:
    """Build a Firestore client via Application Default Credentials.

    The Cloud Run Job's attached service account supplies ADC automatically;
    `--set-env-vars=GOOGLE_CLOUD_PROJECT=...` on the Job pins the project so
    a local `gcloud auth application-default login` that defaults to a
    different quota project cannot accidentally drive production deletes.

    Outside Cloud Run (e.g. a dev dry-run) the env var is required — raising
    here beats silently hitting whichever project the ambient ADC resolves to.
    """
    from google.cloud import firestore as gcf

    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT")
    if not project:
        raise RuntimeError(
            "GOOGLE_CLOUD_PROJECT not set — refusing to run against an ambiguous "
            "ADC project. Set GOOGLE_CLOUD_PROJECT=<project-id> and rerun."
        )
    return gcf.Client(project=project)


def _log_json(payload: dict[str, Any]) -> None:
    """Emit one JSON line to stdout; Cloud Logging parses it into jsonPayload."""
    print(json.dumps(payload, ensure_ascii=False))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Delete free-tier evaluations older than 30 days.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--retention-days",
        type=int,
        default=_RETENTION_DAYS,
        help=f"Delete evaluations older than N days (default: {_RETENTION_DAYS}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Count stale evaluations without deleting them.",
    )
    args = parser.parse_args(argv)

    try:
        db = _build_firestore_client()
        summary = prune_free_tier(
            db,
            retention_days=args.retention_days,
            delete=not args.dry_run,
        )
    except Exception as exc:  # noqa: BLE001 — surface every failure to Cloud Logging
        _log_json(
            {
                "severity": "ERROR",
                "message": "prune_free_tier failed",
                "error": f"{type(exc).__name__}: {exc}",
            }
        )
        return 1

    _log_json(
        {
            "severity": "INFO",
            "message": "prune_free_tier complete",
            "dryRun": args.dry_run,
            **summary,
        }
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
