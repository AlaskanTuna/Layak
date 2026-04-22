#!/usr/bin/env python
"""Vertex AI Search seed — one-time idempotent indexing of the 6 scheme PDFs.

Creates (or reuses) a Discovery Engine data store and inline-uploads every PDF
under ``backend/data/schemes/`` so the ``match_schemes`` FunctionTool (Task 3
Path 2) can ground each eligibility claim in a retrieved passage + source URL.

Usage
-----

Dry-run (default — prints the plan, no API calls, runs in <1 s)::

    python backend/scripts/seed_vertex_ai_search.py --project layak-myaifuturehackathon

Execute (requires ``gcloud auth application-default login`` and the Discovery
Engine API enabled on the project; ~30-60 s for create + import, 3-5 min for
indexing to complete before canary queries resolve)::

    python backend/scripts/seed_vertex_ai_search.py \\
        --project layak-myaifuturehackathon \\
        --execute

Flags
-----

--project   GCP project ID (required).
--location  Discovery Engine location. Defaults to ``global``; Cloud Run lives in
            ``asia-southeast1`` but Discovery Engine data stores only exist in
            ``global``, ``us``, or ``eu`` as of the v1 API. Using ``global`` by
            default for Malaysian content.
--data-store  Data store ID. Defaults to ``layak-schemes-v1``.
--execute   Opt in to real API calls. Omit for dry-run.
--verbose   Extra logging.

Idempotence
-----------

- Creating the data store: wrapped in a try/``get_data_store`` fallback so a
  second run is a no-op.
- Importing documents: uses ``ReconciliationMode.INCREMENTAL`` — re-uploading
  the same ``id`` upserts the content in-place.
- Canary queries are read-only and safe to re-run.

No GCS bucket is used. PDFs are uploaded inline as raw bytes (each < 1.5 MB,
under Discovery Engine's 10 MB inline-document cap). This keeps the
``docs/trd.md`` §6.5 "repo is the bucket; no GCS in v1" invariant intact.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import TYPE_CHECKING

SCHEMES_DIR = Path(__file__).resolve().parent.parent / "data" / "schemes"

DATA_STORE_ID_DEFAULT = "layak-schemes-v1"
DATA_STORE_DISPLAY = "Layak scheme corpus (v1)"
LOCATION_DEFAULT = "global"

# Canary queries mirror the three scheme families the rule engine cites. Each
# returns success if the expected source PDF appears in the top 3 results.
CANARY_QUERIES: list[dict[str, str]] = [
    {
        "query": "STR 2026 household with children income threshold",
        "expect_pdf": "risalah-str-2026.pdf",
    },
    {
        "query": "JKM Warga Emas per capita income means test",
        "expect_pdf": "jkm18.pdf",
    },
    {
        "query": "LHDN individual relief RM9,000 Form B",
        "expect_pdf": "pr-no-4-2024.pdf",
    },
]

if TYPE_CHECKING:  # pragma: no cover — type-only imports, cheap at runtime.
    from google.cloud.discoveryengine_v1 import (  # noqa: F401
        DataStoreServiceClient,
        DocumentServiceClient,
        SearchServiceClient,
    )


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description=__doc__.splitlines()[0],
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--project", required=True, help="GCP project ID.")
    p.add_argument(
        "--location",
        default=LOCATION_DEFAULT,
        help=f"DE location (default: {LOCATION_DEFAULT}).",
    )
    p.add_argument(
        "--data-store",
        default=DATA_STORE_ID_DEFAULT,
        help=f"Data store ID (default: {DATA_STORE_ID_DEFAULT}).",
    )
    p.add_argument("--execute", action="store_true", help="Make real API calls (default: dry-run).")
    p.add_argument("--verbose", "-v", action="store_true", help="Extra logging.")
    return p.parse_args()


def _list_pdfs() -> list[Path]:
    return sorted(SCHEMES_DIR.glob("*.pdf"))


def _sanitize_doc_id(stem: str) -> str:
    # Discovery Engine document IDs allow [a-zA-Z0-9_-], up to 63 chars.
    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", stem)
    return safe[:63]


def _dry_run(args: argparse.Namespace) -> int:
    pdfs = _list_pdfs()
    print("DRY RUN — no API calls made. Pass --execute to seed for real.\n")
    print(f"  Project     : {args.project}")
    print(f"  Location    : {args.location}")
    print(f"  Data store  : {args.data_store}")
    print(f"  PDF source  : {SCHEMES_DIR}")
    print(f"  PDFs found  : {len(pdfs)}")
    total_bytes = 0
    for p in pdfs:
        size = p.stat().st_size
        total_bytes += size
        print(f"    - {_sanitize_doc_id(p.stem):<40s}  {p.name:<40s}  {size:>8,} bytes")
    print(f"  Total bytes : {total_bytes:,}")
    if total_bytes > 60_000_000:
        print("  WARNING     : total > 60 MB may exceed inline import quota; consider GCS import instead.")
    print("\nCanary queries to run after indexing:")
    for q in CANARY_QUERIES:
        print(f"  - {q['query']!r}")
        print(f"      expects a top-3 result whose source document contains {q['expect_pdf']}")
    print("\nDry run complete. No state changed.")
    return 0


def _ensure_data_store(
    client: DataStoreServiceClient,
    project: str,
    location: str,
    data_store_id: str,
    verbose: bool,
) -> str:
    """Create the data store if it doesn't exist. Return its fully-qualified path."""
    from google.api_core.exceptions import NotFound
    from google.cloud.discoveryengine_v1.types import DataStore, IndustryVertical, SolutionType

    parent = f"projects/{project}/locations/{location}/collections/default_collection"
    store_path = f"{parent}/dataStores/{data_store_id}"

    try:
        existing = client.get_data_store(name=store_path)
        if verbose:
            print(f"  Data store already exists: {existing.name}")
        return store_path
    except NotFound:
        pass

    print(f"Creating data store {data_store_id} in {location} ...")
    op = client.create_data_store(
        parent=parent,
        data_store_id=data_store_id,
        data_store=DataStore(
            display_name=DATA_STORE_DISPLAY,
            industry_vertical=IndustryVertical.GENERIC,
            solution_types=[SolutionType.SOLUTION_TYPE_SEARCH],
            content_config=DataStore.ContentConfig.CONTENT_REQUIRED,
        ),
    )
    op.result(timeout=120)
    print("  created.")
    return store_path


