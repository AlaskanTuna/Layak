"""Supported UI / pipeline languages.

Single source of truth for the `SupportedLanguage` Literal reused by
`UserDoc.language`, the `current_user` dependency, `stream_agent_events`,
and every pipeline tool that emits user-visible text. The three values
mirror `frontend/src/lib/i18n/index.ts::SUPPORTED_LANGUAGES` verbatim.
"""

from __future__ import annotations

from typing import Literal

SupportedLanguage = Literal["en", "ms", "zh"]

DEFAULT_LANGUAGE: SupportedLanguage = "en"
