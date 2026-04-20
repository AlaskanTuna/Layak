# Project Requirements Document

**Project**: Layak
**Module**: Layak MVP (v1 — hackathon demo build)
**Industry**: Malaysian GovTech / social-assistance delivery (Track 2 — Citizens First)
**Team Size**: 2
**Target Grade**: Project 2030 — MyAI Future Hackathon, National Open Champion
**Document Version**: 0.1.0
**Date**: 20 April 2026

---

## 0. Team & Responsibilities

| Role     | Name       | Focus                   | Owns                                                                                                                                                                                           |
| -------- | ---------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PO1**  | Hao        | AI / backend / infra    | FastAPI + ADK-Python RootAgent; Pydantic rule engine (STR / JKM / LHDN); Vertex AI Search seed script; Gemini integration (Pro / Flash / Code Execution); Cloud Run deploy; GCP project setup. |
| **PO2**  | Adam       | Frontend / UX           | Next.js App Router pages; upload widget + SSE client; shadcn component integration; ranked-scheme list; provenance panel; "Why I qualify" UX; draft-packet download; responsiveness + polish.  |
| **Both** | Adam + Hao | Integration / rehearsal | Frontend ↔ backend wiring session (Phase 1 midday); demo-data seeding; mobile/desktop responsiveness pass; three clean demo rehearsals; submission package assembly (README, video, deck).     |

Pairing convention follows `docs/roadmap.md`: `PO1` = AI/backend, `PO2` = frontend/infra, `Both` = paired blocks. Swap lanes if velocity demands (e.g. PO2 takes on Cloud Run deploy if P1 is blocked on rule-engine debug).

> **NOTE:** Agent-role conventions (PL / PG / QA / AD) in `docs/roles.md` are orthogonal — those apply to AI agents working on the repo (Claude Code, Codex, etc.), not to the two human developers.

### Phase ownership matrix

Each row below maps to a specific task in `docs/plan.md` or a milestone in `docs/roadmap.md`. **Owner** is primary; `Both` = paired block. When a matching task in `plan.md` is fully ticked, the matrix row is considered delivered.

