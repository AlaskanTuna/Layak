#!/usr/bin/env python
"""Probe `gemini-3.1-flash-lite` for the two capabilities Layak relies on.

Mirrors `probe_gemini_3_flash.py` but targets gemini-3.1-flash-lite, which we
plan to wire as both LAYAK_FAST_MODEL (multimodal extract) and
LAYAK_WORKER_MODEL (structured classify). Required capabilities:

    1. `response_mime_type="application/json"` — used by extract + classify
    2. Multimodal input (image bytes) — used by extract for IC / payslip / bill OCR

Probes a list of candidate model IDs because Vertex AI tends to publish the
same generation under several aliases (e.g. dotted vs dashed vs `-preview`
suffix). Reports per-candidate availability so the caller can pick the
canonical name to wire as the default.

Usage:
    uv run python backend/scripts/probe_gemini_3_1_flash_lite.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

CANDIDATE_MODELS = (
    "gemini-3.1-flash-lite",
    "gemini-3-1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-lite",
)
PROBE_LOCATION = "global"


def _load_dotenv() -> None:
    candidates = (
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path.cwd() / ".env",
    )
    for path in candidates:
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip()
            if k and v and k not in os.environ:
                os.environ[k] = v


def _client() -> genai.Client:
    _load_dotenv()
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if not project:
        raise RuntimeError("GOOGLE_CLOUD_PROJECT not set in env or .env")
    return genai.Client(vertexai=True, project=project, location=PROBE_LOCATION)


def probe_structured_output(model: str) -> tuple[bool, str]:
    client = _client()
    try:
        response = client.models.generate_content(
            model=model,
            contents='Return ONLY this JSON object and nothing else: {"answer": 4}',
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )
    except genai_errors.APIError as exc:
        return False, f"APIError code={getattr(exc, 'code', '?')}: {exc}"[:240]
    except Exception as exc:  # noqa: BLE001
        return False, f"{type(exc).__name__}: {exc}"[:240]
    raw = (response.text or "").strip()
    try:
        import json
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        return False, f"JSON parse failed ({exc}); raw={raw!r}"[:240]
    if parsed.get("answer") != 4:
        return False, f"unexpected payload: {parsed!r}"
    return True, raw


def probe_multimodal(model: str) -> tuple[bool, str]:
    """Real PNG fixture sent as multimodal input.

    Vertex AI rejects 1x1 stub images with `Provided image is not valid`, so
    the probe needs a fixture big enough to pass the validator. We reuse the
    repo's banner asset (committed, predictable, ~kB-sized).
    """
    fixture = Path(__file__).resolve().parent.parent.parent / "assets" / "banner.png"
    if not fixture.is_file():
        return False, f"fixture missing: {fixture}"
    png_bytes = fixture.read_bytes()
    client = _client()
    try:
        response = client.models.generate_content(
            model=model,
            contents=[
                types.Part.from_bytes(data=png_bytes, mime_type="image/png"),
                "Describe what you see in 5 words or fewer.",
            ],
            config=types.GenerateContentConfig(temperature=0.0),
        )
    except genai_errors.APIError as exc:
        return False, f"APIError code={getattr(exc, 'code', '?')}: {exc}"[:240]
    except Exception as exc:  # noqa: BLE001
        return False, f"{type(exc).__name__}: {exc}"[:240]
    text = (response.text or "").strip()
    if not text:
        return False, "empty response"
    return True, text[:80]


def main() -> int:
    print(f"Probing candidate model IDs via Vertex AI location={PROBE_LOCATION}\n")
    any_ok = False
    for model in CANDIDATE_MODELS:
        print(f"=== {model} ===")
        struct_ok, struct_detail = probe_structured_output(model)
        print(f"  structured-output: {'PASS' if struct_ok else 'FAIL'} — {struct_detail}")
        if not struct_ok:
            print()
            continue
        mm_ok, mm_detail = probe_multimodal(model)
        print(f"  multimodal:        {'PASS' if mm_ok else 'FAIL'} — {mm_detail}")
        if struct_ok and mm_ok:
            any_ok = True
        print()
    return 0 if any_ok else 1


if __name__ == "__main__":
    sys.exit(main())
