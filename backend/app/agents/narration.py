"""Per-step narration for the two-tier reasoning surface (Phase 11 Feature 4).

Two pure functions per pipeline step:

  - `narrate_<step>_lay(...)`       → PipelineNarrativeEvent (Tier 1)
  - `narrate_<step>_technical(...)` → PipelineTechnicalEvent (Tier 2)

The lay tier is editorial — one ≤ 80-char headline (action-oriented, no
jargon, no scheme IDs) plus an optional ≤ 40-char data point (the single
most useful number for the step). The technical tier is developer-grade —
1-N preformatted log lines including timestamps, model latencies, Vertex
hit scores, and Code Execution stdout.

PII contract (Phase 12):
  - `Profile` carries NO IC information of any kind, so the technical log
    can't accidentally surface it. Removed the `_mask_ic_last6` helper and
    the `ic=` log line in `narrate_extract_technical`.
  - Technical lines NEVER include raw uploaded-doc bytes/base64.
  - Profile free-text fields (`name`, `address`) MUST be redacted or
    omitted.

Localisation:
  - Tier 1 lay headlines + data points ship in the user's `language`. v1
    ships English; ms/zh land in Task 12 (the i18n sweep).
  - Tier 2 technical transcripts always stay English (developer audience).
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.schema.events import (
    ComputeUpsideResult,
    PipelineNarrativeEvent,
    PipelineTechnicalEvent,
    Step,
)
from app.schema.locale import SupportedLanguage
from app.schema.packet import Packet
from app.schema.profile import HouseholdClassification, Profile
from app.schema.scheme import SchemeMatch
from app.schema.strategy import StrategyAdvice


def _now_iso() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def _format_rm(value: float) -> str:
    """`RM 3,800` — no decimals, comma-grouped. Used in both tiers."""
    return f"RM {value:,.0f}"


# ---------------------------------------------------------------------------
# Lay tier catalogue (Tier 1)
# ---------------------------------------------------------------------------

# headline + data_point per (step, language). Headlines stay ≤ 80 chars,
# data points ≤ 40 chars — Pydantic enforces both on construction.

_HEADLINES: dict[tuple[Step, SupportedLanguage], str] = {
    ("extract", "en"): "Read your documents",
    ("extract", "ms"): "Membaca dokumen anda",
    ("extract", "zh"): "已读取您的文件",
    ("classify", "en"): "Worked out your household band",
    ("classify", "ms"): "Menentukan kategori isi rumah anda",
    ("classify", "zh"): "已判断您家庭的收入分层",
    ("match", "en"): "Matched against the federal scheme library",
    ("match", "ms"): "Memadankan dengan perpustakaan skim persekutuan",
    ("match", "zh"): "已对联邦计划库进行匹配",
    ("optimize_strategy", "en"): "Looked for cross-scheme strategy notes",
    ("optimize_strategy", "ms"): "Mencari nota strategi merentas skim",
    ("optimize_strategy", "zh"): "已查找跨计划策略提示",
    ("compute_upside", "en"): "Calculated your annual upside",
    ("compute_upside", "ms"): "Mengira nilai tahunan anda",
    ("compute_upside", "zh"): "已计算您的年度收益",
    ("generate", "en"): "Drafted application packets",
    ("generate", "ms"): "Menyediakan pakej draf permohonan",
    ("generate", "zh"): "已生成申请包草稿",
}


def _headline(step: Step, language: SupportedLanguage) -> str:
    return _HEADLINES.get((step, language), _HEADLINES[(step, "en")])


# ---------------------------------------------------------------------------
# extract step
# ---------------------------------------------------------------------------


def narrate_extract_lay(profile: Profile, *, language: SupportedLanguage) -> PipelineNarrativeEvent:
    """Lay narration after the extract step.

    Data point surfaces gross pay (rounded RM) as the single most useful
    number from the extracted profile.
    """
    return PipelineNarrativeEvent(
        step="extract",
        headline=_headline("extract", language),
        data_point=_format_rm(profile.monthly_income_rm),
    )


def narrate_extract_technical(
    profile: Profile,
    *,
    mime_types: dict[str, str] | None = None,
    latency_ms: int | None = None,
) -> PipelineTechnicalEvent:
    """Developer transcript after the extract step.

    Includes MIME types per uploaded slot, latency, masked IC, household
    composition counts. Never includes raw doc bytes or full IC.
    """
    lines: list[str] = ["tool=extract_profile"]
    if mime_types:
        lines.append("  uploads=" + " ".join(f"{slot}:{mime}" for slot, mime in mime_types.items()))
    lines.append(f"  monthly_income_rm={profile.monthly_income_rm}")
    lines.append(f"  household_size={profile.household_size}")
    lines.append(f"  dependants={len(profile.dependants)}")
    lines.append(f"  form_type={profile.form_type}")
    if latency_ms is not None:
        lines.append(f"  latency_ms={latency_ms}")
    return PipelineTechnicalEvent(step="extract", timestamp=_now_iso(), log_lines=lines)


# ---------------------------------------------------------------------------
# classify step
# ---------------------------------------------------------------------------


def narrate_classify_lay(
    classification: HouseholdClassification,
    *,
    language: SupportedLanguage,
) -> PipelineNarrativeEvent:
    return PipelineNarrativeEvent(
        step="classify",
        headline=_headline("classify", language),
        data_point=classification.income_band,
    )


def narrate_classify_technical(
    classification: HouseholdClassification,
    *,
    latency_ms: int | None = None,
) -> PipelineTechnicalEvent:
    lines: list[str] = ["tool=classify_household"]
    lines.append(f"  income_band={classification.income_band}")
    lines.append(f"  per_capita_monthly_rm={classification.per_capita_monthly_rm}")
    lines.append(f"  has_children_under_18={classification.has_children_under_18}")
    lines.append(f"  has_elderly_dependant={classification.has_elderly_dependant}")
    lines.append(f"  notes_count={len(classification.notes)}")
    if latency_ms is not None:
        lines.append(f"  latency_ms={latency_ms}")
    return PipelineTechnicalEvent(step="classify", timestamp=_now_iso(), log_lines=lines)


# ---------------------------------------------------------------------------
# match step
# ---------------------------------------------------------------------------


def narrate_match_lay(
    matches: list[SchemeMatch],
    *,
    language: SupportedLanguage,
) -> PipelineNarrativeEvent:
    qualifying = sum(1 for m in matches if m.qualifies)
    data_point_en = f"{qualifying} qualifying"
    data_point_ms = f"{qualifying} layak"
    data_point_zh = f"{qualifying} 项合格"
    data_point = {
        "en": data_point_en,
        "ms": data_point_ms,
        "zh": data_point_zh,
    }[language]
    return PipelineNarrativeEvent(
        step="match",
        headline=_headline("match", language),
        data_point=data_point,
    )


def narrate_match_technical(
    matches: list[SchemeMatch],
    *,
    latency_ms: int | None = None,
) -> PipelineTechnicalEvent:
    lines: list[str] = ["tool=match_schemes"]
    lines.append(f"  rules_evaluated=6  qualifying={sum(1 for m in matches if m.qualifies)}")
    for m in matches:
        marker = "✓" if m.qualifies else "·"
        rm_part = f" rm={m.annual_rm:.0f}" if m.qualifies else ""
        citation_part = ""
        for cite in m.rule_citations[:1]:
            # Surface the source PDF + page so reviewers can trace the
            # match; relevance score isn't on RuleCitation directly, but
            # the per-rule modules push the Vertex passage hash into
            # `passage` — we trim to 40 chars to keep the line readable.
            citation_part = f" cite={cite.source_pdf}:{cite.page_ref}"
        lines.append(f"  {marker} {m.scheme_id}{rm_part}{citation_part}")
    if latency_ms is not None:
        lines.append(f"  latency_ms={latency_ms}")
    return PipelineTechnicalEvent(step="match", timestamp=_now_iso(), log_lines=lines)


# ---------------------------------------------------------------------------
# compute_upside step
# ---------------------------------------------------------------------------


def narrate_compute_upside_lay(
    upside: ComputeUpsideResult,
    *,
    language: SupportedLanguage,
) -> PipelineNarrativeEvent:
    return PipelineNarrativeEvent(
        step="compute_upside",
        headline=_headline("compute_upside", language),
        data_point=_format_rm(upside.total_annual_rm),
    )


def narrate_compute_upside_technical(
    upside: ComputeUpsideResult,
    *,
    latency_ms: int | None = None,
) -> PipelineTechnicalEvent:
    lines: list[str] = ["tool=compute_upside (Gemini code_execution)"]
    snippet_chars = len(upside.python_snippet or "")
    stdout_chars = len(upside.stdout or "")
    lines.append(f"  total_annual_rm={upside.total_annual_rm:.2f}")
    lines.append(f"  python_snippet_chars={snippet_chars}  stdout_chars={stdout_chars}")
    per_scheme = ", ".join(f"{k}={v:.0f}" for k, v in upside.per_scheme_rm.items())
    if per_scheme:
        lines.append(f"  per_scheme=[{per_scheme}]")
    # First non-empty stdout line as evidence the executor ran. Trimmed
    # to 80 chars so technical-tier rendering doesn't wrap weirdly.
    if upside.stdout:
        first = next((ln for ln in upside.stdout.splitlines() if ln.strip()), "")
        if first:
            lines.append(f"  stdout[0]={first[:80]}")
    if latency_ms is not None:
        lines.append(f"  latency_ms={latency_ms}")
    return PipelineTechnicalEvent(step="compute_upside", timestamp=_now_iso(), log_lines=lines)


# ---------------------------------------------------------------------------
# generate step
# ---------------------------------------------------------------------------


def narrate_generate_lay(
    packet: Packet,
    *,
    language: SupportedLanguage,
) -> PipelineNarrativeEvent:
    n = len(packet.drafts)
    data_point = {
        "en": f"{n} ready",
        "ms": f"{n} sedia",
        "zh": f"{n} 份已就绪",
    }[language]
    return PipelineNarrativeEvent(
        step="generate",
        headline=_headline("generate", language),
        data_point=data_point,
    )


def narrate_generate_technical(
    packet: Packet,
    *,
    latency_ms: int | None = None,
) -> PipelineTechnicalEvent:
    lines: list[str] = ["tool=generate_packet (WeasyPrint + Jinja)"]
    lines.append(f"  drafts={len(packet.drafts)}")
    for d in packet.drafts:
        # base64 inflation factor is ~4/3; estimate the source PDF size.
        bytes_estimated = int(len(d.blob_bytes_b64) * 3 / 4) if d.blob_bytes_b64 else 0
        kb = bytes_estimated / 1024
        lines.append(f"  · {d.scheme_id} {kb:.1f}KB")
    if latency_ms is not None:
        lines.append(f"  latency_ms={latency_ms}")
    return PipelineTechnicalEvent(step="generate", timestamp=_now_iso(), log_lines=lines)


# ---------------------------------------------------------------------------
# optimize_strategy step (Phase 11 Feature 2)
# ---------------------------------------------------------------------------


def narrate_optimize_strategy_lay(
    advisories: list[StrategyAdvice],
    *,
    language: SupportedLanguage,
) -> PipelineNarrativeEvent:
    """Lay narration after the optimizer step.

    Data point is the advisory count + severity mix (e.g. "1 warn"), or
    "all clear" when no advisories tripped.
    """
    n = len(advisories)
    if n == 0:
        data_point = {"en": "all clear", "ms": "tiada konflik", "zh": "无冲突"}[language]
    else:
        # Severity mix surfaced as the data point — keeps it ≤ 40 chars
        # even when 3 cards exist.
        sev_counts: dict[str, int] = {}
        for a in advisories:
            sev_counts[a.severity] = sev_counts.get(a.severity, 0) + 1
        parts = [f"{count} {sev}" for sev, count in sev_counts.items()]
        data_point = ", ".join(parts)
    return PipelineNarrativeEvent(
        step="optimize_strategy",
        headline=_headline("optimize_strategy", language),
        data_point=data_point[:40],
    )


def narrate_optimize_strategy_technical(
    advisories: list[StrategyAdvice],
    *,
    triggered_rule_ids: list[str] | None = None,
    latency_ms: int | None = None,
) -> PipelineTechnicalEvent:
    """Developer transcript after the optimizer step.

    Surfaces every triggered rule + each surviving advisory's id, severity,
    confidence, and citation. Includes only enum-ish data — no free-text
    PII from the user profile.
    """
    lines: list[str] = ["tool=optimize_strategy (Gemini 2.5 Pro structured)"]
    triggered = triggered_rule_ids or []
    lines.append(
        f"  rules_loaded=3  rules_triggered={len(triggered)}  advisories_emitted={len(advisories)}"
    )
    if triggered:
        lines.append("  triggered=[" + ", ".join(triggered) + "]")
    for a in advisories:
        cite = f"{a.citation.pdf}:{a.citation.section or ''}:p{a.citation.page or '-'}"
        lines.append(f"  ✓ {a.interaction_id} sev={a.severity} conf={a.confidence:.2f} cite={cite}")
    if latency_ms is not None:
        lines.append(f"  latency_ms={latency_ms}")
    return PipelineTechnicalEvent(step="optimize_strategy", timestamp=_now_iso(), log_lines=lines)
