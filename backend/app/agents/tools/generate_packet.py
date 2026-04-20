"""`generate_packet` FunctionTool — stub for Phase 1 Task 3.

Phase 1 Task 5 replaces this with WeasyPrint: three Jinja HTML templates
(`backend/app/templates/{bk01,jkm18,lhdn}.html.jinja`) rendered with the
extracted profile + rule-engine matches and watermarked "DRAFT — NOT SUBMITTED"
on every page. Until then the stub returns filename-only `PacketDraft`s so the
frontend's packet-download component has something to render.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.schema.packet import Packet, PacketDraft
from app.schema.profile import Profile
from app.schema.scheme import SchemeMatch

_FILENAME_TEMPLATES: dict[str, str] = {
    "str_2026": "BK-01-STR2026-draft-{ic_last4}.pdf",
    "jkm_warga_emas": "JKM18-warga-emas-draft-{ic_last4}.pdf",
    "lhdn_form_b": "LHDN-form-b-relief-summary-{ic_last4}.pdf",
}


async def generate_packet(profile: Profile, matches: list[SchemeMatch]) -> Packet:
    """Generate draft packet artefacts for each qualifying scheme match.

    Args:
        profile: Extracted citizen profile — used here only to slug the filename
            by `ic_last4` (privacy invariant: never embed full IC, NFR-3).
        matches: Qualifying `SchemeMatch` list from the match step.

    Returns:
        `Packet` with one `PacketDraft` per qualifying scheme. `blob_bytes_b64`
        stays `None` in Task 3 stub mode; WeasyPrint fills it in Task 5.
    """
    drafts: list[PacketDraft] = []
    for m in matches:
        template = _FILENAME_TEMPLATES.get(m.scheme_id, "{scheme}-draft-{ic_last4}.pdf")
        filename = template.format(ic_last4=profile.ic_last4, scheme=m.scheme_id)
        drafts.append(PacketDraft(scheme_id=m.scheme_id, filename=filename))
    return Packet(drafts=drafts, generated_at=datetime.now(UTC))
