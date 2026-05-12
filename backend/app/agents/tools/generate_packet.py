"""`generate_packet` FunctionTool — WeasyPrint-rendered draft PDFs.

For each qualifying scheme match, render a Jinja template into HTML, pipe that
through WeasyPrint into a PDF, and base64-encode the bytes into the
`PacketDraft.blob_bytes_b64` field. The terminal `DoneEvent.packet` carries the
same drafts verbatim, so the service stays stateless — no GCS bucket, no
packet-lookup endpoint, no session store. The frontend decodes the base64 and
surfaces downloads.

Every page of every PDF carries a repeated diagonal `DRAFT — NOT SUBMITTED`
watermark and a legal footer with disclaimers.

System deps (see `backend/Dockerfile` / WeasyPrint troubleshooting):
    libpango-1.0-0, libpangoft2-1.0-0, libcairo2, libgdk-pixbuf-2.0-0.
"""

from __future__ import annotations

from base64 import b64encode
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.schema.locale import DEFAULT_LANGUAGE, SupportedLanguage
from app.schema.packet import Packet, PacketDraft
from app.schema.profile import Profile
from app.schema.scheme import SchemeMatch

# backend/app/agents/tools/generate_packet.py → backend/app/templates/
_TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "templates"

# scheme_id → (template filename, output filename pattern). Notes:
# - `lhdn_form_be` — Form BE salaried filer layout.
# - `jkm_bkk` — Bantuan Kanak-Kanak per-child payment.
# - `perkeso_sksps` — SKSPS self-employed social-security contribution.
#   Unlike the other four, SKSPS is a required-contribution scheme
#   (`kind="required_contribution"`); the draft still renders so the user
#   has a filing artefact, but the match's `annual_rm` is zero and the
#   upside pipeline filters it out.
_TEMPLATE_MAP: dict[str, tuple[str, str]] = {
    "str_2026": ("bk01.html.jinja", "BK-01-STR2026-draft-{date}.pdf"),
    "jkm_warga_emas": ("jkm18.html.jinja", "JKM18-warga-emas-draft-{date}.pdf"),
    "jkm_bkk": ("jkm_bkk.html.jinja", "JKM-bkk-draft-{date}.pdf"),
    "lhdn_form_b": ("lhdn.html.jinja", "LHDN-form-b-relief-summary-{date}.pdf"),
    "lhdn_form_be": ("lhdn_be.html.jinja", "LHDN-form-be-relief-summary-{date}.pdf"),
    "perkeso_sksps": ("perkeso_sksps.html.jinja", "PERKESO-sksps-draft-{date}.pdf"),
    "i_saraan": ("i_saraan.html.jinja", "KWSP-i-saraan-draft-{date}.pdf"),
}


