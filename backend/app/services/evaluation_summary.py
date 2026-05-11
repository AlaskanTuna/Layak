"""Brief AI-written summary of an evaluation — Gemini Flash-Lite.

Powers the Summary card on `/dashboard/evaluation/results/[id]`. Uses the
same `FAST_MODEL` (gemini-3.1-flash-lite) as the chat surface so the prose
register matches what the user already sees on the page. Stateless: each
call re-runs Gemini against the stored profile + matches. Flash-Lite first-
token latency (~1.2 s) keeps the card's skeleton-to-content swap snappy.

The eval doc's frozen `language` field is the source of truth — the UI
toggle can change post-run, but a summary written in en against an eval
that ran in ms would mismatch the `why_qualify` strings on the page. Pin
to the language the rest of the eval was generated in.
"""

from __future__ import annotations

import logging
from typing import Any

from google.genai import errors as genai_errors
from google.genai import types

from app.agents.gemini import (
    FAST_MODEL,
    generate_with_retry,
    get_client,
)
from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage

_logger = logging.getLogger(__name__)

# Hard cap so a hallucinating model can't blow past the card's expected
# 2-3 sentence shape. Plenty of headroom for Mandarin (denser glyphs) and
# Bahasa Malaysia (slightly longer phrasing).
_MAX_OUTPUT_TOKENS = 220

_SYSTEM_INSTRUCTION: dict[SupportedLanguage, str] = {
    "en": (
        "You are Layak's summary writer. Given a Malaysian citizen's social-"
        "assistance evaluation result, write a 2-3 sentence plain-language "
        "summary. Lead with the total annual relief amount, name the single "
        "most impactful qualifying scheme, and close with a soft forward-"
        "looking line about reviewing the schemes or downloading the draft "
        "applications. Warm, concise, no jargon. Plain prose only — no "
        "bullets, no markdown, no scheme codes in brackets."
    ),
    "ms": (
        "Anda penulis ringkasan untuk Layak. Berdasarkan hasil penilaian "
        "bantuan sosial rakyat Malaysia, tulis ringkasan 2-3 ayat dalam "
        "bahasa yang mudah difahami. Mulakan dengan jumlah faedah tahunan, "
        "namakan SATU skim paling berimpak, dan akhiri dengan ajakan lembut "
        "untuk menyemak skim atau memuat turun draf permohonan. Mesra, "
        "ringkas, tanpa istilah teknikal. Prosa biasa sahaja — tiada bullet, "
        "tiada markdown, tiada kod skim dalam kurungan."
    ),
    "zh": (
        "你是 Layak 的摘要撰写者。根据马来西亚公民的社会援助评估结果，"
        "用浅显易懂的中文写一段 2-3 句的摘要。先说明全年可获得的总援助金额，"
        "点名最重要的一项符合资格的计划，最后用温和的语气邀请用户查看计划"
        "或下载草拟好的申请表。语气亲切、简洁，避免使用专业术语。只写纯文字"
        "——不要用项目符号、不要用 markdown、不要在括号里加计划代码。"
    ),
}


def _format_profile_line(profile: dict[str, Any]) -> str:
    """One-liner profile description for the prompt — enough context, no IC.

    Strips identifying digits (IC, phone) so the LLM never sees them; the
    rule-engine has already done its work upstream, and the summary's job
    is to explain the *result*, not the identity that produced it.
    """
    employment = profile.get("employment_type") or "unknown employment"
    income = profile.get("monthly_income_rm")
    income_str = f"RM {income:,.0f}/month" if isinstance(income, (int, float)) else "income unknown"
    age = profile.get("age")
    age_str = f"age {age}" if isinstance(age, int) else "age unknown"
    dependants = profile.get("dependants") or []
    dep_str = f"{len(dependants)} dependant{'s' if len(dependants) != 1 else ''}"
    return f"{age_str}, {employment}, {income_str}, {dep_str}"


