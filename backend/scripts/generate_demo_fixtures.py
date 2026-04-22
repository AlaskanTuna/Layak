"""Generate synthetic demo persona PDFs from standalone HTML sources.

Phase 7 Task 2 widened this script from Aisyah-only to cover both demo
personas: Aisyah (gig driver, Form B) and Cikgu Farhan (salaried teacher,
Form BE). Each persona has three HTML sources under `docs/demo/<persona>/`
that WeasyPrint renders directly into `frontend/public/fixtures/`.

Outputs:
    aisyah-mykad.pdf    <- docs/demo/aisyah/mykad.html
    aisyah-payslip.pdf  <- docs/demo/aisyah/payslip.html
    aisyah-utility.pdf  <- docs/demo/aisyah/tnb-bill.html
    farhan-mykad.pdf    <- docs/demo/farhan/mykad.html
    farhan-payslip.pdf  <- docs/demo/farhan/payslip.html
    farhan-utility.pdf  <- docs/demo/farhan/tnb-bill.html

Run:
    cd backend && source .venv/bin/activate && python scripts/generate_demo_fixtures.py

Historical note: this file was `generate_aisyah_fixtures.py` before Phase 7
Task 2. Rename preserves no callers (the script is manually invoked; no
CI / pnpm / docs automation referenced the old name).
"""

from __future__ import annotations

from pathlib import Path

from weasyprint import HTML

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEMO_DIR = REPO_ROOT / "docs" / "demo"
OUT_DIR = REPO_ROOT / "frontend" / "public" / "fixtures"

# Three fixture files per persona — ic, payslip, utility — mapped to a
# fixed output filename pattern the frontend fetches from /fixtures/.
_PERSONA_SOURCE_NAMES: tuple[tuple[str, str], ...] = (
    ("mykad", "mykad.html"),
    ("payslip", "payslip.html"),
    ("utility", "tnb-bill.html"),
)

_PERSONAS: tuple[str, ...] = ("aisyah", "farhan")


def _fixture_sources() -> list[tuple[str, Path]]:
    """Expand personas × source files into `(output_filename, html_path)` pairs."""
    pairs: list[tuple[str, Path]] = []
    for persona in _PERSONAS:
        persona_dir = DEMO_DIR / persona
        for out_suffix, html_filename in _PERSONA_SOURCE_NAMES:
            pairs.append(
                (
                    f"{persona}-{out_suffix}.pdf",
                    persona_dir / html_filename,
                )
            )
    return pairs


def _render_fixture(html_path: Path, out_path: Path) -> None:
    html_content = html_path.read_text(encoding="utf-8")
    HTML(string=html_content, base_url=str(html_path.parent)).write_pdf(str(out_path))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = _fixture_sources()
    for filename, html_path in sources:
        if not html_path.is_file():
            raise FileNotFoundError(f"Missing HTML source: {html_path.relative_to(REPO_ROOT)}")
        out_path = OUT_DIR / filename
        _render_fixture(html_path, out_path)
        size_kb = out_path.stat().st_size / 1024
        print(f"  wrote {out_path.relative_to(REPO_ROOT)} ({size_kb:.1f} KB)")
    print(f"Generated {len(sources)} synthetic demo PDFs into {OUT_DIR.relative_to(REPO_ROOT)}/")


if __name__ == "__main__":
    main()