@lru_cache(maxsize=1)
def _env() -> Environment:
    """Cached Jinja environment with filesystem loader + HTML autoescape."""
    return Environment(
        loader=FileSystemLoader(_TEMPLATES_DIR),
        autoescape=select_autoescape(enabled_extensions=("jinja", "html")),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def _scheme_context(
    profile: Profile,
    match: SchemeMatch,
    language: SupportedLanguage,
) -> dict:
    """Build the per-scheme Jinja context with derived fields every template needs."""
    dependants = list(profile.dependants)
    children_under_18 = sum(1 for d in dependants if d.relationship == "child" and d.age < 18)
    elderly = next(
        (d for d in dependants if d.relationship == "parent" and d.age >= 60),
        None,
    )
    per_capita = profile.monthly_income_rm / max(profile.household_size, 1)
    annual_income = profile.monthly_income_rm * 12

    # LHDN-specific relief derivations (other templates simply ignore these keys).
    has_parent = any(d.relationship == "parent" for d in dependants)
    total_relief = 9000.0 + 2500.0 + 7000.0  # individual + lifestyle + EPF/life always apply
    if has_parent:
        total_relief += 8000.0
    if children_under_18:
        total_relief += 2000.0 * children_under_18
    chargeable_after = max(0.0, annual_income - total_relief)

    return {
        "profile": profile,
        "match": match,
        "dependants": dependants,
        "children_under_18": children_under_18,
        "elderly": elderly,
        "per_capita": per_capita,
        "annual_income": annual_income,
        "has_parent": has_parent,
        "total_relief": total_relief,
        "chargeable_after": chargeable_after,
        # Templates render their Layak-added "draft review" footer from this
        # key. The gov-form body itself stays in its source language (BK-01,
        # JKM18 etc. are the actual forms).
        "locale": _LOCALE_STRINGS[language],
    }


# Layak's added chrome on the DRAFT packets. The gov-form BODY stays in its
# source language (BK-01 is BM, LHDN forms EN-leaning) because the user
# transcribes them verbatim onto the live portal — only Layak-added chrome
# (eyebrow, metadata labels, watermark, draft footer, page-footer CSS) flips.
# Keep all values WITHOUT double-quotes: the `page_footer_css` value is
# inlined into a CSS `content:` declaration, and a stray `"` inside the
# string would break the CSS parser. Single quotes are fine and used where
# needed.
_LOCALE_STRINGS: dict[str, dict[str, str]] = {
    "en": {
        "eyebrow": "Layak · Draft Application Packet",
        "generated_label": "Generated:",
        "filer_label": "Filer:",
        "watermark": "DRAFT — NOT SUBMITTED",
        "page_footer_css": (
            "Generated by Layak — DRAFT, not submitted. You must submit "
            "manually via the stated official portal."
        ),
        "draft_footer": (
            "This is a <strong>draft application packet</strong> generated by "
            "Layak and watermarked \"DRAFT — NOT SUBMITTED\" on every page. "
            "Layak is not an official government service and is not affiliated "
            "with any Malaysian ministry, and has not transmitted this document "
            "to any Malaysian agency on your behalf. Eligibility results in "
            "this packet are estimates based on Budget-2026-gazetted rates as "
            "of the generation timestamp above; the final legal determination "
            "rests with the relevant agency on application. You must submit "
            "this packet manually via the stated official portal."
        ),
    },
    "ms": {
        "eyebrow": "Layak · Pakej Permohonan Draf",
        "generated_label": "Dijana:",
        "filer_label": "Pemfail:",
        "watermark": "DRAF — BELUM DIHANTAR",
        "page_footer_css": (
            "Dijana oleh Layak — DRAF, belum dihantar. Anda perlu menghantar "
            "sendiri melalui portal rasmi yang dinyatakan."
        ),
        "draft_footer": (
            "Ini adalah <strong>draf pakej permohonan</strong> yang dijana oleh "
            "Layak dan ditandakan \"DRAF — BELUM DIHANTAR\" pada setiap muka "
            "surat. Layak bukan perkhidmatan rasmi kerajaan dan tidak berkaitan "
            "dengan mana-mana kementerian Malaysia, serta tidak menghantar "
            "dokumen ini kepada mana-mana agensi bagi pihak anda. Keputusan "
            "kelayakan dalam pakej ini adalah anggaran berdasarkan kadar yang "
            "diwartakan pada Bajet 2026 sehingga cap masa penjanaan di atas; "
            "keputusan muktamad dari segi undang-undang terletak pada agensi "
            "berkenaan apabila anda memohon. Anda perlu menghantar pakej ini "
            "sendiri melalui portal rasmi yang dinyatakan."
        ),
    },
    "zh": {
        "eyebrow": "Layak · 申请草稿包",
        "generated_label": "生成于：",
        "filer_label": "申报人：",
        "watermark": "草稿 — 尚未递交",
        "page_footer_css": (
            "由 Layak 生成 — 草稿，尚未递交。请您通过上述官方渠道自行提交。"
        ),
        "draft_footer": (
            "本文件为 Layak 生成的 <strong>草稿申请文件</strong>，每一页都带有 "
            "\"草稿 — 尚未递交\" 水印。Layak 并非政府官方服务，与任何马来"
            "西亚部门皆无关联，亦未代您将本文件递交至任何马来西亚机构。本文件中"
            "的资格评估仅为基于上述生成时间节点所公布的 2026 年度预算费率的估计"
            "；最终法律判定仍以相关机构于您正式申请时的审核为准。您必须通过上述"
            "官方渠道自行提交申请。"
        ),
    },
}


def _render_draft(
    profile: Profile,
    match: SchemeMatch,
    generated_at: datetime,
    language: SupportedLanguage,
) -> PacketDraft | None:
    """Render one scheme match into a PacketDraft with a base64-encoded PDF, or None if unmapped."""
    template_info = _TEMPLATE_MAP.get(match.scheme_id)
    if not template_info:
        return None

    template_name, filename_pattern = template_info
    # Phase 12: filename suffix dropped from `{ic_last6}` to `{date}` since
    # `Profile` no longer carries any IC information. The date is the
    # generation date in MYT-tracking UTC; collisions on the same day are
    # handled by the browser's "(1)", "(2)" suffixing on download.
    filename = filename_pattern.format(date=generated_at.strftime("%Y-%m-%d"))

    context = _scheme_context(profile, match, language)
    context["generated_at_human"] = generated_at.strftime("%d %b %Y %H:%M %Z")

    html_str = _env().get_template(template_name).render(**context)
    pdf_bytes = HTML(string=html_str).write_pdf()
    return PacketDraft(
        scheme_id=match.scheme_id,
        filename=filename,
        blob_bytes_b64=b64encode(pdf_bytes).decode("ascii"),
    )


async def generate_packet(
    profile: Profile,
    matches: list[SchemeMatch],
    *,
    language: SupportedLanguage = DEFAULT_LANGUAGE,
) -> Packet:
    """Render WeasyPrint drafts for every qualifying match.

    Args:
        profile: Extracted citizen profile.
        matches: Qualifying `SchemeMatch` list from the match step (non-qualifying
            matches should already be filtered upstream by `match_schemes`).
        language: User-chosen locale (`en` / `ms` / `zh`) — drives the
            Layak-added "draft review" footer copy in `_base.html.jinja`.
            The gov-form body itself stays in its source language.

    Returns:
        `Packet` with one `PacketDraft` per qualifying scheme. Each draft's
        `blob_bytes_b64` is a base64-encoded PDF ready for the frontend to
        decode and offer as a download.
    """
    generated_at = datetime.now(UTC)
    drafts: list[PacketDraft] = []
    for match in matches:
        draft = _render_draft(profile, match, generated_at, language)
        if draft is not None:
            drafts.append(draft)
    return Packet(drafts=drafts, generated_at=generated_at)