| Phase | Task                                                                                                                                              | Owner                                   | Anchor                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------------------------------- |
| **0** | Docs decomposition → PRD / TRD / roadmap / plan / progress                                                                                        | PO2 (solo tonight)                      | `docs/plan.md` Phase 0 tasks 1–2, commits `4eab9cb`, `484e83d`  |
| **0** | `.claude/` project instructions + skills inventory                                                                                                | PO2                                     | `docs/plan.md` Phase 0 task 3, commit `f266a56`                 |
| **0** | Next.js 16 + React 19 + Tailwind 4 + shadcn + Husky scaffold                                                                                      | PO2                                     | `docs/plan.md` Phase 0 task 4, commit `fcbe6b5`                 |
| **0** | Refactor into `frontend/` + `backend/` pnpm workspace                                                                                             | PO2                                     | `docs/plan.md` Phase 0 task 6, commits `b7bf34a`, `5171838`     |
| **0** | Download + commit six scheme source PDFs into `backend/data/schemes/`                                                                             | Either (mechanical)                     | `docs/plan.md` Phase 0 task 7                                   |
| **0** | GCP project signup; enable Vertex AI + Cloud Run + Artifact Registry + Secret Manager + Discovery Engine APIs; Gemini API key → Secret Manager    | PO1 (Hao)                               | `docs/roadmap.md` Phase 0 exit gate · **BLOCKED on PO1 signup** |
| **0** | Hello-world FastAPI → Gemini → Cloud Run container (`v0.0.1-helloworld` tag)                                                                      | Both                                    | `docs/roadmap.md` Phase 0 exit gate · blocked on GCP            |
| **1** | Pydantic `Profile` / `SchemeMatch` / `Packet`; FastAPI skeleton with `POST /api/agent/intake` SSE stub; ADK `SequentialAgent` + 2–3 FunctionTools | PO1                                     | `docs/plan.md` Phase 1 task 1                                   |
| **1** | Upload widget (FR-2), SSE consumer, ranked-scheme list skeleton (FR-6), provenance panel layout (FR-7), demo-mode banner (FR-10)                  | PO2                                     | `docs/plan.md` Phase 1 task 2                                   |
| **1** | Five-step orchestration (extract → classify → match → compute_upside → generate_packet); Vertex AI Search indexing; hour-12 Plan B trigger        | PO1 (PO2 wires SSE events into UI)      | `docs/plan.md` Phase 1 task 3 · `docs/trd.md` §8                |
| **1** | Rule engine: STR 2026 household tier, JKM Warga Emas per-capita means test, five LHDN Form B reliefs; unit tests vs cached PDFs                   | PO1                                     | `docs/plan.md` Phase 1 task 4                                   |
| **1** | Wire frontend ↔ backend end-to-end: real SSE, live provenance, Code Execution on stage, WeasyPrint drafts downloadable                            | Both                                    | `docs/plan.md` Phase 1 task 5                                   |
| **1** | Cloud Run deploy with `--min-instances=1 --cpu-boost`, Secret-Manager-injected `GEMINI_API_KEY`                                                   | PO1                                     | `docs/plan.md` Phase 1 task 6                                   |
| **1** | Responsiveness pass at 375 / 768 / 1440; three clean demo rehearsals of the 90-second Aisyah flow                                                 | PO2 (responsiveness) / Both (rehearsal) | `docs/plan.md` Phase 1 task 6                                   |
| **2** | UI polish: copy review, empty states, obvious-bug sweep                                                                                           | PO2                                     | `docs/plan.md` Phase 2 task 1                                   |
| **2** | README final pass: features, setup, AI disclosure (Rules §4.2), architecture overview (ASCII from `docs/trd.md`)                                  | PO1                                     | `docs/plan.md` Phase 2 task 1                                   |
| **2** | 3-min demo video: script → 2 takes → caption if time → unlisted YouTube                                                                           | PO1                                     | `docs/plan.md` Phase 2 task 2                                   |
| **2** | 15-slide pitch deck in Canva: problem → user → solution → demo → architecture → tech → impact → business → team → export `pitch.pdf`              | PO2                                     | `docs/plan.md` Phase 2 task 3                                   |
| **2** | Fill + submit Google Form: repo URL, Cloud Run URL, video URL, `pitch.pdf`, GitHub profiles, track + category                                     | PO1 (Team Lead submits)                 | `docs/plan.md` Phase 2 task 4                                   |
| **2** | 23:00–23:59 buffer: resubmit if any link breaks                                                                                                   | Both                                    | `docs/roadmap.md` Phase 2                                       |

### Cross-cutting responsibilities

