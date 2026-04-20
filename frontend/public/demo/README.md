# Synthetic demo documents

Three self-contained HTML files styled to look like the documents Aisyah
uploads in the Layak demo:

- `mykad.html` — Malaysian MyKad identity card (85.6 × 54 mm)
- `grab-earnings.html` — Grab Partner monthly earnings statement (A4)
- `tnb-bill.html` — Tenaga Nasional Berhad electricity bill (A4)

## Render to PDF

The files are static and inline-styled, no build step. Next's dev server
serves them at:

- <http://localhost:3000/demo/mykad.html>
- <http://localhost:3000/demo/grab-earnings.html>
- <http://localhost:3000/demo/tnb-bill.html>

In Chrome: open the URL → **Cmd/Ctrl + P** → **Save as PDF** → Destination
`Save as PDF`. Each file sets its own `@page` size (card for MyKad, A4 for
the others), so a single print-to-PDF pass produces a correctly sized demo
PDF with the diagonal watermark preserved.

Chrome print-dialog settings to set on every doc:

- **More settings** → uncheck **Headers and footers** (otherwise Chrome
  stamps the file URL on the PDF and partially obscures the watermark).
- **Margins**: `None` or `Default` (each doc declares its own `@page
  margin`, so Chrome's outer margin is redundant).
- **Background graphics**: on — the coloured headers / watermark rely on it.
- **Scale**: `Default`.

For the MyKad specifically, set `Paper size` → `Custom` → `85.6 × 54 mm`.
Chrome on Mac and Windows both support custom sizes in the native print
dialog; if your printer driver blocks the custom size, fall back to Chrome
headless instead of guessing at a standard size:

```sh
google-chrome \
  --headless --disable-gpu \
  --print-to-pdf=mykad.pdf --no-pdf-header-footer \
  --virtual-time-budget=2000 \
  "http://localhost:3000/demo/mykad.html"
```

You can also open the HTML directly via `file://` if the Next dev server
isn't running; the files don't depend on anything Next does.

## Data fidelity

Every field pins to `backend/app/fixtures/aisyah.py`:

- Name: `AISYAH BINTI AHMAD`
- IC: `900324-06-4321` (last four = `4321`, invariant)
- Monthly income: `RM2,800` (Grab net payout — hard target)
- Address: identical across MyKad and TNB (`No. 42, Jalan IM 7/10, Bandar
  Indera Mahkota, 25200 Kuantan, Pahang Darul Makmur`)
- Form type: `Form B` (self-employed)

The address cross-check is the signal the `classify` agent step uses during
Phase 1 Task 3 to confirm residence.

## Legal and safety

All three files carry the `SYNTHETIC — FOR DEMO ONLY` watermark, repeated
diagonally so reasonable crops can't hide it. They are PDPA 2010 / NRR 1990
compliant under `docs/prd.md` §6.2 / §7 and `docs/trd.md` §9.6 because:

- No replication of the Malaysian coat of arms, holographic foil, chip
  contacts, or any MyKad security feature — stylised text header and
  clearly-fictional layout only.
- No real Grab or TNB logos, photography, or copyrighted artwork — stylised
  house-brand typography only. The Grab name and emerald, and the TNB name
  and green/yellow, are used in good-faith reference (as news outlets do)
  and clearly marked as non-genuine in each document's footer.
- No real person, trip, meter, account, or bank information — every value
  is fictional.
- JomPAY biller code `9191` is a public identifier published on
  [tnb.com.my](https://www.tnb.com.my), not a secret; it's present as an
  interoperability reference only, no real payment is routed.

Pitch deck slide 1 must also disclose that the demo documents are synthetic
(cross-referenced in `docs/trd.md` §9.6).

## Known synthetic-provenance drift (intentional, disclosed)

Two fields deliberately diverge from their real-world conventions because
they are pinned by the fixture and changing them would ripple through
tests, doc anchors, and rule-engine citations:

- **Gender parity vs IC last digit.** Real MyKad convention encodes gender
  in the last digit of the IC (even = female, odd = male). `4321` ends in
  `1` (male-coded) but the MyKad shows `PEREMPUAN / FEMALE`. The `4321`
  last-four is fixture-locked (`backend/app/fixtures/aisyah.py`:
  `ic_last4="4321"`) and rippling a flip would touch 20+ test and doc
  references. Noted here so a viewer who spots the mismatch can see it is
  intentional.
- **Age vs DOB.** MyKad shows DOB `24 MAR 1990` (derived from the IC
  prefix `900324-…` per `docs/mockgen.md`). At "demo now" of 21 Apr 2026
  Aisyah would be **36**, but the fixture and every persona reference in
  `docs/prd.md` / `docs/roadmap.md` / `docs/project-idea.md` say **34**.
  The IC and the age are each locked by different sources; the drift is
  synthetic-only and never enters the rule engine (rules read dependant
  ages and income, not `profile.age`).
