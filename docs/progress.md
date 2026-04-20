# PROGRESS (AGENT ONLY)

> Refer to `docs/plan.md` when recording completed tasks.

---

## [21/04/26] - Scaffolded Phase 1 Task 3 Path 1: 5-step orchestration with stub tools and Vertex AI Search seed skeleton

Path 1 per the CLAUDE.md "no Gemini or Vertex AI call until sprint start" guardrail — the 5-tool ADK shell + seed-script skeleton lands tonight; real Gemini Flash/Pro wiring + live Discovery Engine indexing lands in Path 2 at sprint start.

- **Three new FunctionTool stubs** under `backend/app/agents/tools/`:
  - `classify.py` — `classify_household(profile) -> HouseholdClassification`. Derives `has_children_under_18`, `has_elderly_dependant`, `income_band` from `profile.household_flags`, computes per-capita RM from `monthly_income_rm / household_size`, emits five human-readable `notes` (household size, per-capita, filer category, child count, elderly dependant count). Task 3 Path 2 swaps this for a Gemini 2.5 Flash structured-output call.
  - `compute_upside.py` — `compute_upside(matches) -> ComputeUpsideResult`. Synthesises a syntactically-valid Python snippet + its stdout deterministically from the `SchemeMatch` list. The snippet assigns `{scheme_id} = {int(annual_rm)}`, sums to `total`, then prints a left-aligned two-column table (scheme name + annual RM). Aisyah's stub run produces the expected 55-char-wide table ending `Total upside (annual) 8,208`. Task 3 Path 2 swaps the stub for Gemini 2.5 Pro with the Code Execution tool bound; the output payload shape (`python_snippet`, `stdout`, `total_annual_rm`, `per_scheme_rm`) stays identical so the frontend's `<pre>`-block renderer doesn't move.
  - `generate_packet.py` — `generate_packet(profile, matches) -> Packet`. Returns one `PacketDraft` per qualifying match, filename slugged by `profile.ic_last4` (never full IC, per NFR-3). Filename templates: `BK-01-STR2026-draft-{ic_last4}.pdf` / `JKM18-warga-emas-draft-{ic_last4}.pdf` / `LHDN-form-b-relief-summary-{ic_last4}.pdf`. `blob_bytes_b64` stays `None` until Phase 1 Task 5 lands WeasyPrint.
