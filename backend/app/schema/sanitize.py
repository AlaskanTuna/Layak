"""Free-text sanitizers for user-supplied payload fields.

Every `name`/`address`/etc. value in `ManualEntryPayload` flows into one of
three downstream sinks:

1. **Gemini prompts** (`classify_household`, `compute_upside`) — text that
   looks like an instruction ("ignore previous instructions") can hijack the
   model unless the prompt is hardened (§3.4) and the content is stripped of
   obvious steering characters.
2. **WeasyPrint PDF templates** — Jinja autoescape handles HTML/JS, but
   Unicode control + RTL override characters still visually distort printed
   output.
3. **Firestore storage** — the `evaluations/{evalId}` doc round-trips this
   text to the frontend, which renders it in `dangerouslySetInnerHTML`-free
   components. Still: NFKC-normalised, no zero-width chars.

This module is the single place we scrub that content. Applied via Pydantic
`AfterValidator` annotations so the model's `model_validate(...)` emits
already-sanitised strings — no downstream call ever sees the raw value.

Scope: ONLY free-form text fields (name, address). Numeric / enum / regex-
gated fields (ic_last6, employment_type, monthly_income_rm, etc.) are already
safe because Pydantic rejects anything that isn't the exact shape.
"""

from __future__ import annotations

import re
import unicodedata

# Unicode categories + specific codepoints we strip:
#   - Cc: control characters (0x00-1F, 0x7F-9F); allow \t and \n explicitly
#   - Cf: format characters — includes zero-width joiner / non-joiner / BOM /
#     left-to-right and right-to-left override / embed / isolate characters
#     (U+202A-E, U+2066-9). All of these either distort display or invisibly
#     reorder text; none belong in a name or address.
#   - Cs: surrogate code points (never appear in valid decoded text, but
#     guard anyway against malformed input)
#   - Co: private-use characters (harmless in principle but reject for
#     uniformity — users shouldn't be typing PUA into an address field)
#
# Everything else passes through — including CJK, diacritics, emoji. Malay
# addresses include diacritics ("Sijil") and Chinese/Tamil names are common
# in Malaysia; over-aggressive ASCII-only stripping would break real users.
_DISALLOWED_CATEGORIES = {"Cc", "Cf", "Cs", "Co"}

# Whitespace we *keep* even though they are control characters (Cc):
_ALLOWED_CONTROL = {"\t", "\n"}

# Collapse runs of whitespace (after stripping) to a single space. Newlines
# inside an address are preserved via a dedicated collapse rule that runs on
# spaces/tabs only — the caller decides whether the field accepts multi-line.
_WHITESPACE_RUN = re.compile(r"[ \t]+")
_NEWLINE_RUN = re.compile(r"\n{3,}")


def sanitize_free_text(value: str, *, max_length: int, allow_newlines: bool = False) -> str:
    """Strip control + format characters, NFKC-normalise, collapse whitespace,
    truncate to `max_length` **code points**, and return.

    The truncation counts Unicode code points (what `len()` reports), not
    graphemes. A user with combining-mark spam can therefore hit the cap
    sooner than visual length suggests; worst-case the cut lands mid-
    combining-sequence and leaves an orphan accent. Deemed acceptable — the
    caps (200/300) are well above any legitimate name/address so this is a
    defence-in-depth trim, not a UX-facing length constraint.

    Raises:
        ValueError: when the input resolves to an empty string after cleaning.
            Pydantic re-raises this as a 422 with the field path intact.
    """
    if not isinstance(value, str):  # defensive — Pydantic already enforces str
        raise ValueError("expected a string")

    # NFKC resolves fullwidth / half-width / compatibility variants so
    # "Ａｉｓｙａｈ" → "Aisyah". Prevents duplicate doc entries for what a user
    # thinks is the same name.
    cleaned = unicodedata.normalize("NFKC", value)

    # Drop every character whose Unicode general category is in the
    # disallowed set, except the `\t` and `\n` we explicitly whitelist.
    stripped_chars: list[str] = []
    for ch in cleaned:
        if ch in _ALLOWED_CONTROL:
            if ch == "\n" and not allow_newlines:
                # Downgrade to a space so multi-line paste into a single-line
                # field doesn't leave visible line breaks.
                stripped_chars.append(" ")
            else:
                stripped_chars.append(ch)
            continue
        if unicodedata.category(ch) in _DISALLOWED_CATEGORIES:
            continue
        stripped_chars.append(ch)
    cleaned = "".join(stripped_chars)

    # Collapse runs of spaces/tabs to a single space. Newlines preserved for
    # multi-line fields; runs of 3+ are clamped at 2 for tidy PDF rendering.
    cleaned = _WHITESPACE_RUN.sub(" ", cleaned)
    if allow_newlines:
        cleaned = _NEWLINE_RUN.sub("\n\n", cleaned)

    cleaned = cleaned.strip()

    if not cleaned:
        raise ValueError("empty after sanitisation")

    # Truncate to max_length graphemes. Pydantic's `max_length` runs AFTER
    # validators, so relying on that alone would let a 10,000-char input
    # reach us; we clamp here as a defensive second line.
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]

    return cleaned


def sanitize_name(value: str) -> str:
    """Single-line free-text name. 200 code-point cap."""
    return sanitize_free_text(value, max_length=200, allow_newlines=False)


def sanitize_address(value: str) -> str:
    """Multi-line address. 300 code-point cap — tightened from the original 500
    to reduce prompt-token footprint without truncating real MY addresses."""
    return sanitize_free_text(value, max_length=300, allow_newlines=True)