- **Synthetic demo documents** (MyKad, payslip, TNB utility bill — `docs/trd.md` §9.6): PO2 designs the visual templates; PO1 validates extraction compatibility with Gemini 2.5 Flash before demo rehearsal. Every page watermarked "SYNTHETIC — FOR DEMO ONLY"; fictional IC number; AI-generated face disclosed on slide 1 of the pitch deck.
- **Code review on `main`**: for substantive commits (not formatting or doc-only), the other developer reads the diff before the next commit lands on top. Hard pass after feature freeze (21 Apr 18:00) — trust and keep moving.
- **Progress logging**: after every meaningful milestone, append a dated entry to `docs/progress.md` (format in `.claude/CLAUDE.md`) and tick matching items in `docs/plan.md`. Applies to both devs.
- **Conventional Commits**: every commit follows `.claude/CLAUDE.md` → Git Commit Convention (`<type>(scope): <description>`, imperative mood, single sentence, no body, no trailing period). Allowed types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`. Allowed scopes in the project's CLAUDE.md.
- **AI-coding tool disclosure**: Claude Code, Codex, or any agentic coder used inside the hackathon window must be named in the README AI Disclosure section (Rules §4.2). PO1 writes that section during Phase 2 README pass.

### Swap & escalation rules

- **PO1 blocked on ADK-Python migration past the 4-hour budget** (`docs/trd.md` §10 feasibility verdict): PO2 takes on Cloud Run deploy scaffold so the deploy is unblocked the moment PO1's backend turns green.
- **Vertex AI Search setup stalls past sprint hour 12**: PO1 calls the trigger; team collapses to Plan B inline-PDF grounding (`docs/trd.md` §8). ADK-Python and the five-step pipeline stay intact; only the retrieval FunctionTool changes.
- **Pipeline still unstable at sprint hour 18**: activate the emergency de-scope list in §6.3 below — drop PDF packet → drop Code Execution arithmetic → drop two of the five LHDN reliefs → fall back to Aisyah seed fixtures. PO1 proposes, PO2 seconds, both execute in parallel.
- **Either dev blocked for more than 30 minutes**: ask the other for a 5-minute pair-check before scope-switching. Don't suffer in silence.
- **Feature freeze at 21 Apr 18:00 (sprint hour 20/24)**: no new endpoints, pages, or flows. Bug fixes only until code freeze at 21 Apr 21:00. Submission-metadata-only commits after code freeze.

---

## 1. Problem Statement

Malaysia's social-assistance estate is fragmented. The Ministry of Finance's _Economic Outlook 2024_ states that 167 schemes are currently being implemented by 17 ministries and agencies, producing both inclusion and exclusion errors. A citizen who would qualify for three or more schemes must discover them on separate portals, decode separate eligibility rubrics, and re-enter the same documents into separate forms — work that the state, not the citizen, should be doing.

**User-level problem.** Aisyah, a 34-year-old Grab driver in Kuantan with two school-age children and a 70-year-old dependent father, earns approximately RM2,800/month. To claim what she is already entitled to (STR 2026 cash tier, her father's JKM Warga Emas review, and five LHDN personal reliefs on Form B), she must navigate three distinct portals, interpret RM-threshold tables, and re-enter three documents three times. In practice she does none of it.

**Sovereignty / ecosystem problem.** The MyGov Malaysia super-app's in-house AI chatbot was disabled one day after beta launch (20 August 2025) after it hallucinated ministers' portfolios and misstated RON95 prices. Two months later, the Ministry of Digital launched Polisi Pendigitalan Data Sektor Awam (PPDSA, 10 February 2026) and publicly named agentic AI as the next layer. Layak sits at that intersection: not a chatbot that was shut down, but the grounded, verifiable autonomous layer the policy direction calls for — a safer pattern that never executes a live transaction, cites every rule, and watermarks every output as DRAFT.

## 2. Project Aim & Objectives

**Aim.** To demonstrate, in a 24-hour hackathon build, that an agentic AI concierge grounded in a small, auditable corpus of Malaysian government eligibility rules can reduce the discovery and application effort for three Budget-2026-era social-assistance schemes from hours of portal-hopping to a single document-upload interaction that yields a pre-filled, signed draft application packet.

**Objectives.**

1. **Design** a five-step agent pipeline (extract → classify household → cross-reference → rank by annual RM upside → generate packet) that runs autonomously from a single user interaction and maps one-to-one to the "Chat → Action" rubric axis.
2. **Develop** a grounded rule engine encoding STR 2026 tier logic, JKM Warga Emas means-test logic, and five LHDN personal reliefs (individual, parent medical, child 16a ×2, EPF+life #17, lifestyle #9) for Form B (gig/self-employed) filers, with every rule traceable to a cached source PDF URL.
3. **Develop** a multimodal document-intake layer using Gemini 2.5 Flash to extract profile data directly from IC, payslip, and utility-bill images, without a separate OCR stage.
4. **Demonstrate** end-to-end on Google Cloud Run with min-instances=1, first-byte latency under 3 seconds during the judging window, and a zero-hallucination rule-provenance layer (every eligibility claim cites its source PDF).
5. **Demonstrate** at least four Google AI ecosystem components — Gemini 2.5 Pro (orchestrator), Gemini 2.5 Flash (workers), Gemini Code Execution (arithmetic), Vertex AI Search (grounded RAG over scheme PDFs), and Cloud Run + Secret Manager (deployment).
6. **Evaluate** on one outcome metric visible in the demo: estimated annual RM upside per user relative to "did nothing" (e.g., Aisyah's ~RM7,250/year from STR + SARA + three LHDN reliefs). This becomes the headline number in the pitch.

## 3. Target Users

### 3.1 Primary persona — Aisyah, 34, Grab driver, Kuantan (locked)

| Attribute            | Value                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Household            | Two children (ages 7 and 10 — both under 18, both trigger relief #16a); one dependent father, 70, resident in household                                                                    |
| Income               | ~RM2,800/month gig income; no fixed employer, no EA Form                                                                                                                                   |
| Tax form             | **Form B** (self-employed gig worker), **not** Form BE. Deadline 30 June 2026 (grace 15 July)                                                                                              |
| Digital literacy     | Moderate — confident with e-wallet apps, photo-uploads MyKad when Grab asks, distrustful of multi-page gov forms                                                                           |
| Current aid status   | Likely already receives SARA monthly MyKad credit; unclear whether she has applied for STR 2026; father not yet enrolled in Warga Emas; has never claimed parent-medical relief under LHDN |
| Device               | Mid-range Android, data-capped mobile plan, occasional home WiFi                                                                                                                           |
| Language             | Prefers Bahasa Malaysia; functional English (v1 UI is English only)                                                                                                                        |
| Pain in one sentence | _"I don't know what I'm entitled to, the forms all want the same documents twice, and I don't trust that entering my IC number anywhere online is safe."_                                  |

**Why Aisyah is the only demo persona.** She activates all three locked schemes simultaneously (STR household tier with children; JKM Warga Emas through her father; LHDN Form B reliefs matching her gig profile), producing the richest three-scheme packet in a 90-second demo. Secondary personas each light up only one or two schemes and would dilute the on-stage moment. A persona switcher is the number-one scope-creep trap; it is out.

### 3.2 Secondary personas (OUT OF SCOPE for v1)

Listed for positioning only. Not implemented, not in the demo, not in the rule engine.

- **Encik Rahman, 68, retired lorry driver, Kedah** — Warga Emas + STR senior tier (elderly-only flow).
- **Siti, 29, kindergarten teacher, Selangor (salaried RM3,200/month)** — files Form BE; LHDN reliefs + STR household tier if married with kids.
- **Vinod, 52, small-workshop owner, Johor** — Form B; i-Saraan + EPF voluntary contribution routing.

### 3.3 User assumptions

- Owns a smartphone with a working camera.
- Has intermittent mobile data; home broadband is **not** assumed.
- Reads English UI copy if it is plain-language.
- Trust-posture is skeptical after the MyGov chatbot incident and broader scam landscape — therefore Layak must display "we store nothing" and "draft only — you submit manually" prominently.

## 4. Functional Requirements

Each requirement below ties to one of the ten in-scope v1 deliverables. Acceptance criteria are falsifiable — each one should be answerable with a yes/no test.

### FR-1 — Single-page web app on Cloud Run

**Description.** Next.js 16 App Router application (React 19, Tailwind 4) deployed at a public Cloud Run HTTPS URL, accessible without login.

**Acceptance criteria:**

- [ ] `curl -I https://<cloud-run-url>` returns `HTTP/2 200` within 3 seconds (warm container).
- [ ] The landing view renders on 375px, 768px, and 1440px viewports without horizontal scroll.
- [ ] UI copy is entirely in English for v1.
- [ ] No login is required to reach the upload widget.
- [ ] README Cloud Run URL works from an incognito browser on the demo network.

