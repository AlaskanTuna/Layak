#!/usr/bin/env python
"""Local benchmark for the Strategy and Compute bottleneck stages.

This intentionally does not benchmark Match/RAG. Setup builds the current
Aisyah matched-scheme fixture once, then the timed samples compare:

- existing Gemini-backed strategy optimizer
- deterministic strategy trigger filtering only
- existing Gemini Code Execution compute step
- deterministic local sum/table equivalent
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import os
import statistics
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from time import perf_counter_ns
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_ROOT.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _load_dotenv() -> None:
    env_path = REPO_ROOT / ".env"
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

CSV_OUT_DEFAULT = (
    REPO_ROOT
    / "tmp"
    / "benchmarks"
    / "strategy-compute"
    / date.today().isoformat()
    / "benchmark_strategy_compute.csv"
)


@dataclass(frozen=True)
class BenchmarkSample:
    variant: str
    repeat: int
    duration_ms: float
    ok: bool
    matched_scheme_count: int | None
    triggered_strategy_rule_count: int | None
    returned_strategy_count: int | None
    total_annual_rm: float | None
    error_type: str | None = None
    error_message: str | None = None

    def to_csv_row(self) -> dict[str, str | int | float]:
        return {
            "variant": self.variant,
            "repeat": self.repeat,
            "duration_ms": f"{self.duration_ms:.3f}",
            "ok": str(self.ok).lower(),
            "matched_scheme_count": "" if self.matched_scheme_count is None else self.matched_scheme_count,
            "triggered_strategy_rule_count": (
                ""
                if self.triggered_strategy_rule_count is None
                else self.triggered_strategy_rule_count
            ),
            "returned_strategy_count": (
                "" if self.returned_strategy_count is None else self.returned_strategy_count
            ),
            "total_annual_rm": "" if self.total_annual_rm is None else f"{self.total_annual_rm:.2f}",
            "error_type": self.error_type or "",
            "error_message": self.error_message or "",
        }


@dataclass(frozen=True)
class VariantSummary:
    variant: str
    ok_count: int
    failed_count: int
    min_ms: float | None
    p50_ms: float | None
    avg_ms: float | None
    p95_ms: float | None
    max_ms: float | None


CSV_FIELDNAMES = (
    "variant",
    "repeat",
    "duration_ms",
    "ok",
    "matched_scheme_count",
    "triggered_strategy_rule_count",
    "returned_strategy_count",
    "total_annual_rm",
    "error_type",
    "error_message",
)


def percentile(sorted_values: list[float], percentile_value: float) -> float | None:
    """Nearest-rank percentile over an already sorted list."""
    if not sorted_values:
        return None
    if percentile_value <= 0:
        return sorted_values[0]
    if percentile_value >= 100:
        return sorted_values[-1]
    rank = (percentile_value / 100) * (len(sorted_values) - 1)
    return sorted_values[min(round(rank), len(sorted_values) - 1)]


def summarize_samples(samples: list[BenchmarkSample]) -> list[VariantSummary]:
    variants = sorted({sample.variant for sample in samples})
    summaries: list[VariantSummary] = []
    for variant in variants:
        group = [sample for sample in samples if sample.variant == variant]
        durations = sorted(sample.duration_ms for sample in group if sample.ok)
        summaries.append(
            VariantSummary(
                variant=variant,
                ok_count=len(durations),
                failed_count=len(group) - len(durations),
                min_ms=durations[0] if durations else None,
                p50_ms=statistics.median(durations) if durations else None,
                avg_ms=statistics.fmean(durations) if durations else None,
                p95_ms=percentile(durations, 95),
                max_ms=durations[-1] if durations else None,
            )
        )
    return summaries


def write_csv(samples: list[BenchmarkSample], csv_out: Path) -> None:
    csv_out.parent.mkdir(parents=True, exist_ok=True)
    with csv_out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        for sample in samples:
            writer.writerow(sample.to_csv_row())


def _classification_for(profile: Any) -> Any:
    from app.schema.profile import HouseholdClassification

    flags = profile.household_flags
    return HouseholdClassification(
        has_children_under_18=flags.has_children_under_18,
        has_elderly_dependant=flags.has_elderly_dependant,
        income_band=flags.income_band,
        per_capita_monthly_rm=round(profile.monthly_income_rm / profile.household_size, 2),
        notes=[],
    )


def triggered_strategy_rules(profile: Any, matches: list[Any], classification: Any) -> list[Any]:
    from app.agents.tools.optimize_strategy import _rule_trips, load_scheme_interactions

    matched_ids = {match.scheme_id for match in matches if match.qualifies}
    triggered = [
        rule
        for rule in load_scheme_interactions()
        if _rule_trips(rule, profile=profile, classification=classification, matched_ids=matched_ids)
    ]
    return [rule for rule in triggered if any(sid in matched_ids for sid in rule.applies_to)]


async def _build_fixture(language: str) -> tuple[Any, list[Any], Any]:
    from app.agents.tools.match import match_schemes
    from app.fixtures.aisyah import AISYAH_PROFILE
    from app.services.vertex_ai_search import disable_vertex_ai_search

    with disable_vertex_ai_search():
        matches = await match_schemes(AISYAH_PROFILE, language=language)
    return AISYAH_PROFILE, matches, _classification_for(AISYAH_PROFILE)


async def _run_variant(
    variant: str,
    *,
    profile: Any,
    matches: list[Any],
    classification: Any,
    language: str,
) -> dict[str, Any]:
    if variant == "strategy_current":
        from app.agents.tools.optimize_strategy import optimize_strategy

        triggered_count = len(triggered_strategy_rules(profile, matches, classification))
        strategy = await optimize_strategy(profile, matches, classification, language=language)
        return {
            "triggered_strategy_rule_count": triggered_count,
            "returned_strategy_count": len(strategy),
            "total_annual_rm": None,
        }

    if variant == "strategy_trigger_filter_only":
        triggered = triggered_strategy_rules(profile, matches, classification)
        return {
            "triggered_strategy_rule_count": len(triggered),
            "returned_strategy_count": len(triggered[:3]),
            "total_annual_rm": None,
        }

    if variant == "compute_current":
        from app.agents.tools.compute_upside import compute_upside

        result = await compute_upside(matches, language=language)
        return {
            "triggered_strategy_rule_count": None,
            "returned_strategy_count": None,
            "total_annual_rm": result.total_annual_rm,
        }

    if variant == "compute_local_sum":
        upside_matches = [match for match in matches if match.kind == "upside"]
        total = sum(float(match.annual_rm) for match in upside_matches)
        return {
            "triggered_strategy_rule_count": None,
            "returned_strategy_count": None,
            "total_annual_rm": total,
        }

    raise ValueError(f"Unknown variant: {variant}")


async def collect_samples(*, repeats: int, language: str) -> list[BenchmarkSample]:
    profile, matches, classification = await _build_fixture(language)
    variants = (
        "strategy_current",
        "strategy_trigger_filter_only",
        "compute_current",
        "compute_local_sum",
    )
    samples: list[BenchmarkSample] = []
    for variant in variants:
        for repeat in range(1, repeats + 1):
            started = perf_counter_ns()
            try:
                result = await _run_variant(
                    variant,
                    profile=profile,
                    matches=matches,
                    classification=classification,
                    language=language,
                )
            except Exception as exc:  # noqa: BLE001 - benchmark rows should preserve failures.
                duration_ms = (perf_counter_ns() - started) / 1_000_000
                samples.append(
                    BenchmarkSample(
                        variant=variant,
                        repeat=repeat,
                        duration_ms=duration_ms,
                        ok=False,
                        matched_scheme_count=len(matches),
                        triggered_strategy_rule_count=None,
                        returned_strategy_count=None,
                        total_annual_rm=None,
                        error_type=type(exc).__name__,
                        error_message=str(exc),
                    )
                )
                continue

            duration_ms = (perf_counter_ns() - started) / 1_000_000
            samples.append(
                BenchmarkSample(
                    variant=variant,
                    repeat=repeat,
                    duration_ms=duration_ms,
                    ok=True,
                    matched_scheme_count=len(matches),
                    triggered_strategy_rule_count=result["triggered_strategy_rule_count"],
                    returned_strategy_count=result["returned_strategy_count"],
                    total_annual_rm=result["total_annual_rm"],
                )
            )
    return samples


def _format_ms(value: float | None) -> str:
    return "n/a" if value is None else f"{value:,.1f}"


def print_summary(samples: list[BenchmarkSample], csv_out: Path) -> None:
    print(f"CSV: {csv_out}")
    print("Variant summary:")
    for summary in summarize_samples(samples):
        print(
            "  "
            f"{summary.variant}: ok={summary.ok_count} fail={summary.failed_count} "
            f"min={_format_ms(summary.min_ms)}ms "
            f"p50={_format_ms(summary.p50_ms)}ms "
            f"avg={_format_ms(summary.avg_ms)}ms "
            f"p95={_format_ms(summary.p95_ms)}ms "
            f"max={_format_ms(summary.max_ms)}ms"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local Strategy/Compute latency benchmark.")
    parser.add_argument("--repeats", type=int, default=3, help="Samples per variant (default: 3).")
    parser.add_argument("--language", choices=("en", "ms", "zh"), default="en")
    parser.add_argument("--csv-out", type=Path, default=CSV_OUT_DEFAULT)
    return parser.parse_args()


async def main_async() -> None:
    args = parse_args()
    samples = await collect_samples(repeats=args.repeats, language=args.language)
    write_csv(samples, args.csv_out)
    print_summary(samples, args.csv_out)


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
