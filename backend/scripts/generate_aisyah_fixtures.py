"""Generate the three synthetic Aisyah PDFs from standalone HTML sources.

Each source document lives in `docs/demo/aisyah/` and is rendered directly
to `frontend/public/fixtures/`:
    aisyah-mykad.pdf    <- mykad.html
    aisyah-payslip.pdf  <- grab-earnings.html
    aisyah-utility.pdf  <- tnb-bill.html

Run:
    cd backend && source .venv/bin/activate && python scripts/generate_aisyah_fixtures.py
"""

from __future__ import annotations

from pathlib import Path

from weasyprint import HTML

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
HTML_DIR = REPO_ROOT / "docs" / "demo" / "aisyah"
OUT_DIR = REPO_ROOT / "frontend" / "public" / "fixtures"

FIXTURE_SOURCES = (
    ("aisyah-mykad.pdf", HTML_DIR / "mykad.html"),
    ("aisyah-payslip.pdf", HTML_DIR / "grab-earnings.html"),
    ("aisyah-utility.pdf", HTML_DIR / "tnb-bill.html"),
)


def _render_fixture(html_path: Path, out_path: Path) -> None:
    html_content = html_path.read_text(encoding="utf-8")
    HTML(string=html_content, base_url=str(html_path.parent)).write_pdf(str(out_path))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, html_path in FIXTURE_SOURCES:
        out_path = OUT_DIR / filename
        _render_fixture(html_path, out_path)
        size_kb = out_path.stat().st_size / 1024
        print(f"  wrote {out_path.relative_to(REPO_ROOT)} ({size_kb:.1f} KB)")
    print(f"Generated {len(FIXTURE_SOURCES)} synthetic Aisyah PDFs into {OUT_DIR.relative_to(REPO_ROOT)}/")


if __name__ == "__main__":
    main()
