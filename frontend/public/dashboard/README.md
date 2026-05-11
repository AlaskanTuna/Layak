# Dashboard tile illustrations

The `/dashboard` launcher tiles each render an optional `<img src="/dashboard/{id}.webp" />`. When a file is missing the image is hidden gracefully (`onError`) and the tile falls back to icon-only.

## Expected files

| Tile               | Path                                |
| ------------------ | ----------------------------------- |
| Start an Evaluation| `public/dashboard/start.webp`       |
| My Evaluations     | `public/dashboard/evaluations.webp` |
| Schemes Library    | `public/dashboard/schemes.webp`     |

## Style reference

Match SolarSim's 3D-illustration look (`/home/adam/CS/solar-layout-generator/frontend/public/dashboard/*.webp`):

- 3D rendered, Pixar Renderman / soft-toy aesthetic
- Cream/beige base material (matches `paper-card`)
- Single saturated accent: **hibiscus coral pink, ~#CC4A60** (Layak `--hibiscus` = `oklch(0.58 0.19 25)`)
- Pure white background (transparent if exportable)
- Soft single-direction lighting from upper-left, gentle drop shadow beneath
- 1024×1024 px, ~120 KB after webp re-encode
- No text, no logos, no Malaysian flag

## ChatGPT prompts (GPT-image-1 / DALL·E 3)

### `start.webp` — Start an Evaluation

> 3D rendered isometric illustration, Pixar Renderman style. Subject: a cream-colored manila folder, slightly opened, with three crisp white documents fanning out at the top. A coral-pink magnifying glass with a warm pink rim hovers above the documents. A small sparkle/star and a glowing coral-pink checkmark badge near the top-right of the documents. Soft, matte cream/beige tones for the folder; coral-pink (#CC4A60) as the only saturated accent color. Soft single-direction lighting from upper-left, gentle drop shadow beneath. Pure white background. 1024×1024. No text, no logos, no flags.

### `evaluations.webp` — My Evaluations

> 3D rendered isometric illustration, Pixar Renderman style. Subject: a cream-colored office filing tray (inbox) with a tidy stack of completed documents inside. Each document carries a small coral-pink checkmark stamp in its top-right corner. The topmost document is tilted slightly upward to suggest it's the most recent. Soft, matte cream/beige tones for the tray and paper; coral-pink (#CC4A60) for the checkmarks and a subtle ribbon detail on the tray's side. Soft single-direction lighting from upper-left, gentle drop shadow beneath. Pure white background. 1024×1024. No text, no logos, no flags.

### `schemes.webp` — Schemes Library

> 3D rendered isometric illustration, Pixar Renderman style. Subject: a cream-colored low bookshelf with six neatly arranged standing books, spines facing the viewer. One book is slightly pulled out and has a coral-pink ribbon bookmark sticking from the top. The books are in varied shades of cream and warm taupe, with a few featuring subtle coral-pink spine accents. Soft, matte cream/beige tones throughout; coral-pink (#CC4A60) as the only saturated accent color. Soft single-direction lighting from upper-left, gentle drop shadow beneath. Pure white background. 1024×1024. No text, no logos, no flags.

## Export workflow

1. Generate the PNG at 1024×1024 via ChatGPT.
2. Re-encode to webp (`cwebp -q 82 in.png -o out.webp` keeps files ~120 KB).
3. Drop into `frontend/public/dashboard/` with the expected filename.
4. Hard refresh; the tile picks up the asset automatically.