def _format_matches_for_prompt(matches: list[dict[str, Any]]) -> str:
    """Top-N qualifying matches as a numbered list for the prompt.

    Required-contribution items (PERKESO SKSPS etc.) are excluded — they're
    obligations, not relief, and would skew the summary's framing. Ordered
    by descending `annual_rm` so the model's "single most impactful" pick
    aligns with the ranked grid the user sees on the page.
    """
    qualifying = [
        m for m in matches
        if m.get("qualifies") and (m.get("kind") or "upside") == "upside"
    ]
    qualifying.sort(key=lambda m: m.get("annual_rm") or 0, reverse=True)
    if not qualifying:
        return "No qualifying schemes."
    lines: list[str] = []
    for idx, match in enumerate(qualifying[:5], start=1):
        name = match.get("scheme_name") or match.get("scheme_id") or "Unnamed scheme"
        amount = match.get("annual_rm") or 0
        reason = (match.get("why_qualify") or "").strip()
        lines.append(f"{idx}. {name} — RM {amount:,.2f}/year. {reason}")
    return "\n".join(lines)


def _build_prompt(eval_doc: dict[str, Any]) -> str:
    """Compose the user-side content blob for the Gemini call."""
    profile = eval_doc.get("profile") or {}
    matches = eval_doc.get("matches") or []
    total = eval_doc.get("totalAnnualRM") or 0.0

    profile_line = _format_profile_line(profile)
    matches_block = _format_matches_for_prompt(matches)

    return (
        f"Profile: {profile_line}\n\n"
        f"Total annual relief: RM {total:,.2f}\n\n"
        f"Qualifying schemes (sorted by annual relief):\n{matches_block}\n\n"
        "Write the 2-3 sentence summary now."
    )


def generate_summary(eval_doc: dict[str, Any]) -> str:
    """Return a brief AI-written summary of the evaluation.

    Pins to the language stored on the eval doc — toggling the UI mid-view
    won't change the summary text mid-stream because the doc's `language`
    is the contract. Failure modes (quota, transport) are logged and a
    sensible deterministic fallback string is returned so the card still
    renders something meaningful.
    """
    language: SupportedLanguage = eval_doc.get("language") or DEFAULT_LANGUAGE  # type: ignore[assignment]
    system_instruction = _SYSTEM_INSTRUCTION.get(language, _SYSTEM_INSTRUCTION[DEFAULT_LANGUAGE])
    prompt = _build_prompt(eval_doc)

    client = get_client()
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.4,
        max_output_tokens=_MAX_OUTPUT_TOKENS,
    )

    try:
        response = generate_with_retry(
            client,
            model=FAST_MODEL,
            contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
            config=config,
        )
    except genai_errors.APIError as exc:
        _logger.warning("Summary Gemini call failed: %s", exc)
        return _fallback_summary(eval_doc, language)
    except Exception:  # noqa: BLE001 — never break the card on transport failures.
        _logger.exception("Summary Gemini call failed unexpectedly")
        return _fallback_summary(eval_doc, language)

    text = (getattr(response, "text", None) or "").strip()
    if not text:
        return _fallback_summary(eval_doc, language)
    return text


def _fallback_summary(eval_doc: dict[str, Any], language: SupportedLanguage) -> str:
    """Deterministic copy used when Gemini is unreachable.

    Keeps the card meaningful on demo day if the model is rate-limited or
    the region drops out. Mirrors the same shape (lead with total + scheme
    count, close with a CTA) the AI version follows so the UX is stable.
    """
    matches = eval_doc.get("matches") or []
    qualifying_count = sum(
        1 for m in matches if m.get("qualifies") and (m.get("kind") or "upside") == "upside"
    )
    total = eval_doc.get("totalAnnualRM") or 0.0
    if language == "ms":
        return (
            f"Anda layak untuk {qualifying_count} skim bantuan dengan jumlah faedah "
            f"tahunan sebanyak RM {total:,.0f}. Semak senarai skim di bawah dan muat "
            f"turun draf permohonan untuk memulakan."
        )
    if language == "zh":
        return (
            f"您符合 {qualifying_count} 项援助计划的资格，全年可获得 RM {total:,.0f} 的"
            f"援助。请查看下方的计划列表，并下载草拟好的申请表开始申请。"
        )
    return (
        f"You qualify for {qualifying_count} schemes worth RM {total:,.0f} in annual "
        f"relief. Review the matched schemes below and download the draft "
        f"applications to get started."
    )
