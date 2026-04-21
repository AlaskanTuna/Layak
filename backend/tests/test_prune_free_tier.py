"""Tests for `scripts.prune_free_tier` — nightly free-tier retention job.

Firestore is mocked end-to-end; the script never imports `google.cloud` at
test time (the `_build_firestore_client` factory is only used by `main`, and
tests call `prune_free_tier` directly).

Covered invariants:
  - No free users → no-op summary, no Firestore writes.
  - Free user with mixed stale + fresh evals → only the stale ones deleted.
  - Pro users are never iterated (scope filter is `tier == "free"`).
  - Large eval counts commit multiple batches under the 450-op cap.
  - Dry-run counts without committing any batch.
  - `main()` exits 0 + emits an INFO JSON payload on success.
  - `main()` exits 1 + emits an ERROR JSON payload when Firestore raises.
  - The query chain is `where("userId","==",uid).where("createdAt","<",cutoff)`.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from scripts.prune_free_tier import main, prune_free_tier

_NOW = datetime(2026, 4, 22, 0, 0, 0, tzinfo=UTC)
_CUTOFF = _NOW - timedelta(days=30)


def _user_snap(uid: str) -> MagicMock:
    snap = MagicMock()
    snap.id = uid
    return snap


def _eval_snap(name: str) -> MagicMock:
    snap = MagicMock()
    snap.reference = MagicMock(name=name)
    return snap


def _wire_db(
    free_users: list[MagicMock],
    evals_by_uid: dict[str, list[MagicMock]],
) -> tuple[MagicMock, MagicMock, list[MagicMock]]:
    """Build a Firestore-like MagicMock wired so that:
       - `db.collection("users").where("tier","==","free").stream()` → free_users
       - `db.collection("evaluations").where("userId","==",uid).where("createdAt","<",cutoff)
          .stream()` → evals_by_uid[uid]
       - `db.batch()` returns a shared batch mock so tests can count ops.

    Returns `(db, batch, inner_wheres)` — `inner_wheres` collects every outer
    query returned by `evaluations.where(...)` so tests can assert the second
    `.where("createdAt","<",cutoff)` hop ran.
    """
    # `prune_free_tier` calls `users.where(...).select([]).stream()` — the
    # `.select` hop is a bandwidth optimisation (name-only snapshots).
    users_col = MagicMock()
    users_col.where.return_value.select.return_value.stream.return_value = iter(free_users)

    eval_col = MagicMock()
    inner_wheres: list[MagicMock] = []

    def eval_first_where(field: str, op: str, value: str) -> MagicMock:
        uid = value
        final = MagicMock()
        final.stream.return_value = iter(evals_by_uid.get(uid, []))
        outer = MagicMock()
        outer.where.return_value = final
        inner_wheres.append(outer)
        return outer

    eval_col.where.side_effect = eval_first_where

    db = MagicMock()
    db.collection.side_effect = lambda name: users_col if name == "users" else eval_col

    batch = MagicMock()
    db.batch.return_value = batch
    return db, batch, inner_wheres


# ============================================================================
# prune_free_tier — core logic
# ============================================================================


def test_no_free_users_is_noop() -> None:
    db, batch, _inner = _wire_db(free_users=[], evals_by_uid={})

    summary = prune_free_tier(db, now=_NOW)

    assert summary["deletedEvaluations"] == 0
    assert summary["freeUsersChecked"] == 0
    assert summary["cutoffIso"] == _CUTOFF.isoformat()
    assert summary["retentionDays"] == 30
    batch.delete.assert_not_called()
    batch.commit.assert_not_called()


def test_deletes_only_stale_evals_for_free_user() -> None:
    user_a = _user_snap("uid-a")
    stale = [_eval_snap("stale-1"), _eval_snap("stale-2"), _eval_snap("stale-3")]
    db, batch, _inner = _wire_db(free_users=[user_a], evals_by_uid={"uid-a": stale})

    summary = prune_free_tier(db, now=_NOW)

    assert summary["deletedEvaluations"] == 3
    assert summary["freeUsersChecked"] == 1
    assert batch.delete.call_count == 3
    assert batch.commit.call_count == 1


def test_iterates_every_free_user_independently() -> None:
    users = [_user_snap("uid-a"), _user_snap("uid-b"), _user_snap("uid-c")]
    evals = {
        "uid-a": [_eval_snap("a-1")],
        "uid-b": [],
        "uid-c": [_eval_snap("c-1"), _eval_snap("c-2")],
    }
    db, batch, _inner = _wire_db(free_users=users, evals_by_uid=evals)

    summary = prune_free_tier(db, now=_NOW)

    assert summary["deletedEvaluations"] == 3
    assert summary["freeUsersChecked"] == 3
    # user-b had no stale evals → batch for that user should not commit.
    # Two users with >=1 stale = 2 commits. user-b's batch has zero ops.
    assert batch.commit.call_count == 2


def test_query_chain_uses_correct_filters() -> None:
    """`prune_free_tier` must filter `users.tier=="free"` AND
    `evaluations.userId==uid AND createdAt<cutoff`. The query chain assertions
    are the contract — a change here would silently widen the blast radius.

    Also asserts the ORDER of the two `evaluations.where` hops (first on
    `userId`, then chained on `createdAt`). Reversing the order happens to
    return the same result set, but it changes the composite index used and
    would silently swap which filter rides the existing index.
    """
    user = _user_snap("uid-a")
    stale = [_eval_snap("s-1")]
    db, _batch, inner_wheres = _wire_db(free_users=[user], evals_by_uid={"uid-a": stale})

    prune_free_tier(db, now=_NOW)

    users_col = db.collection("users")
    users_col.where.assert_called_with("tier", "==", "free")

    eval_col = db.collection("evaluations")
    # First `where` hop is on userId; assert `eval_col.where` was called
    # exactly once with userId — a regression that swapped the filter order
    # would call it with ("createdAt","<",cutoff) first instead.
    assert eval_col.where.call_count == 1
    assert eval_col.where.call_args_list[0].args == ("userId", "==", "uid-a")
    # Second (chained) where is on createdAt, with `<` operator and the
    # cutoff exactly 30 days before `_NOW`.
    assert len(inner_wheres) == 1
    inner_wheres[0].where.assert_called_once_with("createdAt", "<", _CUTOFF)


def test_batches_commit_under_500_op_cap() -> None:
    """Free user with a huge backlog (e.g. after a Pro→free downgrade) must
    still complete — the loop commits every 450 ops and starts a fresh batch.
    """
    user = _user_snap("uid-heavy")
    many_stale = [_eval_snap(f"s-{i}") for i in range(1000)]
    db, _batch_unused, _inner = _wire_db(free_users=[user], evals_by_uid={"uid-heavy": many_stale})

    summary = prune_free_tier(db, now=_NOW)

    assert summary["deletedEvaluations"] == 1000
    # 1000 / 450 = 2 full mid-stream commits + 1 final commit = 3 total.
    # db.batch() is called once at start + once after each mid-stream commit = 3.
    assert db.batch.call_count == 3


def test_dry_run_counts_without_deleting() -> None:
    user = _user_snap("uid-a")
    stale = [_eval_snap("s-1"), _eval_snap("s-2")]
    db, batch, _inner = _wire_db(free_users=[user], evals_by_uid={"uid-a": stale})

    summary = prune_free_tier(db, now=_NOW, delete=False)

    assert summary["deletedEvaluations"] == 2
    # Dry-run: no batch constructed, no deletes, no commits.
    db.batch.assert_not_called()
    batch.delete.assert_not_called()
    batch.commit.assert_not_called()


def test_custom_retention_days_affects_cutoff() -> None:
    db, _batch, _inner = _wire_db(free_users=[], evals_by_uid={})

    summary = prune_free_tier(db, now=_NOW, retention_days=7)

    assert summary["retentionDays"] == 7
    assert summary["cutoffIso"] == (_NOW - timedelta(days=7)).isoformat()


def test_now_defaults_to_utcnow_when_omitted() -> None:
    """Regression: `now` must default to a UTC `datetime`, not a naive one —
    the cutoff is compared server-side against timezone-aware Firestore
    timestamps."""
    db, _batch, _inner = _wire_db(free_users=[], evals_by_uid={})

    summary = prune_free_tier(db)

    cutoff = datetime.fromisoformat(summary["cutoffIso"])
    assert cutoff.tzinfo is not None, "cutoff must be timezone-aware"


# ============================================================================
# main() — structured logging + exit codes
# ============================================================================


def test_main_logs_json_success_and_returns_zero(capsys: pytest.CaptureFixture[str]) -> None:
    user = _user_snap("uid-a")
    db, _batch, _inner = _wire_db(free_users=[user], evals_by_uid={"uid-a": [_eval_snap("s-1")]})

    with patch("scripts.prune_free_tier._build_firestore_client", return_value=db):
        exit_code = main([])

    assert exit_code == 0
    captured = capsys.readouterr()
    # Exactly one JSON line on stdout; parses clean.
    payload = json.loads(captured.out.strip())
    assert payload["severity"] == "INFO"
    assert payload["message"] == "prune_free_tier complete"
    assert payload["deletedEvaluations"] == 1
    assert payload["freeUsersChecked"] == 1
    assert payload["retentionDays"] == 30
    assert payload["dryRun"] is False


def test_main_dry_run_sets_flag_and_skips_deletes(capsys: pytest.CaptureFixture[str]) -> None:
    user = _user_snap("uid-a")
    db, batch, _inner = _wire_db(free_users=[user], evals_by_uid={"uid-a": [_eval_snap("s-1"), _eval_snap("s-2")]})

    with patch("scripts.prune_free_tier._build_firestore_client", return_value=db):
        exit_code = main(["--dry-run"])

    assert exit_code == 0
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["dryRun"] is True
    assert payload["deletedEvaluations"] == 2
    batch.delete.assert_not_called()


def test_main_logs_error_json_and_returns_one_on_failure(capsys: pytest.CaptureFixture[str]) -> None:
    """Firestore outage at job start must surface as non-zero exit + ERROR
    log line. Cloud Scheduler then shows the run as failed in its history
    panel."""
    bad_db = MagicMock()
    bad_db.collection.side_effect = RuntimeError("firestore unreachable")

    with patch("scripts.prune_free_tier._build_firestore_client", return_value=bad_db):
        exit_code = main([])

    assert exit_code == 1
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["severity"] == "ERROR"
    assert payload["message"] == "prune_free_tier failed"
    assert "firestore unreachable" in payload["error"]


def test_main_accepts_custom_retention_days_flag(capsys: pytest.CaptureFixture[str]) -> None:
    db, _batch, _inner = _wire_db(free_users=[], evals_by_uid={})

    with patch("scripts.prune_free_tier._build_firestore_client", return_value=db):
        exit_code = main(["--retention-days", "7"])

    assert exit_code == 0
    payload = json.loads(capsys.readouterr().out.strip())
    assert payload["retentionDays"] == 7


def test_build_firestore_client_refuses_to_run_without_project(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Dev dry-runs with neither `GOOGLE_CLOUD_PROJECT` nor `GCP_PROJECT` in
    the env must raise rather than hit whichever project the ambient ADC
    resolves to — a silent misfire against the wrong Firestore would delete
    user data across environments."""
    from scripts.prune_free_tier import _build_firestore_client

    monkeypatch.delenv("GOOGLE_CLOUD_PROJECT", raising=False)
    monkeypatch.delenv("GCP_PROJECT", raising=False)

    with pytest.raises(RuntimeError, match="GOOGLE_CLOUD_PROJECT not set"):
        _build_firestore_client()
