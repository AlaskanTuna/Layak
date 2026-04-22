#!/usr/bin/env python
"""Phase 8 Task 1 gate — probe `gemini-3-flash-preview` for tool + structured-output support.

Phase 8 Task 4 wants `compute_upside` to swap from `gemini-2.5-flash` to
`gemini-3-flash-preview`, which requires the model to support both:

    1. `tools=[Tool(code_execution=...)]`     — used by compute_upside
    2. `response_mime_type="application/json"` — used by extract + classify

Preview models historically lag GA siblings on tool support, and a missing
capability would silently break the pipeline at demo time. Run this probe
before flipping any model constant.

Regional finding (2026-04-23 probe of layak-myaifuturehackathon):
    asia-southeast1 — only `gemini-2.5-flash` is published.
    us-central1     — adds 2.5-pro and 2.5-flash-lite, but NO gemini-3-flash-preview.
    global          — all four models work (only place that resolves
                       gemini-3-flash-preview at the moment).

We therefore call `global` directly, regardless of `GOOGLE_CLOUD_LOCATION`,
so this probe is region-independent.

Usage:
    python backend/scripts/probe_gemini_3_flash.py
        Returns exit 0 on both checks pass, 1 on any failure. Prints the
        observed response shape so you can paste it into the Phase 8 Task 1
        completion note.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from google import genai
from google.genai import types

PROBE_MODEL = "gemini-3-flash-preview"
PROBE_LOCATION = "global"


def _load_dotenv() -> None:
    """Mirror gemini.py's dotenv fallback so the probe works outside `uvicorn`."""
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


def probe_code_execution() -> bool:
    """Pass = response carries both an executable_code part and a
    code_execution_result part with non-empty output."""
    client = _client()
    response = client.models.generate_content(
        model=PROBE_MODEL,
        contents=(
            "Use the code_execution tool to run a tiny Python program that "
            "computes 2 + 2 and prints the result on its own line."
        ),
        config=types.GenerateContentConfig(
            tools=[types.Tool(code_execution=types.ToolCodeExecution())],
            temperature=0.0,
        ),
    )
    has_code = False
    has_result = False
    stdout = ""
    for candidate in response.candidates or []:
        for part in (candidate.content.parts if candidate.content else []) or []:
            if getattr(part, "executable_code", None):
                code_src = getattr(part.executable_code, "code", "") or ""
                if code_src.strip():
                    has_code = True
            if getattr(part, "code_execution_result", None):
                output = getattr(part.code_execution_result, "output", "") or ""
                if output.strip():
                    has_result = True
                    stdout = output.strip()
    print(f"[code_execution] executable_code present: {has_code}")
    print(f"[code_execution] code_execution_result output: {stdout!r}")
    return has_code and has_result


def probe_structured_output() -> bool:
    """Pass = response.text parses as bare JSON without markdown fences."""
    client = _client()
    response = client.models.generate_content(
        model=PROBE_MODEL,
        contents='Return ONLY this JSON object and nothing else: {"answer": 4}',
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0,
        ),
    )
    raw = (response.text or "").strip()
    print(f"[structured]    raw response: {raw!r}")
    try:
        import json

        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"[structured]    JSON parse failed: {exc}")
        return False
    return parsed.get("answer") == 4


def main() -> int:
    print(f"Probing {PROBE_MODEL} via Vertex AI location={PROBE_LOCATION}\n")
    code_pass = probe_code_execution()
    print()
    struct_pass = probe_structured_output()
    print()
    print("=" * 60)
    print(f"code_execution support : {'PASS' if code_pass else 'FAIL'}")
    print(f"structured-output support: {'PASS' if struct_pass else 'FAIL'}")
    print("=" * 60)
    if code_pass and struct_pass:
        print(f"\n{PROBE_MODEL} is safe to wire as HEAVY_MODEL in Phase 8 Task 4.")
        return 0
    print(
        f"\nFALLBACK: wire HEAVY_MODEL = 'gemini-2.5-pro' in Phase 8 Task 4 "
        f"instead of {PROBE_MODEL}."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
