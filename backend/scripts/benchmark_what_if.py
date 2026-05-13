#!/usr/bin/env python
"""Local latency benchmark for what-if service implementations.

This script compares the Gemini-backed what-if service path with its
deterministic sibling directly, over the same Aisyah baseline profile, and
writes one CSV row per scenario/repeat/variant sample.

Typical usage from `backend/`:

    uv run python -m scripts.benchmark_what_if
    uv run python -m scripts.benchmark_what_if --repeats 5 --csv-out tmp/what_if.csv

The defaults match the service split at the time this script was added:
`run_what_if_legacy` for the Gemini-backed comparison path and
`run_what_if_deterministic` for the local path. If a configured callable is
absent, the script reports it as unavailable, benchmarks any available runner,
and still exports CSV rows. Use `--strict-runners` in CI or a comparison
session that must fail when either path is absent.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import importlib
import inspect
import json
import os
import statistics
import sys
from collections import Counter, defaultdict
from collections.abc import Awaitable, Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter_ns
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

GEMINI_RUNNER_DEFAULT = "app.services.what_if:run_what_if_legacy"
DETERMINISTIC_RUNNER_DEFAULT = "app.services.what_if:run_what_if_deterministic"


async def run_what_if_gemini_classify_only(
    *,
    baseline_profile,
    baseline_matches,
    overrides,
    language="en",
):
    """Benchmark helper: Gemini classification + deterministic match/delta, no strategy.

    This isolates the old slider-blocking classification cost from the much
    slower advisory generation path.
    """
    from app.agents.tools.classify import classify_household
    from app.agents.tools.match import match_schemes
    from app.schema.what_if import WhatIfResponse
    from app.services.vertex_ai_search import disable_vertex_ai_search
    from app.services.what_if import _round2, apply_overrides, compute_deltas

    scenario_profile = apply_overrides(baseline_profile, overrides)
    classification = await classify_household(scenario_profile, language=language)
    with disable_vertex_ai_search():
        matches = await match_schemes(scenario_profile, language=language)
    deltas = compute_deltas(baseline_matches, matches)
    total = _round2(
        sum(match.annual_rm for match in matches if match.qualifies and match.kind == "upside")
    )
    return WhatIfResponse(
        total_annual_rm=total,
        matches=matches,
        strategy=[],
        deltas=deltas,
        classification=classification,
        suggestions=[],
    )


CSV_OUT_DEFAULT = REPO_ROOT / "tmp" / "benchmarks" / "what-if" / "benchmark_what_if.csv"


def _load_dotenv() -> None:
    """Load repo-root `.env` so direct service imports mirror local backend runs."""
    env_path = Path(__file__).resolve().parent.parent.parent / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()


@dataclass(frozen=True)
class Scenario:
    name: str
    overrides: Mapping[str, int | float]


SCENARIO_MATRIX: tuple[Scenario, ...] = (
    Scenario("baseline_noop", {}),
    Scenario("income_downshift", {"monthly_income_rm": 1_800.0}),
    Scenario("income_upshift", {"monthly_income_rm": 8_000.0}),
    Scenario("children_increase", {"dependants_count": 4}),
    Scenario(
        "dependants_clear",
        {"dependants_count": 0, "elderly_dependants_count": 0},
    ),
    Scenario(
        "mixed_household",
        {
            "monthly_income_rm": 4_200.0,
            "dependants_count": 1,
            "elderly_dependants_count": 2,
        },
    ),
)


Runner = Callable[..., Awaitable[Any] | Any]


@dataclass(frozen=True)
class ResolvedRunner:
    variant: str
    spec: str
    function: Runner | None
    unavailable_reason: str | None = None

    @property
    def available(self) -> bool:
        return self.function is not None


@dataclass(frozen=True)
class BenchmarkSample:
    variant: str
    runner_spec: str
    scenario: str
    repeat: int
    duration_ms: float
    ok: bool
    total_annual_rm: float | None
    matches_count: int | None
    qualified_matches_count: int | None
    strategy_count: int | None
    deltas_count: int | None
    changed_deltas_count: int | None
    delta_status_counts: Mapping[str, int] | None
    error_type: str | None = None
    error_message: str | None = None

    def to_csv_row(self) -> dict[str, str | int | float]:
        return {
            "variant": self.variant,
            "runner_spec": self.runner_spec,
            "scenario": self.scenario,
            "repeat": self.repeat,
            "duration_ms": f"{self.duration_ms:.3f}",
            "ok": str(self.ok).lower(),
            "total_annual_rm": "" if self.total_annual_rm is None else f"{self.total_annual_rm:.2f}",
            "matches_count": "" if self.matches_count is None else self.matches_count,
            "qualified_matches_count": (
                "" if self.qualified_matches_count is None else self.qualified_matches_count
            ),
            "strategy_count": "" if self.strategy_count is None else self.strategy_count,
            "deltas_count": "" if self.deltas_count is None else self.deltas_count,
            "changed_deltas_count": (
                "" if self.changed_deltas_count is None else self.changed_deltas_count
            ),
            "delta_status_counts": (
                "" if self.delta_status_counts is None else json.dumps(self.delta_status_counts, sort_keys=True)
            ),
            "error_type": self.error_type or "",
            "error_message": self.error_message or "",
        }


CSV_FIELDNAMES: tuple[str, ...] = (
    "variant",
    "runner_spec",
    "scenario",
    "repeat",
    "duration_ms",
    "ok",
    "total_annual_rm",
    "matches_count",
    "qualified_matches_count",
    "strategy_count",
    "deltas_count",
    "changed_deltas_count",
    "delta_status_counts",
    "error_type",
    "error_message",
)


def resolve_runner(variant: str, spec: str) -> ResolvedRunner:
    """Import `module:attribute`, preserving failures for operator-facing output."""
    module_name, separator, attribute = spec.partition(":")
    if not separator or not module_name or not attribute:
        return ResolvedRunner(
            variant=variant,
            spec=spec,
            function=None,
            unavailable_reason="runner spec must be formatted as module:attribute",
        )
    try:
        module = importlib.import_module(module_name)
        function = getattr(module, attribute)
    except (ImportError, AttributeError) as exc:
        return ResolvedRunner(
            variant=variant,
            spec=spec,
            function=None,
            unavailable_reason=f"{type(exc).__name__}: {exc}",
        )
    if not callable(function):
        return ResolvedRunner(
            variant=variant,
            spec=spec,
            function=None,
            unavailable_reason=f"{spec} resolved to a non-callable object",
        )
    return ResolvedRunner(variant=variant, spec=spec, function=function)


async def _invoke_runner(
    runner: Runner,
    *,
    baseline_profile: Any,
    baseline_matches: Sequence[Any],
    overrides: Mapping[str, int | float],
    language: str,
) -> Any:
    response = runner(
        baseline_profile=baseline_profile,
        baseline_matches=list(baseline_matches),
        overrides=dict(overrides),
        language=language,
    )
    if inspect.isawaitable(response):
        return await response
    return response


def _response_counts(response: Any) -> dict[str, Any]:
    matches = list(getattr(response, "matches", ()) or ())
    strategy = list(getattr(response, "strategy", ()) or ())
    deltas = list(getattr(response, "deltas", ()) or ())
    statuses = Counter(str(getattr(delta, "status", "unknown")) for delta in deltas)
    changed = sum(count for status, count in statuses.items() if status != "unchanged")
    raw_total = getattr(response, "total_annual_rm", None)
    total = float(raw_total) if isinstance(raw_total, int | float) else None
    return {
        "total_annual_rm": total,
        "matches_count": len(matches),
        "qualified_matches_count": sum(bool(getattr(match, "qualifies", False)) for match in matches),
        "strategy_count": len(strategy),
        "deltas_count": len(deltas),
        "changed_deltas_count": changed,
        "delta_status_counts": dict(sorted(statuses.items())),
    }


async def collect_samples(
    *,
    runners: Sequence[ResolvedRunner],
    scenarios: Sequence[Scenario],
    repeats: int,
    baseline_profile: Any,
    baseline_matches: Sequence[Any],
    language: str,
) -> list[BenchmarkSample]:
    """Run available runners and keep failures as timing-bearing CSV samples."""
    samples: list[BenchmarkSample] = []
    for scenario in scenarios:
        for repeat in range(1, repeats + 1):
            for runner in runners:
                if runner.function is None:
                    continue
                started_ns = perf_counter_ns()
                try:
                    response = await _invoke_runner(
                        runner.function,
                        baseline_profile=baseline_profile,
                        baseline_matches=baseline_matches,
                        overrides=scenario.overrides,
                        language=language,
                    )
                except Exception as exc:  # noqa: BLE001 - benchmark records target failures.
                    elapsed_ms = (perf_counter_ns() - started_ns) / 1_000_000
                    samples.append(
                        BenchmarkSample(
                            variant=runner.variant,
                            runner_spec=runner.spec,
                            scenario=scenario.name,
                            repeat=repeat,
                            duration_ms=elapsed_ms,
                            ok=False,
                            total_annual_rm=None,
                            matches_count=None,
                            qualified_matches_count=None,
                            strategy_count=None,
                            deltas_count=None,
                            changed_deltas_count=None,
                            delta_status_counts=None,
                            error_type=type(exc).__name__,
                            error_message=str(exc),
                        )
                    )
                    continue
                elapsed_ms = (perf_counter_ns() - started_ns) / 1_000_000
                counts = _response_counts(response)
                samples.append(
                    BenchmarkSample(
                        variant=runner.variant,
                        runner_spec=runner.spec,
                        scenario=scenario.name,
                        repeat=repeat,
                        duration_ms=elapsed_ms,
                        ok=True,
                        **counts,
                    )
                )
    return samples


def write_csv(samples: Sequence[BenchmarkSample], csv_out: Path) -> None:
    csv_out.parent.mkdir(parents=True, exist_ok=True)
    with csv_out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(sample.to_csv_row() for sample in samples)


@dataclass(frozen=True)
class SampleSummary:
    variant: str
    scenario: str
    ok_count: int
    failed_count: int
    mean_ms: float | None
    median_ms: float | None
    min_ms: float | None
    max_ms: float | None


def summarize_samples(samples: Sequence[BenchmarkSample]) -> list[SampleSummary]:
    grouped: dict[tuple[str, str], list[BenchmarkSample]] = defaultdict(list)
    for sample in samples:
        grouped[(sample.variant, sample.scenario)].append(sample)

    summaries: list[SampleSummary] = []
    for variant, scenario in sorted(grouped):
        group = grouped[(variant, scenario)]
        durations = [sample.duration_ms for sample in group if sample.ok]
        summaries.append(
            SampleSummary(
                variant=variant,
                scenario=scenario,
                ok_count=len(durations),
                failed_count=len(group) - len(durations),
                mean_ms=statistics.fmean(durations) if durations else None,
                median_ms=statistics.median(durations) if durations else None,
                min_ms=min(durations) if durations else None,
                max_ms=max(durations) if durations else None,
            )
        )
    return summaries


def _fmt_ms(value: float | None) -> str:
    return "n/a" if value is None else f"{value:9.2f}"


def print_summary(
    *,
    runners: Sequence[ResolvedRunner],
    scenarios: Sequence[Scenario],
    repeats: int,
    language: str,
    samples: Sequence[BenchmarkSample],
    csv_out: Path,
) -> None:
    print(f"what-if benchmark: scenarios={len(scenarios)} repeats={repeats} language={language}")
    print("runners:")
    for runner in runners:
        if runner.available:
            print(f"  {runner.variant:<13} {runner.spec}")
        else:
            print(f"  {runner.variant:<13} unavailable ({runner.unavailable_reason})")
    print()
    print("variant       scenario                 ok fail    mean_ms  median_ms     min_ms     max_ms")
    print("------------- ------------------------ -- ---- ---------- ---------- ---------- ----------")
    summaries = summarize_samples(samples)
    for summary in summaries:
        print(
            f"{summary.variant:<13} {summary.scenario:<24} "
            f"{summary.ok_count:>2} {summary.failed_count:>4} "
            f"{_fmt_ms(summary.mean_ms)} {_fmt_ms(summary.median_ms)} "
            f"{_fmt_ms(summary.min_ms)} {_fmt_ms(summary.max_ms)}"
        )

    medians = {
        (summary.variant, summary.scenario): summary.median_ms
        for summary in summaries
        if summary.median_ms is not None
    }
    comparative_rows: list[tuple[str, float, float, float]] = []
    for scenario in scenarios:
        gemini_ms = medians.get(("gemini", scenario.name))
        deterministic_ms = medians.get(("deterministic", scenario.name))
        if gemini_ms is None or deterministic_ms is None or deterministic_ms <= 0:
            continue
        comparative_rows.append((scenario.name, gemini_ms, deterministic_ms, gemini_ms / deterministic_ms))

    print()
    if comparative_rows:
        print("median comparison: deterministic speedup vs gemini")
        print("scenario                   gemini_ms deterministic_ms speedup")
        print("-------------------------- ---------- ---------------- ----")
        for scenario_name, gemini_ms, deterministic_ms, speedup in comparative_rows:
            print(f"{scenario_name:<26} {gemini_ms:>10.2f} {deterministic_ms:>16.2f} {speedup:>6.2f}x")
    else:
        print("median comparison unavailable until both runners produce successful samples.")

    failures = [sample for sample in samples if not sample.ok]
    if failures:
        print()
        print(f"recorded failures: {len(failures)}")
        for failure in failures[:5]:
            print(
                f"  {failure.variant}/{failure.scenario}/repeat-{failure.repeat}: "
                f"{failure.error_type}: {failure.error_message}"
            )
        if len(failures) > 5:
            print(f"  ... {len(failures) - 5} additional failures in CSV")

    print()
    print(f"csv export: {csv_out}")


def _parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__.split("\n")[0] if __doc__ else "Benchmark what-if service paths."
    )
    parser.add_argument("--repeats", type=int, default=3, help="Samples per scenario and runner (default: 3).")
    parser.add_argument(
        "--language",
        choices=("en", "ms", "zh"),
        default="en",
        help="Language passed through to service runners (default: en).",
    )
    parser.add_argument(
        "--csv-out",
        type=Path,
        default=CSV_OUT_DEFAULT,
        help=f"CSV export path (default: {CSV_OUT_DEFAULT}).",
    )
    parser.add_argument(
        "--gemini-runner",
        default=GEMINI_RUNNER_DEFAULT,
        help=f"Current what-if runner as module:attribute (default: {GEMINI_RUNNER_DEFAULT}).",
    )
    parser.add_argument(
        "--deterministic-runner",
        default=DETERMINISTIC_RUNNER_DEFAULT,
        help=(
            "Deterministic what-if runner as module:attribute "
            f"(default: {DETERMINISTIC_RUNNER_DEFAULT})."
        ),
    )
    parser.add_argument(
        "--strict-runners",
        action="store_true",
        help="Exit non-zero before benchmarking when either configured runner is unavailable.",
    )
    args = parser.parse_args(argv)
    if args.repeats < 1:
        parser.error("--repeats must be >= 1")
    return args


async def _benchmark(args: argparse.Namespace) -> int:
    runners = (
        resolve_runner("gemini", args.gemini_runner),
        resolve_runner("deterministic", args.deterministic_runner),
    )
    unavailable = [runner for runner in runners if not runner.available]
    if args.strict_runners and unavailable:
        for runner in unavailable:
            print(f"{runner.variant} runner unavailable: {runner.unavailable_reason}", file=sys.stderr)
        return 2

    from app.fixtures.aisyah import AISYAH_PROFILE, AISYAH_SCHEME_MATCHES

    samples = await collect_samples(
        runners=runners,
        scenarios=SCENARIO_MATRIX,
        repeats=args.repeats,
        baseline_profile=AISYAH_PROFILE,
        baseline_matches=AISYAH_SCHEME_MATCHES,
        language=args.language,
    )
    write_csv(samples, args.csv_out)
    print_summary(
        runners=runners,
        scenarios=SCENARIO_MATRIX,
        repeats=args.repeats,
        language=args.language,
        samples=samples,
        csv_out=args.csv_out,
    )
    return 0 if samples else 2


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(argv)
    return asyncio.run(_benchmark(args))


if __name__ == "__main__":
    raise SystemExit(main())
