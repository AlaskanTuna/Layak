"""Focused tests for the local what-if benchmark harness."""

from __future__ import annotations

import csv
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from scripts.benchmark_what_if import (
    BenchmarkSample,
    ResolvedRunner,
    Scenario,
    collect_samples,
    resolve_runner,
    summarize_samples,
    write_csv,
)


def _response() -> SimpleNamespace:
    return SimpleNamespace(
        total_annual_rm=1234.5,
        matches=[SimpleNamespace(qualifies=True), SimpleNamespace(qualifies=False)],
        strategy=[object()],
        deltas=[
            SimpleNamespace(status="unchanged"),
            SimpleNamespace(status="gained"),
            SimpleNamespace(status="amount_changed"),
        ],
    )


async def test_collect_samples_records_metrics_for_each_repeat() -> None:
    calls: list[dict[str, Any]] = []

    async def runner(**kwargs: Any) -> SimpleNamespace:
        calls.append(kwargs)
        return _response()

    samples = await collect_samples(
        runners=[ResolvedRunner("gemini", "test:runner", runner)],
        scenarios=[Scenario("income_downshift", {"monthly_income_rm": 1800.0})],
        repeats=2,
        baseline_profile=object(),
        baseline_matches=[object()],
        language="en",
    )

    assert len(samples) == 2
    assert len(calls) == 2
    assert calls[0]["overrides"] == {"monthly_income_rm": 1800.0}
    assert calls[0]["language"] == "en"
    assert all(sample.ok for sample in samples)
    assert samples[0].total_annual_rm == 1234.5
    assert samples[0].matches_count == 2
    assert samples[0].qualified_matches_count == 1
    assert samples[0].strategy_count == 1
    assert samples[0].deltas_count == 3
    assert samples[0].changed_deltas_count == 2
    assert samples[0].delta_status_counts == {
        "amount_changed": 1,
        "gained": 1,
        "unchanged": 1,
    }


async def test_collect_samples_keeps_runner_failures_as_rows() -> None:
    async def runner(**_kwargs: Any) -> None:
        raise RuntimeError("offline")

    samples = await collect_samples(
        runners=[ResolvedRunner("deterministic", "test:runner", runner)],
        scenarios=[Scenario("baseline_noop", {})],
        repeats=1,
        baseline_profile=object(),
        baseline_matches=[],
        language="ms",
    )

    assert len(samples) == 1
    assert samples[0].ok is False
    assert samples[0].error_type == "RuntimeError"
    assert samples[0].error_message == "offline"
    assert samples[0].matches_count is None


def test_write_csv_serializes_rows(tmp_path: Path) -> None:
    csv_out = tmp_path / "benchmark.csv"
    write_csv(
        [
            BenchmarkSample(
                variant="gemini",
                runner_spec="service:run",
                scenario="baseline_noop",
                repeat=1,
                duration_ms=12.3456,
                ok=True,
                total_annual_rm=77.0,
                matches_count=2,
                qualified_matches_count=2,
                strategy_count=1,
                deltas_count=1,
                changed_deltas_count=0,
                delta_status_counts={"unchanged": 1},
            )
        ],
        csv_out,
    )

    with csv_out.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))

    assert len(rows) == 1
    assert rows[0]["duration_ms"] == "12.346"
    assert rows[0]["ok"] == "true"
    assert rows[0]["total_annual_rm"] == "77.00"
    assert rows[0]["delta_status_counts"] == '{"unchanged": 1}'


def test_summarize_samples_counts_successes_and_failures() -> None:
    samples = [
        BenchmarkSample(
            variant="gemini",
            runner_spec="service:run",
            scenario="baseline_noop",
            repeat=1,
            duration_ms=10.0,
            ok=True,
            total_annual_rm=1.0,
            matches_count=0,
            qualified_matches_count=0,
            strategy_count=0,
            deltas_count=0,
            changed_deltas_count=0,
            delta_status_counts={},
        ),
        BenchmarkSample(
            variant="gemini",
            runner_spec="service:run",
            scenario="baseline_noop",
            repeat=2,
            duration_ms=30.0,
            ok=False,
            total_annual_rm=None,
            matches_count=None,
            qualified_matches_count=None,
            strategy_count=None,
            deltas_count=None,
            changed_deltas_count=None,
            delta_status_counts=None,
            error_type="RuntimeError",
            error_message="failed",
        ),
    ]

    summaries = summarize_samples(samples)

    assert len(summaries) == 1
    assert summaries[0].ok_count == 1
    assert summaries[0].failed_count == 1
    assert summaries[0].median_ms == 10.0


def test_resolve_runner_reports_missing_future_deterministic_callable() -> None:
    runner = resolve_runner("deterministic", "scripts.benchmark_what_if:missing_runner")

    assert runner.available is False
    assert runner.unavailable_reason is not None
    assert "AttributeError" in runner.unavailable_reason
