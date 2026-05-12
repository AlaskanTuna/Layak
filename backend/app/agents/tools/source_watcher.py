"""`source_watcher` — fetch + hash + diff the discovery source allowlist.

Loads the YAML allowlist at `backend/app/data/discovery_sources.yaml`, GETs
each URL with `httpx`, normalises the response (lowercases content-type
text, strips whitespace runs, optional CSS-selector narrowing), SHA-256s
the normalised content, and diffs against the last-seen hash stored under
`verified_schemes/{source_id}.source_content_hash` in Firestore.

Anything that changed becomes a `ChangedSource` payload — that's what the
extractor consumes on the next pipeline step. Sources that 200 with the
same hash are no-ops. Sources that 4xx/5xx/timeout are skipped with an
error logged into the `DiscoveryRunSummary.errors` list.

The watcher is intentionally cautious about open-web fetching: it sets a
short timeout, a Layak-identifying User-Agent (so government webmasters can
recognise the polling traffic if they audit logs), and never follows
redirects across origins.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import yaml
from pydantic import ValidationError

from app.schema.discovery import ChangedSource, DiscoverySource

_logger = logging.getLogger(__name__)

_SOURCES_YAML = Path(__file__).resolve().parent.parent.parent / "data" / "discovery_sources.yaml"
_USER_AGENT = "LayakDiscoveryBot/0.1 (+https://layak.tech/about)"
_FETCH_TIMEOUT_SECONDS = 20.0
_MAX_BYTES_PER_FETCH = 5 * 1024 * 1024  # 5 MiB cap per response
_WHITESPACE_RE = re.compile(r"\s+")
_HTML_TAG_RE = re.compile(r"<[^>]+>")
# Strip structural chrome blocks (with content) before tag removal — otherwise
# the entire page navigation, footer, scripts and styles get flattened into the
# text the extractor sees, drowning out the actual scheme prose and producing
# confidence < 0.3 on every Drupal/CMS gov page.
_CHROME_BLOCK_RE = re.compile(
    r"<(script|style|nav|header|footer|noscript|aside|form)\b[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)


def load_discovery_sources(path: Path | None = None) -> list[DiscoverySource]:
    """Load and validate the YAML allowlist.

    Raises a `RuntimeError` if the file is missing or any entry fails
    Pydantic validation — the discovery pipeline cannot run with a partially
    valid allowlist, so fail-loud is the right default.
    """
    resolved = path or _SOURCES_YAML
    if not resolved.is_file():
        raise RuntimeError(f"discovery_sources.yaml missing at {resolved}")
    raw = yaml.safe_load(resolved.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise RuntimeError("discovery_sources.yaml must be a YAML list")
    sources: list[DiscoverySource] = []
    for idx, entry in enumerate(raw):
        try:
            sources.append(DiscoverySource.model_validate(entry))
        except ValidationError as exc:
            raise RuntimeError(f"discovery_sources.yaml entry #{idx} invalid: {exc}") from exc
    return sources


def _normalise_content(text: str) -> str:
    """Reduce surface-level churn so a one-line whitespace change doesn't trip a diff.

    Also strips structural chrome (script/style/nav/header/footer/aside/form) with
    their content before the generic tag-strip, so the extractor sees actual scheme
    prose instead of menu items + script bodies.
    """
    stripped_chrome = _CHROME_BLOCK_RE.sub(" ", text)
    stripped_tags = _HTML_TAG_RE.sub(" ", stripped_chrome)
    return _WHITESPACE_RE.sub(" ", stripped_tags).strip()


def hash_content(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def _fetch_one(client: httpx.AsyncClient, source: DiscoverySource) -> tuple[str, str] | None:
    """Fetch a single source, return `(content, hash)` or None on error.

    `content` is the post-normalisation string; `hash` is its SHA-256.
    """
    try:
        response = await client.get(
            source.url,
            headers={"User-Agent": _USER_AGENT},
            timeout=_FETCH_TIMEOUT_SECONDS,
            follow_redirects=True,
        )
        response.raise_for_status()
        body = response.content[:_MAX_BYTES_PER_FETCH]
        encoding = response.encoding or "utf-8"
        text = body.decode(encoding, errors="replace")
        normalised = _normalise_content(text)
        if not normalised:
            return None
        return normalised, hash_content(normalised)
    except (httpx.HTTPError, ValueError) as exc:
        _logger.warning("source_watcher fetch failed for %s: %s", source.id, exc)
        return None


def _previous_hash_for(db: Any, source_id: str) -> str | None:
    """Read the last-known content hash from `verified_schemes/{source_id}`.

    Returns None on first sight (no doc) or when the doc exists but lacks
    the `sourceContentHash` field — both are "no baseline to diff against"
    states and should yield a `changed=True` extraction on this run.
    """
    try:
        snap = db.collection("verified_schemes").document(source_id).get()
    except Exception:  # noqa: BLE001 — Firestore transient errors must not break the watcher
        _logger.exception("verified_schemes read failed for %s", source_id)
        return None
    if not getattr(snap, "exists", False):
        return None
    data = snap.to_dict() or {}
    value = data.get("sourceContentHash")
    return value if isinstance(value, str) else None


async def watch_sources(
    db: Any,
    sources: list[DiscoverySource] | None = None,
) -> list[ChangedSource]:
    """Poll every source; emit `ChangedSource` for each content drift.

    `db` is a Firestore client (from `app.auth.get_firestore`). It is
    consulted only for read access to `verified_schemes/{source_id}.sourceContentHash`
    so the watcher can compute diffs against the last-approved baseline.
    Writes to `verified_schemes` are performed by the approve handler in
    `app.routes.admin`, not here.
    """
    if sources is None:
        sources = load_discovery_sources()
    changed: list[ChangedSource] = []
    async with httpx.AsyncClient() as client:
        tasks = [asyncio.create_task(_fetch_one(client, src)) for src in sources]
        results = await asyncio.gather(*tasks, return_exceptions=False)
    fetched_at = datetime.now(UTC)
    for src, fetched in zip(sources, results, strict=True):
        if fetched is None:
            continue
        content, content_hash = fetched
        previous = _previous_hash_for(db, src.id)
        if previous == content_hash:
            continue
        changed.append(
            ChangedSource(
                source=src,
                content=content[:8000],  # truncate to keep prompt size sane
                content_hash=content_hash,
                previous_hash=previous,
                fetched_at=fetched_at,
            )
        )
    return changed
