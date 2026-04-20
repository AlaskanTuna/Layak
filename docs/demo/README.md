# Synthetic demo documents

Three self-contained HTML files styled to look like the documents Aisyah
uploads in the Layak demo:

- `mykad.html` — Malaysian MyKad identity card (85.6 × 54 mm)
- `grab-earnings.html` — Grab Monthly Earnings Statement (A4)
- `tnb-bill.html` — Tenaga Nasional Berhad electricity bill (A4)

## Render to PDF

The files are static and inline-styled, no build step. They live beside
this README in `docs/demo/`, so you can open them directly from the
workspace or point any local static server at this folder.

- [mykad.html](mykad.html)
- [grab-earnings.html](grab-earnings.html)
- [tnb-bill.html](tnb-bill.html)

In Chrome: open the HTML file → **Cmd/Ctrl + P** → **Save as PDF** →
Destination `Save as PDF`. Each file declares its own `@page` size (card
for MyKad, A4 for the others), so a single print-to-PDF pass produces a
correctly sized demo PDF.

Chrome print-dialog settings to set on every doc:

- **More settings** → uncheck **Headers and footers** (otherwise Chrome
  stamps the file URL on the PDF).
- **Margins**: `None` or `Default` (each doc declares its own `@page
margin`, so Chrome's outer margin is redundant).
- **Background graphics**: on — the coloured headers / accents rely on it.
- **Scale**: `Default`.

For the MyKad specifically, set `Paper size` → `Custom` → `85.6 × 54 mm`.
Chrome on Mac and Windows both support custom sizes in the native print
dialog; if your printer driver blocks the custom size, fall back to Chrome
headless:

```sh
google-chrome \
  --headless --disable-gpu \
  --print-to-pdf=mykad.pdf --no-pdf-header-footer \
  --virtual-time-budget=2000 \
  "file:///absolute/path/to/your/checkout/docs/demo/mykad.html"
```

You can also open the HTML directly via `file://`; the files don't depend
on anything Next does.

## Data fidelity

Every field pins to `backend/app/fixtures/aisyah.py`:

- Name: `AISYAH BINTI AHMAD`
- IC: `900324-06-4321` (last four = `4321`, invariant)
- Monthly income: `RM2,800` (Grab net payout — hard target)
- Address: identical across MyKad and TNB (`No. 42, Jalan IM 7/10, Bandar
Indera Mahkota, 25200 Kuantan, Pahang`)
- Form type: `Form B` (self-employed)

The address cross-check is the signal the `classify` agent step uses to
confirm residence.

## Watermark — "For Demo"

Each document carries a subtle diagonal `For Demo` watermark at ~7% red
alpha. The earlier `SYNTHETIC — FOR DEMO ONLY` band at 22% alpha was
**hostile to vision models** — Gemini 2.5 Flash's extraction step couldn't
read the data beneath it reliably. The lighter watermark still signals
non-authenticity to a human viewer while leaving the text fully OCR-able.

Pitch deck slide 1 must still disclose that the demo documents are
synthetic (cross-referenced in `docs/trd.md` §9.6).

## Legal and safety relaxations (PO1 decision, disclosed)

Relative to `.claude/CLAUDE.md` Critical Do-Nots and the original
`docs/mockgen.md` brief, the following relaxations apply so the documents
are realistic enough for Gemini multimodal extraction to parse reliably:

- **Chip graphic on MyKad** — a stylised gold rectangle with suggested
  contact lines, clearly a visual stand-in (not a reproduction of a real
  MyKad chip pattern or security feature).
- **Stylised Malaysian flag accent on MyKad** — simplified red/white
  stripes + blue canton with a star character. Not pixel-accurate to the
  Jalur Gemilang; used as a stylistic badge alongside the "MyKad" word.
- **Holographic "MyKad" text pattern** — decorative diagonal text at 12%
  navy alpha across the card background. Stands in for the moiré
  holographic foil on a real MyKad without reproducing any real security
  feature.
- **Regular-weight body text** — body copy uses `font-weight: 400–500`
  rather than 700–900 so Gemini vision doesn't get confused by ultra-bold
  rendering.

What is **still** off-limits: the Malaysian coat of arms (Jata Negara),
any reproduction of real holographic microtext, any chip that could
mechanically pass as a real MyKad chip, real logos / photography /
copyrighted artwork belonging to Grab or TNB. The Grab logo is a stylised
green "Grab" wordmark with a swoosh accent; the TNB brand mark is a plain
green "T" square — neither is a trace or redraw of the real logo.

## Known synthetic-provenance drift (intentional, disclosed)

Two fields deliberately diverge from their real-world conventions because
they are pinned by the fixture and changing them would ripple through
tests, doc anchors, and rule-engine citations:

- **Gender parity vs IC last digit.** Real MyKad convention encodes gender
  in the last digit of the IC (even = female, odd = male). `4321` ends in
  `1` (male-coded) but the MyKad carries Aisyah's name. The `4321`
  last-four is fixture-locked (`backend/app/fixtures/aisyah.py`:
  `ic_last4="4321"`) and rippling a flip would touch 20+ test and doc
  references. Noted here so a viewer who spots the mismatch can see it is
  intentional.
- **Age vs DOB.** MyKad's IC prefix `900324-…` implies a 24 Mar 1990 DOB
  per `docs/mockgen.md`. At "demo now" of 21 Apr 2026 Aisyah would be
  **36**, but the fixture and every persona reference in `docs/prd.md` /
  `docs/roadmap.md` / `docs/project-idea.md` say **34**. The IC and the
  age are each locked by different sources; the drift is synthetic-only
  and never enters the rule engine (rules read dependant ages and income,
  not `profile.age`).
