"""Generate the three synthetic Aisyah documents the frontend bundles.

Outputs three PDFs into `frontend/public/fixtures/`:
    aisyah-mykad.pdf       — synthetic MyKad front
    aisyah-payslip.pdf     — Grab driver income statement (RM2,800/month)
    aisyah-utility.pdf     — TNB bill matching the address

Every page carries a "SYNTHETIC — FOR DEMO ONLY" watermark per the
project-wide privacy invariant. The IC number is fictional; no real MyKad
imagery is reproduced. Spec source: docs/superpowers/specs/aisyah-fixture.md.

Run:
    cd backend && .venv/bin/python scripts/generate_aisyah_fixtures.py
"""

from __future__ import annotations

from pathlib import Path

from weasyprint import HTML

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
OUT_DIR = REPO_ROOT / "frontend" / "public" / "fixtures"

WATERMARK_CSS = """
@page {
    size: A4;
    margin: 1.5cm;
    @top-center {
        content: "SYNTHETIC — FOR DEMO ONLY";
        color: rgba(220, 38, 38, 0.45);
        font-family: "Helvetica", sans-serif;
        font-size: 9pt;
        letter-spacing: 0.18em;
        font-weight: 700;
    }
    @bottom-center {
        content: "SYNTHETIC — FOR DEMO ONLY · Layak hackathon demo · do not submit to any agency";
        color: rgba(220, 38, 38, 0.45);
        font-family: "Helvetica", sans-serif;
        font-size: 7.5pt;
        letter-spacing: 0.14em;
    }
}
body {
    font-family: "Helvetica", "Arial", sans-serif;
    color: #111;
    font-size: 10pt;
    line-height: 1.45;
}
h1 { font-size: 18pt; margin: 0 0 4mm; letter-spacing: 0.02em; }
h2 { font-size: 12pt; margin: 6mm 0 2mm; color: #1f2937; letter-spacing: 0.04em; }
.label { color: #6b7280; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.12em; }
.value { font-weight: 600; }
.row { display: flex; justify-content: space-between; padding: 1.5mm 0; border-bottom: 1px solid #e5e7eb; }
.box { border: 1px solid #d1d5db; border-radius: 2mm; padding: 4mm; margin-top: 4mm; background: #fafafa; }
.watermark-stamp {
    position: fixed;
    top: 35%;
    left: 8%;
    transform: rotate(-22deg);
    color: rgba(220, 38, 38, 0.10);
    font-size: 70pt;
    font-weight: 800;
    letter-spacing: 0.05em;
    z-index: 0;
    pointer-events: none;
}
.content { position: relative; z-index: 1; }
table { width: 100%; border-collapse: collapse; margin-top: 4mm; }
th, td { padding: 2mm 3mm; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 9.5pt; }
th { background: #f3f4f6; color: #374151; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 8.5pt; }
.totals { background: #f9fafb; font-weight: 700; }
"""


