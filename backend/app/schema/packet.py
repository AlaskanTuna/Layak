"""Draft application packet models.

WeasyPrint populates `blob_bytes_b64`; the field stays None until then. The
packet is stateless — it lives in the request-scope response and is
discarded after the SSE stream terminates.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PacketDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scheme_id: str = Field(min_length=1)
    filename: str = Field(min_length=1)
    blob_bytes_b64: str | None = None


class Packet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    drafts: list[PacketDraft] = Field(default_factory=list)
    generated_at: datetime