### FR-2 — Document upload widget (three files)

**Description.** Accepts three distinct file inputs — IC, payslip or e-wallet income screenshot, and utility bill — as either image (JPG/PNG) or PDF.

**Acceptance criteria:**

- [ ] The widget exposes three separately-labelled file inputs matching IC, income, and utility.
- [ ] Uploads via the phone camera succeed on iOS Safari and Android Chrome.
- [ ] Files above 10 MB are rejected client-side with a visible error.
- [ ] Non-image/non-PDF MIME types are rejected client-side.
- [ ] A single-click "Use Aisyah sample documents" button loads seed fixtures (see FR-10).

### FR-3 — Multimodal extraction into strict JSON profile

**Description.** Gemini 2.5 Flash reads the three uploaded documents and produces a Pydantic-validated profile containing name, IC last-4, age, monthly income, dependants, and household composition flags.

**Acceptance criteria:**

- [ ] Extraction completes in under 10 seconds for the Aisyah seed documents.
- [ ] Output conforms to the `Profile` Pydantic schema (no extra fields, all required fields populated).
- [ ] IC is stored as last-4-only; full IC is never logged or echoed.
- [ ] Extraction failure returns a structured error surface; the UI offers to retry or fall back to seed data.
- [ ] Prompt and schema are versioned in source control.

