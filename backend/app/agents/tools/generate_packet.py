"""`generate_packet` FunctionTool — WeasyPrint-rendered draft PDFs (Task 5 PO1).

For each qualifying scheme match, render a Jinja template into HTML, pipe that
through WeasyPrint into a PDF, and base64-encode the bytes into the
`PacketDraft.blob_bytes_b64` field. The terminal `DoneEvent.packet` carries the
same drafts verbatim, so the service stays stateless (docs/trd.md §6.5) — no
GCS bucket, no packet-lookup endpoint, no session store. The frontend decodes
the base64 and surfaces downloads.

Every page of every PDF carries a repeated diagonal `DRAFT — NOT SUBMITTED`
watermark (FR-8 acceptance) and a legal footer per docs/prd.md §7 disclaimers.

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

from app.schema.packet import Packet, PacketDraft
from app.schema.profile import Profile
from app.schema.scheme import SchemeMatch

# backend/app/agents/tools/generate_packet.py → backend/app/templates/
_TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "templates"

# scheme_id → (template filename, output filename pattern). Phase-7 additions:
# - `lhdn_form_be` (Task 1) — Form BE salaried filer layout.
# - `jkm_bkk` (Task 8) — Bantuan Kanak-Kanak per-child payment.
# - `perkeso_sksps` (Task 9) — SKSPS self-employed social-security
#   contribution. Unlike the other four, SKSPS is a required-contribution
#   scheme (`kind="required_contribution"`); the draft still renders so the
#   user has a filing artefact, but the match's `annual_rm` is zero and the
#   upside pipeline filters it out.
_TEMPLATE_MAP: dict[str, tuple[str, str]] = {
    "str_2026": ("bk01.html.jinja", "BK-01-STR2026-draft-{ic_last4}.pdf"),
    "jkm_warga_emas": ("jkm18.html.jinja", "JKM18-warga-emas-draft-{ic_last4}.pdf"),
    "jkm_bkk": ("jkm_bkk.html.jinja", "JKM-bkk-draft-{ic_last4}.pdf"),
    "lhdn_form_b": ("lhdn.html.jinja", "LHDN-form-b-relief-summary-{ic_last4}.pdf"),
    "lhdn_form_be": ("lhdn_be.html.jinja", "LHDN-form-be-relief-summary-{ic_last4}.pdf"),
    "perkeso_sksps": ("perkeso_sksps.html.jinja", "PERKESO-sksps-draft-{ic_last4}.pdf"),
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


def _scheme_context(profile: Profile, match: SchemeMatch) -> dict:
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
    }


def _render_draft(profile: Profile, match: SchemeMatch, generated_at: datetime) -> PacketDraft | None:
    """Render one scheme match into a PacketDraft with a base64-encoded PDF, or None if unmapped."""
    template_info = _TEMPLATE_MAP.get(match.scheme_id)
    if not template_info:
        return None

    template_name, filename_pattern = template_info
    filename = filename_pattern.format(ic_last4=profile.ic_last4)

    context = _scheme_context(profile, match)
    context["generated_at_human"] = generated_at.strftime("%d %b %Y %H:%M %Z")

    html_str = _env().get_template(template_name).render(**context)
    pdf_bytes = HTML(string=html_str).write_pdf()
    return PacketDraft(
        scheme_id=match.scheme_id,
        filename=filename,
        blob_bytes_b64=b64encode(pdf_bytes).decode("ascii"),
    )


async def generate_packet(profile: Profile, matches: list[SchemeMatch]) -> Packet:
    """Render WeasyPrint drafts for every qualifying match.

    Args:
        profile: Extracted citizen profile.
        matches: Qualifying `SchemeMatch` list from the match step (non-qualifying
            matches should already be filtered upstream by `match_schemes`).

    Returns:
        `Packet` with one `PacketDraft` per qualifying scheme. Each draft's
        `blob_bytes_b64` is a base64-encoded PDF ready for the frontend to
        decode and offer as a download.
    """
    generated_at = datetime.now(UTC)
    drafts: list[PacketDraft] = []
    for match in matches:
        draft = _render_draft(profile, match, generated_at)
        if draft is not None:
            drafts.append(draft)
    return Packet(drafts=drafts, generated_at=generated_at)
