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

For the MyKad, set the Chrome print dialog to:

- Paper size: **Custom** (`85.6 × 54 mm`) — or use `Layout: Default`,
  `Margins: None`, `Paper size: A7` as a close substitute if custom sizes
  aren't available.
- Scale: **Default**

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