### FR-4 — Hardcoded eligibility rule engine

**Description.** Pydantic-typed rule engine for three schemes: STR 2026 household-with-children tier, JKM Warga Emas per-capita means test, and five LHDN Form B personal reliefs (individual RM9,000; parent medical up to RM8,000; child relief #16a RM2,000 each × 2; EPF + life insurance under #17 up to RM7,000; lifestyle #9 up to RM2,500).

**Acceptance criteria:**

- [ ] All numeric thresholds and caps are sourced from the cached scheme PDFs in `backend/data/schemes/`.
- [ ] STR tier lookup covers both household-income bands (≤RM2,500 and RM2,501–5,000) with child-count multipliers.
- [ ] JKM Warga Emas uses per-capita income (household income ÷ household size) against the PGK Miskin Tegar threshold (food-PLI RM1,236 per DOSM 2024); rate defaults to RM600/month (Budget 2026) with fallback copy to RM500/month.
- [ ] LHDN rules are tagged `ya_2025` (the filing window open now) and reject any other year.
- [ ] Each rule result returns a provenance record `{ rule_id, source_pdf_url, page_ref }`.

### FR-5 — Gemini Code Execution arithmetic

**Description.** The orchestrator invokes the Gemini Code Execution tool (`tools: [{codeExecution: {}}]`) to compute annual RM upside per scheme and the total upside, visibly running Python on stage.

**Acceptance criteria:**

- [ ] Three computations run in sequence: STR tier RM, JKM Warga Emas RM/year, LHDN tax-delta RM.
- [ ] The code-execution trace (Python snippet + output) is streamed to the UI.
- [ ] Each computation cites the inputs it used (profile fields + scheme params).
- [ ] Execution time for all three computations is under 8 seconds total.
- [ ] If Code Execution fails, the orchestrator falls back to a pure-Python computation step and flags the degradation in the UI (not silent).

### FR-6 — Ranked scheme list

**Description.** The UI displays matched schemes in descending order of annual RM upside.

**Acceptance criteria:**

- [ ] Each scheme card shows: scheme name, RM/year, one-sentence eligibility summary, and a "Why I qualify" expander (see FR-9).
- [ ] The total RM/year is rendered prominently at the top of the results view.
- [ ] Schemes for which the user does not qualify are hidden by default (not rendered as "0 RM" cards).
- [ ] Out-of-scope schemes (i-Saraan, PERKESO, MyKasih, eKasih, PADU sync, state-level aid, SARA claim flow, appeal workflow) render as greyed-out "Checking… (v2)" cards below the active schemes.
- [ ] The ranked list renders deterministically for the same input profile across repeat runs.

### FR-7 — Provenance panel

**Description.** Every eligibility claim in the UI is backed by a click-to-open link to the source PDF passage. Vertex AI Search is the primary retrieval layer; it returns the passage and URL used in the provenance panel.

**Acceptance criteria:**

- [ ] Every number shown (threshold, cap, relief amount, rate) has an adjacent cite icon.
- [ ] Clicking the cite icon opens the source PDF (cached in the repo and served by the backend) at the relevant page.
- [ ] The provenance record surfaces at minimum: rule ID, source PDF URL, and retrieved passage text.
- [ ] If retrieval returns no passage for a rule, the UI flags that rule as "unverified" and the rule does not contribute to the ranked list.
- [ ] No rule-value appears in the UI without a retrievable provenance record.

### FR-8 — Draft packet PDF generator

**Description.** WeasyPrint renders three pre-filled draft PDFs (BK-01 STR application, JKM18 Warga Emas application, LHDN relief summary) each watermarked "DRAFT — NOT SUBMITTED" on every page.

**Acceptance criteria:**

- [ ] The three PDFs download as a single ZIP or as three separate files from the results view.
- [ ] Watermark is visible on every page and is not removable by the user in-browser.
- [ ] Pre-filled fields match the extracted profile (FR-3) and the rule-engine results (FR-4).
- [ ] Each PDF includes a footer: "Generated by Layak on YYYY-MM-DD. This is a draft. You must submit manually via the stated official portal."
- [ ] Cloud Run container ships with `libpango`, `libcairo`, and `libgdk-pixbuf` preinstalled.

### FR-9 — "Why I qualify" explanation per scheme

**Description.** The RootAgent (Gemini 2.5 Pro) generates a plain-language explanation for each matched scheme, referencing the provenance map from FR-7.

**Acceptance criteria:**

- [ ] Each explanation is under 80 words.
- [ ] Each explanation cites at least one source PDF inline.
- [ ] Explanations are written in plain English at a B40-consumer reading level (avoid legalese and tax-speak).
- [ ] Explanations never claim a final legal determination — they say "you appear to qualify based on Budget 2026 gazetted rates as of 20 Apr 2026; the agency confirms on application."
- [ ] Explanations render inside the scheme card expander (FR-6).

### FR-10 — Aisyah seed-data demo-mode fallback

**Description.** A visible "Use Aisyah sample documents" button loads hardcoded fixtures so the five-step pipeline can still execute visibly on stage if live extraction misbehaves.

**Acceptance criteria:**

- [ ] A single click replaces the uploaded documents with the Aisyah fixtures and triggers the pipeline.
- [ ] Seed fixtures reside at `backend/data/fixtures/aisyah/` and are committed to git.
- [ ] The seed run produces the same ranked-scheme list and total RM upside as the live-extraction path for the same documents.
- [ ] The UI surface labels seed-mode runs with a "DEMO MODE" banner.
- [ ] Demo mode is idempotent — repeat clicks produce the same result.

## 5. Non-Functional Requirements

### NFR-1 — Performance

- First-byte latency ≤3 seconds during judging window.
- Cloud Run deployed with `--min-instances=1` and `--cpu-boost` at least 1 hour before demo slot.
- Health endpoint pinged every 30 seconds during the pre-demo warm-up window.

### NFR-2 — Grounding & transparency

- Every numeric value or eligibility claim in the UI has a clickable source-PDF provenance record.
- No rule value is rendered without a retrievable citation — this is the single highest-leverage differentiator from failed chatbot precedents (MyGov Malaysia, NYC MyCity).
- The final legal determination is always deferred to the relevant agency; the packet is stamped DRAFT.

### NFR-3 — Privacy

- No user documents, profile data, or PII are persisted beyond the HTTP request lifecycle.
- No user accounts, no login, no session storage beyond in-memory request scope.
- IC numbers are surfaced in the UI and packet as last-4-digits only; full IC is masked everywhere except the Pydantic Profile object held in request memory.
- `.env` is git-ignored; `.env.example` is the only committed environment template.

### NFR-4 — Accessibility & responsiveness

- Passes the three viewport checks (375px, 768px, 1440px) for layout integrity.
- All interactive elements are keyboard-reachable.
- Alt text on every non-decorative image.
- Colour contrast ratios meet WCAG 2.1 AA for body copy.
- Plain-English copy throughout; technical jargon is only shown behind a "show full rule" affordance.

### NFR-5 — Reliability

- Bundled PDF sources in `backend/data/schemes/` — live fetches to `hasil.gov.my`, `jkm.gov.my`, or `data.gov.my` are never on the critical path.
- Cached Aisyah seed data is a one-click fallback (FR-10).
- Rule-engine unit tests run in CI and fail the build if any threshold value drifts from the cached PDFs without a deliberate version bump.

### NFR-6 — Security

- Cloud Run service account has `roles/secretmanager.secretAccessor` only; no broader privileges.
- `GEMINI_API_KEY` lives in GCP Secret Manager, mounted via `--set-secrets=GEMINI_API_KEY=gemini-api-key:latest`.
- HTTPS-only; Cloud Run defaults hold.
- No credentials, tokens, or IC values appear in any commit, log line, or UI string.
- AI disclosure section in README names Claude Code explicitly (hackathon Rules §4.2).

## 6. Scope Boundaries

### 6.1 In scope (v1 — demo-night deliverables)

Mirrored verbatim from `docs/project-idea.md` §5. Ten items:

1. Single-page Next.js web app deployed at a Cloud Run HTTPS URL, English UI only.
2. Document-upload widget accepting three image/PDF files (IC, payslip or e-wallet income screenshot, utility bill).
3. Gemini 2.5 Flash multimodal extraction into a strict JSON profile.
4. Hardcoded eligibility rule engine for STR 2026 (household-with-children tier), JKM Warga Emas, and five LHDN reliefs.
5. Gemini Code Execution arithmetic step computing annual RM upside per scheme + total.
6. Ranked scheme list ordered by RM upside.
7. Provenance panel: every rule cites its source PDF URL.
8. PDF packet generator producing three pre-filled drafts watermarked "DRAFT — NOT SUBMITTED."
9. "Why I qualify" explanation per scheme.
10. Hardcoded Aisyah seed-data button for demo fallback.

### 6.2 Out of scope (v1 — explicit)

Mirrored verbatim from `docs/project-idea.md` §5. Any item below renders as a greyed-out "Checking… (v2)" card in the UI, never as a working feature.

- Live submission to any government portal (disqualification risk).
- Malay, Chinese, or Tamil UI.
- Schemes beyond the three locked: i-Saraan, PERKESO, MyKasih, eKasih, PADU sync, state-level aid (Kita Selangor, Penang elderly), SARA claim flow.
- Appeal workflow (BK-02 / BK-05 / JKM20).
- Mobile native app.
- User accounts and persistent storage.
- MyDigital ID / MyKad NFC reading.
- Multi-document versioning.
- Email / WhatsApp delivery of packet.
- Voice input.
- OKU, spouse, and disability edge cases in the rule engine.
- EV charging, SSPN, and housing-loan-interest reliefs (#22).
- Tax filing submission to MyTax.
- PADU registration.
- Household-income percentile framing against OpenDOSM data.
- Budget 2026 SARA Untuk Semua one-off disbursement.
- eKasih booster tier toggle.
- Warga Emas discretionary-override path.
- Form B vs Form BE auto-routing (Aisyah is locked as Form B filer).

### 6.3 Emergency de-scope plan

**Hard feature freeze at hour 20/24.** No new endpoints, pages, or flows after that point.

If the pipeline is not stable by hour 18/24, cut in the following order until the core five-step flow is demo-stable:

1. Drop PDF packet generation (FR-8); replace with an on-screen "pre-filled form preview" panel.
2. Drop Gemini Code Execution arithmetic (FR-5); compute upside in pure Python directly.
3. Drop two of the five LHDN reliefs (keep individual, parent medical, child #16a ×2; cut EPF+life #17 and lifestyle #9).
4. Drop live document extraction entirely (FR-3); use the hardcoded Aisyah seed data (FR-10) as the uploaded-documents flow.

The demo still wins on the "Chat → Action" rubric provided steps 1–5 of the agentic moment execute visibly on stage.

## 7. Disclaimers

- **Layak does not submit to any real government portal.** Outputs are draft application packets only. Users submit manually via the stated official portal (`bantuantunai.hasil.gov.my`, `jkm.gov.my`, `mytax.hasil.gov.my`).
- **Demo documents are synthetic.** MyKad, payslip, and utility-bill specimens used in the demo are fully fictional. Every synthetic MyKad carries a prominent "SYNTHETIC — FOR DEMO ONLY" watermark, uses a fictional IC number, and does not replicate holographic or chip elements (which would cross into forgery under the Penal Code and PDPA 2010 / National Registration Regulations 1990).
- **Eligibility results are estimates.** Computations use Budget-2026-gazetted rates as of 20 April 2026. The final legal determination rests with the relevant agency on application. Layak is not an official government service and is not affiliated with any Malaysian ministry.
- **Rule-engine scope is narrow.** Only the three locked schemes and five locked LHDN reliefs are encoded in v1. The UI greys out the long tail of schemes explicitly as "Checking… (v2)" rather than hiding them.
- **AI disclosure.** The README declares that this project was built with Claude Code (Anthropic) as the primary agentic coding assistant, per hackathon Rules §4.2. All AI-generated code is reviewed by human developers before commit.