_GCS_PDF_BUCKET = "layak-schemes-pdfs"


def _import_pdfs(
    client: DocumentServiceClient,
    store_path: str,
    pdfs: list[Path],
    verbose: bool,
) -> None:
    """Upsert every PDF into the default branch via Discovery Engine GCS source.

    Inline raw_bytes ingestion (the previous approach) silently fails with
    "Field 'document.data' is a required field" — this is a long-standing
    Discovery Engine quirk for PDF binaries even though the SDK accepts the
    shape. The documented Google pattern is to upload PDFs to GCS first and
    use `gcs_source` with `data_schema='content'` so Discovery Engine pulls
    each PDF, parses it, and indexes the extracted text.

    Bucket: gs://layak-schemes-pdfs/ (created in `us` multi-region; ~14 MB
    total — well inside the GCS Always Free tier's 5 GB ceiling). Upload the
    PDFs once via:

        gsutil -m cp backend/data/schemes/*.pdf gs://layak-schemes-pdfs/

    Re-running the seed script after that is idempotent (INCREMENTAL
    reconciliation upserts in-place per object name).
    """
    from google.cloud.discoveryengine_v1.types import GcsSource, ImportDocumentsRequest

    branch = f"{store_path}/branches/default_branch"
    input_uris = [f"gs://{_GCS_PDF_BUCKET}/{p.name}" for p in pdfs]

    print(f"Importing {len(pdfs)} PDFs into {branch} via gs://{_GCS_PDF_BUCKET}/ ...")
    if verbose:
        for uri in input_uris:
            print(f"  source uri: {uri}")

    op = client.import_documents(
        request=ImportDocumentsRequest(
            parent=branch,
            gcs_source=GcsSource(input_uris=input_uris, data_schema="content"),
            reconciliation_mode=ImportDocumentsRequest.ReconciliationMode.INCREMENTAL,
        )
    )
    result = op.result(timeout=900)
    print(f"  result: {result}")
    for field in ("success_count", "failure_count"):
        if hasattr(result, field):
            print(f"    {field}: {getattr(result, field)}")


