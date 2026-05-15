"""Focused tests for the Strategy/Compute benchmark helpers."""

from __future__ import annotations

import csv
from pathlib import Path

from scripts.benchmark_strategy_compute import (
    BenchmarkSample,
    percentile,
    summarize_samples,
    write_csv,
)


def _sample(variant: str, duration_ms: float, ok: bool = True) -> BenchmarkSample:
    return BenchmarkSample(
        variant=variant,
        repeat=1,
        duration_ms=duration_ms,
        ok=ok,
        matched_scheme_count=12 if ok else None,
        triggered_strategy_rule_count=3 if ok else None,
        returned_strategy_count=2 if ok else None,
        total_annual_rm=13808.0 if ok else None,
        error_type=None if ok else "RuntimeError",
        error_message=None if ok else "offline",
    )


def test_percentile_handles_empty_and_bounds() -> None:
    assert percentile([], 95) is None
    assert percentile([10.0, 20.0, 30.0], 0) == 10.0
    assert percentile([10.0, 20.0, 30.0], 100) == 30.0


def test_summarize_samples_reports_p50_p95_and_failures() -> None:
    samples = [
        _sample("compute_current", 10.0),
        _sample("compute_current", 20.0),
        _sample("compute_current", 30.0),
        _sample("compute_current", 40.0),
        _sample("compute_current", 50.0),
        _sample("compute_current", 5.0, ok=False),
    ]

    summary = summarize_samples(samples)[0]

    assert summary.variant == "compute_current"
    assert summary.ok_count == 5
    assert summary.failed_count == 1
    assert summary.min_ms == 10.0
    assert summary.p50_ms == 30.0
    assert summary.avg_ms == 30.0
    assert summary.p95_ms == 50.0
    assert summary.max_ms == 50.0


def test_write_csv_serializes_strategy_compute_rows(tmp_path: Path) -> None:
    csv_out = tmp_path / "strategy_compute.csv"
    write_csv([_sample("strategy_trigger_filter_only", 1.2345)], csv_out)

    with csv_out.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))

    assert len(rows) == 1
    assert rows[0]["variant"] == "strategy_trigger_filter_only"
    assert rows[0]["duration_ms"] == "1.234"
    assert rows[0]["ok"] == "true"
    assert rows[0]["matched_scheme_count"] == "12"
    assert rows[0]["triggered_strategy_rule_count"] == "3"
    assert rows[0]["returned_strategy_count"] == "2"
    assert rows[0]["total_annual_rm"] == "13808.00"