def _page(title: str, body_html: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>{WATERMARK_CSS}</style>
</head>
<body>
<div class="watermark-stamp">SYNTHETIC</div>
<div class="content">
{body_html}
</div>
</body>
</html>
"""


def _mykad_html() -> str:
    body = """
<h1>KAD PENGENALAN</h1>
<p class="label">Government of Malaysia · Identity Card · SYNTHETIC SAMPLE</p>
<div class="box">
  <div class="row"><span class="label">Name</span><span class="value">AISYAH BINTI AHMAD</span></div>
  <div class="row"><span class="label">Identity card no.</span><span class="value">920324-09-4321</span></div>
  <div class="row"><span class="label">Date of birth</span><span class="value">24 MAR 1992</span></div>
  <div class="row"><span class="label">Place of birth</span><span class="value">PAHANG</span></div>
  <div class="row"><span class="label">Gender</span><span class="value">PEREMPUAN</span></div>
  <div class="row"><span class="label">Nationality</span><span class="value">WARGANEGARA</span></div>
  <div class="row"><span class="label">Religion</span><span class="value">ISLAM</span></div>
  <div class="row"><span class="label">Address</span><span class="value">NO 12, JALAN BUKIT SETONGKOL, 25150 KUANTAN, PAHANG</span></div>
</div>
<p class="label" style="margin-top:6mm;">This is a fabricated identity card produced for hackathon
demonstration purposes only. The IC number above is fictional and not assigned to any real person.
This document carries no holographic features, security ink, or chip data.</p>
"""
    return _page("Synthetic MyKad — Aisyah binti Ahmad", body)


def _payslip_html() -> str:
    body = """
<h1>Driver Earnings Statement</h1>
<p class="label">Grab Malaysia Sdn. Bhd. · Period: 1–31 March 2026 · SYNTHETIC SAMPLE</p>
<div class="box">
  <div class="row"><span class="label">Driver name</span><span class="value">AISYAH BINTI AHMAD</span></div>
  <div class="row"><span class="label">Driver IC (last 4)</span><span class="value">XXXX-XX-4321</span></div>
  <div class="row"><span class="label">Vehicle plate</span><span class="value">CFG 5821</span></div>
  <div class="row"><span class="label">Operating city</span><span class="value">KUANTAN, PAHANG</span></div>
</div>
<h2>Earnings summary</h2>
<table>
  <thead>
    <tr><th>Component</th><th style="text-align:right;">Amount (RM)</th></tr>
  </thead>
  <tbody>
    <tr><td>Trip earnings (162 trips)</td><td style="text-align:right;">2,420.00</td></tr>
    <tr><td>Incentives &amp; bonuses</td><td style="text-align:right;">340.00</td></tr>
    <tr><td>Tips received</td><td style="text-align:right;">85.00</td></tr>
    <tr class="totals"><td>Gross monthly income</td><td style="text-align:right;">RM 2,845.00</td></tr>
    <tr><td>Platform fee (-5%)</td><td style="text-align:right;">−45.00</td></tr>
    <tr class="totals"><td>Net payout · 31 March 2026</td><td style="text-align:right;">RM 2,800.00</td></tr>
  </tbody>
</table>
<p class="label" style="margin-top:6mm;">As a Grab driver, the named individual is classified as
self-employed for LHDN purposes (Form B). Net monthly income shown above is illustrative for the Layak
hackathon demonstration only and does not represent actual earnings of any real driver.</p>
"""
    return _page("Synthetic Payslip — Aisyah binti Ahmad", body)


def _utility_html() -> str:
    body = """
<h1>TNB Tenaga Nasional — Bil Elektrik</h1>
<p class="label">Tenaga Nasional Berhad · Bill no. 250400938421 · SYNTHETIC SAMPLE</p>
<div class="box">
  <div class="row"><span class="label">Account holder</span><span class="value">AISYAH BINTI AHMAD</span></div>
  <div class="row"><span class="label">Service address</span><span class="value">NO 12, JALAN BUKIT SETONGKOL, 25150 KUANTAN, PAHANG</span></div>
  <div class="row"><span class="label">Account no.</span><span class="value">2200 1893 4521</span></div>
  <div class="row"><span class="label">Billing period</span><span class="value">1 March 2026 – 31 March 2026</span></div>
  <div class="row"><span class="label">Meter reading</span><span class="value">186 kWh</span></div>
</div>
<h2>Charges</h2>
<table>
  <thead>
    <tr><th>Description</th><th style="text-align:right;">Amount (RM)</th></tr>
  </thead>
  <tbody>
    <tr><td>Domestic tariff Block A (1–200 kWh @ 21.8 sen)</td><td style="text-align:right;">40.55</td></tr>
    <tr><td>Service tax</td><td style="text-align:right;">2.43</td></tr>
    <tr><td>1% Kumpulan Wang Tenaga Boleh Diperbaharui (KWTBB)</td><td style="text-align:right;">0.41</td></tr>
    <tr class="totals"><td>Total payable by 21 April 2026</td><td style="text-align:right;">RM 43.39</td></tr>
  </tbody>
</table>
<p class="label" style="margin-top:6mm;">The address above is used by Layak for residency verification only.
This bill is a fabricated document for hackathon demonstration purposes; it does not represent any actual
TNB account or consumption record.</p>
"""
    return _page("Synthetic TNB Bill — Aisyah binti Ahmad", body)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    targets = [
        ("aisyah-mykad.pdf", _mykad_html()),
        ("aisyah-payslip.pdf", _payslip_html()),
        ("aisyah-utility.pdf", _utility_html()),
    ]
    for filename, html in targets:
        out_path = OUT_DIR / filename
        HTML(string=html).write_pdf(target=str(out_path))
        size_kb = out_path.stat().st_size / 1024
        print(f"  wrote {out_path.relative_to(REPO_ROOT)} ({size_kb:.1f} KB)")
    print(f"Generated {len(targets)} synthetic Aisyah PDFs into {OUT_DIR.relative_to(REPO_ROOT)}/")


if __name__ == "__main__":
    main()