- **Expanded `backend/app/agents/root_agent.py`** from 2 to 5 FunctionTool instances and 5 `LlmAgent` placeholder sub-agents (`extractor_stub`, `classifier_stub`, `matcher_stub`, `upside_computer_stub`, `packet_generator_stub`). Each placeholder's `description` names the target Gemini model + tool binding for Task 3 Path 2 (e.g., "Gemini 2.5 Pro with code_execution" for upside_computer) so the swap is mechanical. The `stream_agent_events()` orchestrator now emits all 5 step pairs in order (`extract → classify → match → compute_upside → generate → done`) with 0.25 s inter-step delay so the frontend stepper animates visibly even in stub mode.
- **New `backend/scripts/seed_vertex_ai_search.py`** (238 lines). Dry-run default (runs in <1 s, no API calls, reports what would happen); real mode via `--execute`. Creates/reuses Discovery Engine data store `layak-schemes-v1` in `global` (v1 API restriction — `asia-southeast1` isn't offered for data stores, documented in the script docstring; Cloud Run stays in `asia-southeast1`). Uploads all 6 PDFs inline as raw_bytes (~4.12 MB total, well under the 10 MB/doc and ~60 MB inline-import caps), uses `ReconciliationMode.INCREMENTAL` for idempotent re-runs. Three canary queries defined: `STR 2026 household with children income threshold` → `risalah-str-2026.pdf`; `JKM Warga Emas per capita income means test` → `jkm18.pdf`; `LHDN individual relief RM9,000 Form B` → `pr-no-4-2024.pdf`. Run deferred to Path 2; dry-run verified tonight.
- **SSE contract end-to-end smoke** on `uvicorn --port 8082`: **11 events in 1.35 s** (target was 11 = 5 × `step_started` + 5 × `step_result` + 1 × `done`). `classify` payload emits `per_capita_monthly_rm=700` + 5 notes; `compute_upside` payload emits a formatted 8-line stdout ending `Total upside (annual) 8,208`; `generate` payload emits 3 filename-only drafts slugged by `4321`. Deterministic per-step ordering, JSON wire shape identical to what Path 2 will emit.
- **Verification**: ruff `check` clean across 26 files, ruff `format --check` clean, **pytest 39 passed in 2.75 s** (Task 4 suite intact — no regressions from the tool additions). Dry-run `seed_vertex_ai_search.py` succeeds and lists all 6 PDFs + 3 canaries.
- **Not done in Path 1 (intentional, handled in Path 2 at sprint start)**: real Gemini 2.5 Flash/Pro calls, live Vertex AI Search indexing, Discovery Engine API enablement on GCP project, `VERTEX_AI_SEARCH_DATA_STORE` populated in `.env`, the hour-12 Plan B collapse decision (not triggered yet since real VAIS hasn't been attempted).

---

## [21/04/26] - Demo-docs audit fixes: watermark opacity, README Chrome guide, provenance-drift disclosure

Three parallel subagent audits (legal compliance, fixture-data fidelity, print-to-PDF fidelity) on commit `d6b1664` returned actionable findings. Fixed here.

- **A4 watermark opacity** — bumped `rgba(196, 30, 58, 0.14)` → `rgba(196, 30, 58, 0.22)` on both `grab-earnings.html` and `tnb-bill.html`. The 0.14 alpha would have reduced to ~11% grey luminance on a B/W printer (invisible); 0.22 survives grayscale. Also shifted the `.wm.top` / `.wm.mid` rows from `22%`/`52%` to `28%`/`55%` so the rotated watermarks clip symmetrically rather than the top band being half-hidden by page overflow.
- **README Chrome print guide** — dropped the A7 fallback line (A7 = 74 × 105 mm, not a "close substitute" for the 85.6 × 54 mm MyKad; misleading advice). Replaced with explicit Chrome print-dialog settings (uncheck `Headers and footers`, set `Margins: None`, leave `Background graphics: on`) and a copy-pasteable `google-chrome --headless --print-to-pdf` command as the deterministic fallback. Also noted that `file://` works if Next's dev server isn't running.
- **Intentional provenance drift** — added a "Known synthetic-provenance drift (intentional, disclosed)" section to `frontend/public/demo/README.md` documenting two issues an observant viewer would spot:
  1. MyKad shows `PEREMPUAN / FEMALE` but IC last digit `1` is odd (male-coded under real MyKad convention). The `4321` last-four is fixture-locked (`backend/app/fixtures/aisyah.py`); flipping would ripple through 20+ test + doc references. Disclosed rather than flipped.
  2. MyKad DOB `24 MAR 1990` derived from IC prefix makes Aisyah 36 at the demo's "now" (21 Apr 2026), but the fixture + `docs/prd.md` / `docs/roadmap.md` / `docs/project-idea.md` all say age 34. The IC and the age each come from separately-locked sources; the drift is synthetic-only and never enters the rule engine (rules use dependant ages and income, not `profile.age`). Disclosed rather than reconciled.
- **Not addressed** (audit flagged but cosmetic): minor A4 overflow headroom on `grab-earnings.html` and `tnb-bill.html` — each leaves 15–40 mm of page-2 safety margin, fine for current content; `address plausibility` (real-street + arbitrary house number pattern) — standard synthetic-persona practice and borderline under PDPA, documented in `docs/trd.md` §9.6 already.
- **Verification:** `pnpm -C frontend build` still passes (static `public/` assets don't hit the compile graph); `pytest -q` in `backend/` passes all 39 tests.

---

## [21/04/26] - Added three synthetic Aisyah demo documents (MyKad, Grab earnings, TNB bill) closing TRD §9.6

Independent PO1 task from `docs/mockgen.md`. Three self-contained HTML files at `frontend/public/demo/` styled to look like the documents Aisyah uploads during the demo, plus a render guide.

- `frontend/public/demo/mykad.html` — 85.6 × 54 mm (ISO/IEC 7810 ID-1) via `@page`. Off-white `#f5f3ed` with Pahang-green `#006c35` top border; photo placeholder + signature strip + IC (monospace), name, citizenship, gender (PEREMPUAN / FEMALE), DOB 24 MAR 1990, and the shared address. Stylized "MyKad · KAD PENGENALAN MALAYSIA" text header — **no coat of arms, holographic foil, or chip contacts** (Critical Do-Nots compliance). Three diagonal `SYNTHETIC — FOR DEMO ONLY` watermarks at 22 / 50 / 78% card-height so any reasonable crop still shows one.
- `frontend/public/demo/grab-earnings.html` — A4 portrait, emerald `#00b14f` Grab-ish accent, stylised `g` monogram in place of the real logo. Partner block (AISYAH BINTI AHMAD, Partner ID `KTN-GRAB-38271`, GrabCar Saver, Maybank ••••8276, Kuantan zone, Gold tier), 6-row earnings table totalling **Net payout RM2,800.00** = `monthly_income_rm` in the fixture. Statement period 1–31 March 2026, issued 31 March 2026, next statement 30 April 2026. Tax-note callout points the user at LHDN Form B filing by 30 June 2026 (YA 2025). Three watermarks at 22 / 52 / 82% page-height.
- `frontend/public/demo/tnb-bill.html` — A4 portrait, TNB green `#00793f` + yellow `#fcd116`, stylised `T` monogram. Customer block pins the identical address to the MyKad (the residence cross-check the classify step uses), account `082-0012-3456`, tariff Domestic (A) single-phase. Billing period 01-03-2026 → 31-03-2026, issue 05 April 2026, due **30 April 2026**. Consumption block: prev 4,218 → curr 4,501 kWh = 283 kWh, first 200 @ RM0.218 (RM43.60), next 83 @ RM0.334 (RM27.72), subtotal RM71.32, KWTBB 1.6% RM1.14, **Amount due RM72.46**. JomPAY panel with real public biller code `9191`, synthetic references, QR placeholder. Three watermarks at the same 22 / 52 / 82% heights.
- `frontend/public/demo/README.md` — one-paragraph render guide (open in Chrome → Cmd+P → Save as PDF; custom paper size for the MyKad; A4 for the rest), plus the data-fidelity table and the legal-safety reasoning that each file stays PDPA 2010 / NRR 1990 compliant.
- **No React-tree churn, no deps installed, no configs touched.** Static assets under `public/` are served as-is by Next.
- Sanity-check: `pnpm -C frontend build` still passes (static `public/` files don't enter the compile graph).
- Closed `docs/trd.md` §9.6 open question with a RESOLVED marker pointing at `frontend/public/demo/`. Note inside: the original plan said "payslip (EA Form/CP8A)" but Aisyah is a Form B gig worker — an EA Form would misrepresent her filer category, so `grab-earnings.html` replaces it. The net payout still ties to `monthly_income_rm`.
- IC number quirk flagged by the brief (last digit even = female, `4321` ends in 1 → male-coded): preserved intentionally because the `ic_last4 = "4321"` value is fixture-locked across backend tests and the rule engine. Rippling a change across both sides of the codebase would cost more than the synthetic mismatch risks.

---

## [20/04/26] - Fixed LHDN §6.20 → §6.19 miscitation and tightened rule-engine test coverage from audit findings

Post-commit subagent audits (rule correctness, test coverage, plan.md adherence) surfaced three real issues in the rule engine. All fixed here.

- **Fix 1 — wrong PR section.** `backend/app/rules/lhdn_form_b.py` previously cited `PR 4/2024 §6.20 (doc p.47)` for the EPF + life-insurance combined RM7,000 cap. §6.20 is actually "Premium for insurance on education or for medical benefits" (pypdf p.56, doc p.53). The correct section is **§6.19** — "Deduction for insurance premiums/Takaful contribution and contribution to an approved scheme" (pypdf p.49, doc p.46), with the YA2023+ table on pypdf p.50 (doc p.47).
- **Fix 2 — wrong individual-category passage.** The citation passage quoted the now-deleted public-servant flat RM7,000 rule under §49(1A)(c), which was struck by Act 845 effective YA2023. For non-public-servant individuals like Aisyah (Form B self-employed), §6.19.3 splits the relief into **RM3,000 for life insurance under §49(1)(a)** plus **RM4,000 for EPF under §49(1)(b)**. New constants `LIFE_INSURANCE_CAP_RM = 3000.0` and `EPF_CAP_RM = 4000.0` expose the split; `EPF_LIFE_17_COMBINED_CAP_RM` is now derived as their sum so Aisyah's numeric saving (RM558) is unchanged but the provenance is accurate.
- **Tightened test coverage.** Added five new tests in `backend/tests/`:
  - `test_epf_life_sub_caps_on_pr_s6_19_3_doc_p47` — asserts both RM3,000 and RM4,000 sub-caps appear on pypdf p.50 alongside `§49(1)(a)` and `§49(1)(b)`.
  - `test_combined_epf_life_equals_sum_of_sub_caps` — guards against drift between the combined public-facing cap and the two split caps.
  - `test_pr_s6_19_heading_not_s6_20` — regression guard against the miscitation: asserts §6.19 heading is on pypdf p.49 and §6.20 heading on pypdf p.56.
  - `test_aisyah_triggers_all_five_reliefs_with_gazetted_caps` (replaces the key-only assertion) — asserts each of the five reliefs returns its exact gazetted cap (9,000 / 8,000 / 4,000 / 7,000 / 2,500).
  - `test_no_parent_dependant_drops_parent_medical` — profiles without a parent dependant do not get the parent-medical cap and do not get child_16a; only `{individual, lifestyle_9, epf_life_17}` remain.
  - `test_income_exactly_5000_is_inclusive` + `test_income_exactly_2500_is_band_1` — STR band-boundary inclusivity tests (band ceilings are ≤ per risalah "RM2,501-RM5,000").
- **Pytest: 39 passed in 2.71 s.** Ruff `check` and `format --check` clean across 23 files. Aisyah combined total unchanged at **RM8,208/yr**.

Findings the audit flagged that were **not** acted on (cosmetic or external to PDF-grounding contract):

- `SUPPORTED_YA = "ya_2025" ; if SUPPORTED_YA != "ya_2025": raise ImportError(...)` — audit called this "dead code". Intent of the guard is to catch silent edits (change the constant → module fails to import), which it does under that specific edit path; left as documented dormant-by-design.
- JKM Warga Emas citations use `source_pdf="jkm18.pdf"` for the RM1,236 food-PLI and RM600 Budget-2026 rate even though those specific numbers are external to jkm18.pdf (DOSM and Budget speech respectively). The `passage` and `page_ref` fields honestly label the external references; this is a nominal grounding that the frontend can render truthfully. Noted for PO2 to design the provenance panel UI around.

---

## [20/04/26] - Encoded STR / JKM Warga Emas / LHDN Form B rule engine with PDF-grounded unit tests (plan.md Phase 1 Task 4)

- Added `backend/app/rules/` with three scheme modules, each exposing a `match(profile) -> SchemeMatch` entry point and sharing a common `RuleCitation`-populated provenance surface:
  - `str_2026.py` — household-with-children tier table transcribed from `risalah-str-2026.pdf` p.2 (`Nilai Bantuan STR & SARA 2026`). Two income bands (≤RM2,500 and RM2,501–5,000) × three child-count buckets (1–2, 3–4, ≥5). Bucket-0 values are preserved in the dict so the unit test can assert every PDF cell resolves, but `match()` only qualifies profiles with ≥1 child under 18 AND income ≤RM5,000. Returns STR only — SARA is out-of-scope per `docs/prd.md §6.2`.
  - `jkm_warga_emas.py` — per-capita means test `monthly_income / household_size ≤ FOOD_PLI_RM 1,236` (DOSM 2024) combined with `WARGA_EMAS_AGE_THRESHOLD = 60` applied against `dependants[].relationship == "parent"`. Rate constants: `WARGA_EMAS_MONTHLY_RM = 600` (Budget 2026) with `WARGA_EMAS_FALLBACK_MONTHLY_RM = 500` kept per `docs/trd.md §9.5`. Annual payout: `600 × 12 = RM7,200`.
  - `lhdn_form_b.py` — five YA2025 relief caps transcribed from `pr-no-4-2024.pdf` (PR 4/2024, 27 Dec 2024): individual RM9,000 (§6.1 doc p.9, ITA §46(1)(a)), parent medical RM8,000 (§6.2.1 doc p.9, ITA §46(1)(c)), child #16a RM2,000 per unmarried child under 18 (§6.18.2(a) doc p.41, ITA §§48(1)(a)/48(2)(a)), EPF + life insurance RM7,000 combined (§6.20 doc p.47, ITA §49(1)(a)), lifestyle #9 RM2,500 (§6.11.3 doc p.29). Tax saving computed by bracketing the annual income through `_malaysia_tax_ya2025()` (YA2025 Schedule 1 ITA brackets) with and without reliefs; delta is the user-facing upside. Form B deadline 30 June 2026 cited from `rf-filing-programme-for-2026.pdf` doc p.2 Example 2. Module rejects `SUPPORTED_YA != "ya_2025"` at import via an `if/raise ImportError` guard so editing the year without refreshing caps fails loud.
- Citations (`app/schema/scheme.py → RuleCitation`): field is `passage` per `docs/trd.md §3`; `docs/plan.md` Task 4 calls it `passage_anchor` — same concept, different name across the two docs. Every citation carries `rule_id`, `source_pdf`, `page_ref` (document-labelled page, not pypdf index), `passage`, and a canonical `source_url`.
- Aisyah rule-engine totals (smoke-tested end-to-end through the SSE endpoint): **STR RM450 + JKM Warga Emas RM7,200 + LHDN Form B RM558 = RM8,208/yr**, clearing the `docs/plan.md` ≥RM7,000 headline target with RM1,208 of margin.
- Wired `backend/app/agents/tools/match.py` to delegate to the rule engine (plan.md Task 4 exit criterion): composes the three `match(profile)` calls, filters non-qualifying matches out, sorts descending by `annual_rm` so the highest-upside scheme renders first in the frontend ranked list (FR-6).
- Made `backend/app/fixtures/aisyah.py` a live computation rather than a static list: `AISYAH_SCHEME_MATCHES` is now populated by `_compute_aisyah_matches()` at module load, so fixture and engine output cannot drift. The previous Task 1 hand-written matches (STR RM1,200 / LHDN RM1,008) were superseded by the engine's grounded values.
- Added `backend/tests/` with `conftest.py` (session-scoped `pdf_text` fixture that `pypdf`-extracts all six cached scheme PDFs into `{pdf_name → {pypdf_page_index: text}}`) plus three test modules (`test_str_2026.py`, `test_jkm_warga_emas.py`, `test_lhdn_form_b.py`). **34 tests pass in 2.75 s.** Every relief cap constant has a paired test asserting the RM value appears verbatim on its cited page, and every scheme has an Aisyah-vs-expected match test plus a non-qualifying edge case.
- Added `pypdf>=5.0` to `[project.optional-dependencies].dev` in `backend/pyproject.toml` (installed version `pypdf 6.10.2`). Test-only dep; does not enter the Cloud Run image.
- Post-Task-4 SSE smoke test (uvicorn `127.0.0.1:8081`): 5 events in 576 ms. The `step_result {step: "match"}` payload now emits three real `SchemeMatch` objects produced by the rule engine, sorted descending by `annual_rm`, each with populated `rule_citations`.
- Ruff `check` and `format --check` clean across 23 app + test files.

---

## [20/04/26] - Scaffolded backend: Pydantic schemas, FastAPI SSE endpoint, ADK SequentialAgent with 2 stub FunctionTools

- Installed Python 3.12.8 user-scope at `C:\Users\User\AppData\Local\Programs\Python\Python312` (TRD §6.3 pins 3.12; only 3.10 was present locally). Backend venv at `backend/.venv/`, gitignored via the existing `.venv/` rule (`.gitignore` line 133).
- Declared deps in `backend/pyproject.toml`: `fastapi>=0.115`, `uvicorn[standard]>=0.30`, `pydantic>=2.7`, `python-multipart>=0.0.9`, `google-adk>=1.31,<1.32`, `google-genai>=1.0`. Optional `dev` extras: `pytest`, `pytest-asyncio`, `httpx`, `ruff`. Installed versions landed at `google-adk 1.31.0`, `google-genai 1.73.1`, `fastapi 0.136.0`, `pydantic 2.13.2`, `uvicorn 0.44.0`.
- Wrote Pydantic v2 schemas under `backend/app/schema/`: `profile.py` (`Profile`, `Dependant`, `HouseholdFlags`, `HouseholdClassification`, `FormType`, `IncomeBand`, `Relationship`), `scheme.py` (`SchemeMatch`, `RuleCitation`, `SchemeId`), `packet.py` (`Packet`, `PacketDraft`), `events.py` (`StepStartedEvent`, `StepResultEvent`, `DoneEvent`, `ErrorEvent`, `ExtractResult`, `ClassifyResult`, `MatchResult`, `ComputeUpsideResult`, `GenerateResult`, discriminated `AgentEvent`). Every model uses `ConfigDict(extra="forbid")`. Privacy invariant enforced at the schema level — `Profile.ic_last4` is `Field(pattern=r"^\d{4}$")`, the only IC representation that may leave request-scope memory (NFR-3).
- Locked SSE wire shape with `type` discriminator: `{"type":"step_started","step":...}`, `{"type":"step_result","step":...,"data":...}`, `{"type":"done","packet":...}`, `{"type":"error","step":...,"message":...}`. Documented at the top of `backend/app/schema/events.py` and `backend/app/main.py` so PO2's frontend SSE consumer reads the exact format.
- Wrote the two stub FunctionTools under `backend/app/agents/tools/`: `extract.py` (`extract_profile(ic_bytes, payslip_bytes, utility_bytes) -> Profile`) and `match.py` (`match_schemes(profile) -> list[SchemeMatch]`). Both return the canned Aisyah fixture regardless of input. Real Gemini 2.5 Flash wiring lands in Phase 1 Task 3; real rule engine lands in Task 4.
- Wrote canned fixture at `backend/app/fixtures/aisyah.py` — `AISYAH_PROFILE` (Form B filer, RM2,800/mo, 2 children under 18, father age 70) and `AISYAH_SCHEME_MATCHES` (STR 2026 RM1,200, JKM Warga Emas RM7,200, LHDN Form B five-relief tax delta RM1,008 → total RM9,408/yr, clears plan.md Task 4 headline ≥RM7,000/yr). Every `SchemeMatch` carries ≥1 `RuleCitation` pointing at one of the six committed PDFs under `backend/data/schemes/`.
- Wrote `backend/app/agents/root_agent.py`: 2 `FunctionTool` instances wrapping the stubs, a `SequentialAgent` shell (`layak_root_agent`) with 2 placeholder `LlmAgent` sub-agents (no `model` set — structural stand-ins for Task 3's Gemini-backed replacements), and `stream_agent_events()` — a direct async orchestrator that bypasses `SequentialAgent.run_async()` and yields ordered SSE events from the stubs. Task 3 swaps this for the real ADK runner.
- Wrote `backend/app/main.py` with `POST /api/agent/intake` (multipart `ic` + `payslip` + `utility`) streaming SSE via `StreamingResponse` with `Cache-Control: no-cache`, `X-Accel-Buffering: no`. CORS pinned to `http://localhost:3000` for dev wiring against the frontend Next.js origin. Also added `GET /healthz`.
- Used `Annotated[UploadFile, File()]` instead of default-arg `File(...)` to satisfy `ruff B008` while keeping FastAPI's multipart detection.
- **Ruff: `check` clean, `format --check` clean** across the 14 app files.
- **Smoke test passed: 5 SSE events in 573 ms** (target ≥4 events in <3 s). Sequence: `step_started(extract)` → `step_result(extract, profile=Aisyah)` → `step_started(match)` → `step_result(match, 3 SchemeMatch)` → `done(empty Packet)`. Endpoint closes cleanly.
- Deferred to matching tasks: `classify_household`, `compute_upside`, `generate_packet` tools (Task 3 / 5); `app/rules/` module (Task 4); WeasyPrint deps (Task 5); Dockerfile + Cloud Run deploy (Task 6).

---

## [20/04/26] - Added indexed tables of contents to PRD and TRD

- Added linked tables of contents to `docs/prd.md` and `docs/trd.md` so the section structure is easier to scan and jump between.
- Kept the existing content unchanged; this was a navigation-only docs update.

---

## [20/04/26] - Committed scheme source PDFs

- Downloaded 6 of 6 PDFs into `backend/data/schemes/` (committed via `9138113` with scaffold filenames; renamed to lowercase kebab-case in a follow-up commit): `risalah-str-2026.pdf` (533 KB), `bk-01.pdf` (418 KB), `jkm18.pdf` (1.1 MB), `pr-no-4-2024.pdf` (524 KB), `explanatory-notes-be2025.pdf` (846 KB), `rf-filing-programme-for-2026.pdf` (557 KB).
- Each verified: size ≥ 1 KB, `%PDF` magic header confirmed on all six files.
- Removed placeholder `backend/data/schemes/.gitkeep`.
- No URLs failed; all six `gov.my` / `hasil.gov.my` / `jkm.gov.my` endpoints responded HTTP 200 without bot-blocking.

---

## [20/04/26] - Refactored into frontend/ + backend/ pnpm workspace

- Moved the Next.js scaffold from repo root into `frontend/` as a pnpm workspace package `layak-frontend`. Preserved git rename history via `git mv`. Files moved: `src/`, `public/`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `AGENTS.md`, `.env.example`, `next-env.d.ts`.
- Created `backend/` skeleton with `data/schemes/.gitkeep`, `scripts/.gitkeep`, and a `README.md` pinning the Phase 1 layout from `docs/trd.md` (FastAPI + ADK-Python + WeasyPrint, stateless, repo-is-the-bucket).
- Split `package.json`: root is now a thin workspace orchestrator (husky, lint-staged, prettier, prettier-plugin-tailwindcss, concurrently); `frontend/package.json` keeps all Next.js / React / Tailwind / shadcn deps. Root scripts forward via `pnpm -C frontend <cmd>` for dev, build, start, lint.
- Created root `pnpm-workspace.yaml` listing `frontend` as the workspace package; moved `ignoredBuiltDependencies` (sharp, unrs-resolver) here and deleted the scaffold-shipped nested `frontend/pnpm-workspace.yaml`.
- Deleted root `pnpm-lock.yaml` + `node_modules/`; reran `pnpm install` at root to regenerate a single workspace lockfile.
- Deleted the root `CLAUDE.md` shipped by the Next.js scaffold (1-liner `@AGENTS.md`) — redundant with `.claude/CLAUDE.md`. `AGENTS.md` moved into `frontend/` where its Next.js 16 warning is properly scoped.
- Updated `.husky/pre-commit` to run `pnpm -C frontend lint-staged` (ESLint on frontend ts/tsx) followed by `pnpm lint-staged` (Prettier on root docs).
- Verified `pnpm run lint` and `pnpm run build` still pass via the workspace forward. Noted that the bare `pnpm lint` hits a pnpm v10 workspace shortcut that bypasses our script — canonical invocation is `pnpm run lint`.
- Updated `docs/trd.md` §6.3 (current versions), §6.4 (repo layout diagram), §9.4 (closed the backend-layout open question); updated `.claude/CLAUDE.md` Architecture, Tech Stack paths, Commands block, Code Style paths.
- Pinned workspace TypeScript in `.vscode/settings.json` (`typescript.tsdk: "frontend/node_modules/typescript/lib"`, `enablePromptUseWorkspaceTsdk: true`) so VSCode users see the workspace's `typescript@5.9.3` instead of the editor's bundled version. First time VSCode opens a `.ts` file it prompts to switch — accept once.

---

## [20/04/26] - Scaffolded Next.js 16 frontend tooling

- Scaffolded Next.js 16.2.4 + React 19.2.4 + Tailwind 4.2.2 + ESLint 9 flat config into the repo via a temp-dir merge (preserved `docs/`, `.claude/`, `.git/`, existing `.prettierrc`/`.prettierignore`/`README.md`). Renamed package to `layak`; dropped legacy `.eslintrc.cjs` and `src/.gitkeep`.
- Installed `lucide-react`, Husky (9.1.7) with pre-commit `pnpm lint-staged`, lint-staged (16.4.0), `prettier-plugin-tailwindcss`, and scaffold defaults.
- Ran `pnpm dlx shadcn@latest init -d` (Tailwind 4 auto-detected, `base-nova` preset) and added 12 shadcn components: alert, badge, button, card, dialog, input, label, progress, separator, sonner, tabs, textarea. `toast` is deprecated in favour of `sonner`; `form` wrapper component did not land under the base-nova preset — react-hook-form + @hookform/resolvers + zod installed for manual composition.
- Configured webpack HMR polling in `next.config.ts` (poll=800ms, aggregateTimeout=300ms, ignore `node_modules`); forced `--webpack` in dev/build scripts so WSL polling runs. Next.js 16 defaults to Turbopack; we keep Turbopack as a one-flag-flip option if polling becomes unnecessary.
- Added `.env.example` with `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `VERTEX_AI_SEARCH_DATA_STORE` placeholders. Existing `.gitignore` already covers `.env`/`.next/`/`node_modules/`/etc. and keeps `.claude/` tracked.
- Replaced scaffold default `src/app/page.tsx` with a 27-line Layak stub (shadcn Card + disabled Lucide Play-icon button). Updated `layout.tsx` metadata title/description.
- `pnpm lint` clean. `pnpm build --webpack` clean — two routes prerendered static (`/`, `/_not-found`).
- Updated `docs/prd.md`, `docs/trd.md`, and `.claude/CLAUDE.md` to reflect the Next.js 16 / React 19 / Tailwind 4 / ESLint 9 stack bump (kickoff `@latest` delivered newer than the PRD's "Next.js 14" note — PO confirmed "use latest release").

---

## [20/04/26] - Initialized project-specific .claude/CLAUDE.md and inventoried skills

- Filled `.claude/CLAUDE.md` Project, Current Phase, Architecture (points to trd.md), Tech Stack (frontend locked, backend pending, infra on Cloud Run), Commands, and Code Style sections.
- Added new Working Conventions section including the PO-dictated agent-commit permission line; Critical Do-Nots (no Genkit-Python, no architecture.md, no persistence layer, no real portal submission, no real MyKad); Re-Read Discipline (session-start reading order).
- Preserved Git Commit Convention, Agent Reminder Rule, Agent Workflow Protocol, and Documentation Format verbatim.
- Inventoried 7 skills under `.claude/skills/` (brainstorming, frontend-slides, gemini-document-scanner, humanizer, project-scaffolding, web-testing, writing-plans). Flagged 6 project-specific skill gaps (Next.js+shadcn scaffold, Cloud Run deploy, ADK-Python, Gemini API conventions, WeasyPrint, Vertex AI Search) for human review — no skills created.
- Restructured `docs/plan.md` into Phase 0 (scaffolding, 5 tasks) / Phase 1 (core build, 6 tasks) / Phase 2 (submission, 4 tasks).

---

## [20/04/26] - Decomposed project-idea into prd.md and trd.md

- Populated `docs/prd.md` with problem statement, aim + objectives, Aisyah persona (Form B filer, locked), ten functional requirements (FR-1 through FR-10) with falsifiable acceptance criteria, six non-functional requirements, scope boundaries, emergency de-scope plan (hour 20/24 feature freeze), and disclaimers.
- Populated `docs/trd.md` with architecture overview, two ASCII diagrams (system topology + agent tool-call flow), component responsibility table, ten-step data flow narrative, Google AI ecosystem integration with handbook-stack-alignment subsection, external dependencies (cached scheme PDFs at `backend/data/schemes/`, seed script at `backend/scripts/seed_vertex_ai_search.py`, no DB / no GCS in v1), security & secrets, Plan B (Vertex AI Search → inline 1M-context grounding at sprint hour 12), and open questions (handbook orchestrator mismatch, GCP infra pins, JKM rate fallback).
- Patched `docs/roadmap.md`: project name Layak, Phase 0 milestone table now references `docs/trd.md` instead of `docs/architecture.md`, added decision log and non-goals sections at end of file.
- Ticked Phase 0 task 1 items 1 and 2 in `docs/plan.md`.

---