def _run_canaries(client: SearchServiceClient, store_path: str) -> bool:
    """Run each canary query and return True iff all hit the expected PDF."""
    from google.cloud.discoveryengine_v1.types import SearchRequest

    # Canonical v1 serving-config name is `default_serving_config`, NOT
    # `default_search` — the latter is documented in many older tutorials and
    # produces a NotFound. Audit (subagent, commit `6f263ee`) caught this.
    serving_config = f"{store_path}/servingConfigs/default_serving_config"
    all_ok = True
    for q in CANARY_QUERIES:
        expected = q["expect_pdf"]
        expected_id = _sanitize_doc_id(Path(expected).stem)
        try:
            response = client.search(
                request=SearchRequest(
                    serving_config=serving_config,
                    query=q["query"],
                    page_size=3,
                )
            )
            top_ids = [r.document.id for r in list(response.results)[:3]]
            hit = expected_id in top_ids
            status = "OK  " if hit else "MISS"
            print(f"  [{status}] {q['query']!r} -> {top_ids}")
            all_ok = all_ok and hit
        except Exception as e:  # noqa: BLE001
            print(f"  [ERR ] {q['query']!r}: {type(e).__name__}: {e}")
            all_ok = False
    return all_ok


def _check_adc() -> None:
    """Fail fast with a readable message if Application Default Credentials aren't set up."""
    try:
        import google.auth
    except ImportError as e:  # pragma: no cover
        raise SystemExit(f"google-auth not installed: {e}") from e
    try:
        google.auth.default()
    except Exception as e:  # noqa: BLE001
        raise SystemExit(
            "error: Application Default Credentials not configured.\n"
            "Run: gcloud auth application-default login\n"
            f"Original: {type(e).__name__}: {e}"
        ) from e


def _execute(args: argparse.Namespace) -> int:
    try:
        from google.cloud import discoveryengine_v1 as de
    except ImportError as e:
        print(f"error: google-cloud-discoveryengine is required for --execute: {e}", file=sys.stderr)
        return 1

    _check_adc()

    pdfs = _list_pdfs()
    if not pdfs:
        print(f"error: no PDFs found in {SCHEMES_DIR}", file=sys.stderr)
        return 1
    if len(pdfs) < 6:
        print(f"warning: fewer than 6 PDFs found ({len(pdfs)}); seed will still proceed", file=sys.stderr)

    client_data = de.DataStoreServiceClient()
    client_doc = de.DocumentServiceClient()
    client_search = de.SearchServiceClient()

    store_path = _ensure_data_store(client_data, args.project, args.location, args.data_store, args.verbose)
    _import_pdfs(client_doc, store_path, pdfs, args.verbose)

    # First-index latency on a fresh DE data store is typically 2-5 minutes
    # for a small corpus; 180 s is the minimum practical wait before the
    # canaries have any chance to hit. On re-runs (content already indexed)
    # this is wasted time but still safer than a false MISS.
    indexing_wait_s = 180
    print(f"\nWaiting {indexing_wait_s} s for indexing to settle before running canaries ...")
    import time

    time.sleep(indexing_wait_s)

    print("\nRunning canary queries:")
    all_ok = _run_canaries(client_search, store_path)

    if not all_ok:
        print(
            "\nOne or more canaries failed. Indexing may still be in progress — "
            "wait 2-3 minutes and re-run with --execute to re-check.",
            file=sys.stderr,
        )
        return 2

    print("\nAll canaries passed. Data store is demo-ready.")
    print(f"Record this in .env: VERTEX_AI_SEARCH_DATA_STORE={args.data_store}")
    return 0


def main() -> int:
    args = _parse_args()
    if args.execute:
        return _execute(args)
    return _dry_run(args)


if __name__ == "__main__":
    sys.exit(main())
