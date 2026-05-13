# Project Requirements Document

**Project**: Layak
**Module**: Layak v1 (hackathon demo build) + v2 (production SaaS pivot)
**Industry**: Malaysian GovTech / social-assistance delivery (Track 2 — Citizens First)
**Team Size**: 2
**Target Grade**: Project 2030 — MyAI Future Hackathon, National Open Champion
**Document Version**: 0.2.1
**Date**: 23 April 2026

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Project Aim & Objectives](#2-project-aim--objectives)
3. [Target Users](#3-target-users)
   1. [Primary persona — Aisyah, 34, Grab driver, Kuantan (locked)](#31-primary-persona--aisyah-34-grab-driver-kuantan-locked)
   2. [Secondary personas (OUT OF SCOPE for v1)](#32-secondary-personas-out-of-scope-for-v1)
   3. [User assumptions](#33-user-assumptions)
   4. [Secondary personas active in v2](#34-secondary-personas-active-in-v2)
4. [Functional Requirements](#4-functional-requirements)
   1. [FR-1 — Single-page web app on Cloud Run](#fr-1--single-page-web-app-on-cloud-run)
   2. [FR-2 — Document upload widget (three files)](#fr-2--document-upload-widget-three-files)
   3. [FR-3 — Multimodal extraction into strict JSON profile](#fr-3--multimodal-extraction-into-strict-json-profile)
   4. [FR-4 — Hardcoded eligibility rule engine](#fr-4--hardcoded-eligibility-rule-engine)
   5. [FR-5 — Gemini Code Execution arithmetic](#fr-5--gemini-code-execution-arithmetic)
   6. [FR-6 — Ranked scheme list](#fr-6--ranked-scheme-list)
   7. [FR-7 — Provenance panel](#fr-7--provenance-panel)
   8. [FR-8 — Draft packet PDF generator](#fr-8--draft-packet-pdf-generator)
   9. [FR-9 — "Why I qualify" explanation per scheme](#fr-9--why-i-qualify-explanation-per-scheme)
   10. [FR-10 — Sample-data demo-mode fallback](#fr-10--sample-data-demo-mode-fallback)
   11. [FR-11 — Google OAuth sign-in](#fr-11--google-oauth-sign-in)
   12. [FR-12 — PDPA-consent sign-up gate](#fr-12--pdpa-consent-sign-up-gate)
   13. [FR-13 — Persisted per-user evaluation history](#fr-13--persisted-per-user-evaluation-history)
   14. [FR-14 — Free-tier quota (5/24h with 429 + X-RateLimit-Reset)](#fr-14--free-tier-quota-524h-with-429--x-ratelimit-reset)
   15. [FR-15 — Shareable owner-gated results URL at /dashboard/evaluation/results/[id]](#fr-15--shareable-owner-gated-results-url-at-dashboardevaluationresultsid)
   16. [FR-16 — Settings profile + tier card + waitlist modal](#fr-16--settings-profile--tier-card--waitlist-modal)
   17. [FR-17 — Data-export (GET /api/user/export) + account-deletion (DELETE /api/user)](#fr-17--data-export-get-apiuserexport--account-deletion-delete-apiuser)
   18. [FR-18 — Nightly 30-day free-tier prune (Cloud Scheduler + Cloud Run Job)](#fr-18--nightly-30-day-free-tier-prune-cloud-scheduler--cloud-run-job)
   19. [FR-19 — Marketing landing page at /](#fr-19--marketing-landing-page-at-)
   20. [FR-20 — Privacy notice + terms pages (/privacy, /terms)](#fr-20--privacy-notice--terms-pages-privacy-terms)
   21. [FR-21 — Manual Entry Mode (privacy alternative to document upload)](#fr-21--manual-entry-mode-privacy-alternative-to-document-upload)
5. [Non-Functional Requirements](#5-non-functional-requirements)
   1. [NFR-1 — Performance](#nfr-1--performance)
   2. [NFR-2 — Grounding & transparency](#nfr-2--grounding--transparency)
   3. [NFR-3 — Privacy](#nfr-3--privacy)
   4. [NFR-4 — Accessibility & responsiveness](#nfr-4--accessibility--responsiveness)
   5. [NFR-5 — Reliability](#nfr-5--reliability)
   6. [NFR-6 — Security](#nfr-6--security)
   7. [NFR-7 — Session security](#nfr-7--session-security)
   8. [NFR-8 — PDPA compliance](#nfr-8--pdpa-compliance)
   9. [NFR-9 — Tier-aware rate limits](#nfr-9--tier-aware-rate-limits)
6. [Scope Boundaries](#6-scope-boundaries)
   1. [In scope (v1 — demo-night deliverables)](#61-in-scope-v1--demo-night-deliverables)
   2. [Out of scope (v1 — explicit)](#62-out-of-scope-v1--explicit)
   3. [Emergency de-scope plan](#63-emergency-de-scope-plan)
7. [Disclaimers](#7-disclaimers)

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
5. **Demonstrate** at least four Google AI ecosystem components — Gemini family models across the pipeline, Gemini Code Execution (arithmetic), Vertex AI Search (grounded RAG over scheme PDFs), and Cloud Run + Secret Manager (deployment).
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
| Language             | Prefers Bahasa Malaysia; can switch between Bahasa Malaysia, English, and Simplified Chinese UI copy                                                                                       |
| Pain in one sentence | _"I don't know what I'm entitled to, the forms all want the same documents twice, and I don't trust that entering my IC number anywhere online is safe."_                                  |

**Why Aisyah remains the primary demo persona.** She activates all three locked schemes simultaneously (STR household tier with children; JKM Warga Emas through her father; LHDN Form B reliefs matching her gig profile), producing the richest three-scheme packet in a 90-second demo. The shipped product now also includes a second salaried sample persona (Farhan) for Form BE coverage and regression checks, but Aisyah remains the headline walkthrough and product-reference persona.

### 3.2 Secondary personas (OUT OF SCOPE for v1)

Listed for positioning only. Not implemented, not in the demo, not in the rule engine.

- **Encik Rahman, 68, retired lorry driver, Kedah** — Warga Emas + STR senior tier (elderly-only flow).
- **Siti, 29, kindergarten teacher, Selangor (salaried RM3,200/month)** — files Form BE; LHDN reliefs + STR household tier if married with kids.
- **Vinod, 52, small-workshop owner, Johor** — Form B; i-Saraan + EPF voluntary contribution routing.

### 3.3 User assumptions

- Owns a smartphone with a working camera.
- Has intermittent mobile data; home broadband is **not** assumed.
- Can navigate plain-language UI copy in either English or Bahasa Malaysia; Simplified Chinese is supported but not assumed.
- Trust-posture is skeptical after the MyGov chatbot incident and broader scam landscape — therefore Layak must disclose clearly that raw uploads are processed transiently, derived evaluation data may be stored for history/results, and every packet remains "draft only — you submit manually".

### 3.4 Secondary personas active in v2

v2 opens the product to any Malaysian citizen who self-selects through sign-up, but Aisyah remains the reference free-tier persona for product decisions, examples, and testing.

## 4. Functional Requirements

Each requirement below ties to one of the in-scope v1 and v2 deliverables. Acceptance criteria are falsifiable — each one should be answerable with a yes/no test.

### FR-1 — Single-page web app on Cloud Run

**Description.** Next.js 16 App Router application (React 19, Tailwind 4) deployed at a public Cloud Run HTTPS URL, accessible without login.

**Acceptance criteria:**

- [ ] `curl -I https://<cloud-run-url>` returns `HTTP/2 200` within 3 seconds (warm container).
- [ ] The landing view renders on 375px, 768px, and 1440px viewports without horizontal scroll.
- [ ] UI copy is available in English, Bahasa Malaysia, and Simplified Chinese, with a runtime language toggle.
- [ ] No login is required to reach the public landing page; authenticated routes gate the intake/dashboard experience.
- [ ] README Cloud Run URL works from an incognito browser on the demo network.

### FR-2 — Document upload widget (three files)

**Description.** Accepts three distinct file inputs — IC, payslip or e-wallet income screenshot, and utility bill — as either image (JPG/PNG) or PDF.

**Acceptance criteria:**

- [ ] The widget exposes three separately-labelled file inputs matching IC, income, and utility.
- [ ] Uploads via the phone camera succeed on iOS Safari and Android Chrome.
- [ ] Files above 10 MB are rejected client-side with a visible error.
- [ ] Non-image/non-PDF MIME types are rejected client-side.
- [ ] Visible sample-data buttons load the bundled Aisyah and Farhan fixtures (see FR-10).

### FR-3 — Multimodal extraction into strict JSON profile

**Description.** Gemini 2.5 Flash reads the three uploaded documents and produces a Pydantic-validated profile containing name, IC last-6 (place-of-birth code + serial), age, monthly income, dependants, and household composition flags.

**Acceptance criteria:**

- [ ] Extraction completes in under 10 seconds for the Aisyah seed documents.
- [ ] Output conforms to the `Profile` Pydantic schema (no extra fields, all required fields populated).
- [ ] IC is stored as last-6-only; full IC is never logged or echoed.
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

**Description.** WeasyPrint renders pre-filled draft PDFs (BK-01 STR application, JKM18 Warga Emas application, JKM BKK where applicable, LHDN relief summary, and other mapped in-scope packets) with a localized Layak watermark on every page while the underlying government-form body stays in its source language.

**Acceptance criteria:**

- [ ] The three PDFs download as a single ZIP or as three separate files from the results view.
- [ ] Watermark is visible on every page, localized to the evaluation language, and is not removable by the user in-browser.
- [ ] Pre-filled fields match the extracted profile (FR-3) and the rule-engine results (FR-4).
- [ ] Each PDF includes a localized Layak footer stating that the packet is a draft, not an official submission, and must be submitted manually via the stated official portal.
- [ ] Cloud Run container ships with `libpango`, `libcairo`, and `libgdk-pixbuf` preinstalled.

### FR-9 — "Why I qualify" explanation per scheme

**Description.** Each matched scheme returns deterministic plain-language `summary` and `why_qualify` copy from the rule engine, localized to the evaluation language and shown alongside the provenance map from FR-7.

**Acceptance criteria:**

- [ ] `summary` and `why_qualify` are produced by the typed rule modules, not by a free-form LLM response.
- [ ] Explanations are localized to the user's chosen evaluation language (`en`, `ms`, `zh`), while scheme names and cited passages remain in their source form for grounding.
- [ ] Explanations are written in plain-language consumer copy and avoid legalese / tax jargon where possible.
- [ ] Explanations never claim a final legal determination — they state that the relevant agency confirms on application.
- [ ] Explanations render inside the scheme cards / expanders in the results UI (FR-6).

### FR-10 — Sample-data demo-mode fallback

**Description.** Visible sample-data buttons load hardcoded persona fixtures so either intake path can be prefilled quickly for demos, retries, or comparison between Form B and Form BE households. Prefill and evaluation are intentionally separate: the user reviews the populated intake surface, then starts the pipeline with Continue.

**Acceptance criteria:**

- [ ] In Upload mode, one click fills the IC, payslip, and utility slots with either the Aisyah or Farhan fixtures, loads that persona's visible dependant rows, expands the household section, and shows the DEMO MODE banner without starting evaluation.
- [ ] In Manual Entry mode, one click fills the structured form with either the Aisyah or Farhan fixture values and shows the DEMO MODE banner without starting evaluation.
- [ ] Continue is the sole user action that starts an evaluation after a sample prefill on either intake path.
- [ ] Seed fixtures reside at `frontend/public/fixtures/` and are loaded through the committed frontend helpers in `frontend/src/lib/aisyah-fixtures.ts` and `frontend/src/lib/farhan-fixtures.ts`.
- [ ] The seed run produces the same ranked-scheme list and total RM upside as the equivalent live-extraction or manual-entry path for the same persona.
- [ ] The UI surface labels seed-mode runs with a "DEMO MODE" banner.
- [ ] Demo mode is idempotent — repeat clicks produce the same prefill state and the same evaluation result after Continue.

### FR-11 — Google OAuth sign-in

**Description.** Users sign in with Google OAuth through a "Continue with Google" button, and the resulting ID token is stored client-side for authenticated requests.

**Acceptance criteria:**

- [ ] The sign-in page shows a single Google OAuth button labeled "Continue with Google".
- [ ] A successful sign-in stores a Firebase ID token client-side and redirects to `/dashboard`.
- [ ] A failed OAuth flow shows a retryable error state instead of a blank page.
- [ ] Anonymous visitors cannot access authenticated dashboard routes without signing in.

### FR-12 — PDPA-consent sign-up gate

**Description.** The sign-up flow requires an explicit PDPA consent checkbox before Google OAuth opens, and the consent timestamp is persisted with the user record.

**Acceptance criteria:**

- [ ] `/sign-up` renders a required PDPA consent checkbox before the Google button.
- [ ] The OAuth popup does not open until the consent box is checked.
- [ ] Successful sign-up persists `pdpaConsentAt` on the user document.
- [ ] Reopening sign-up after a successful consent flow does not bypass the checkbox requirement.

### FR-13 — Persisted per-user evaluation history

**Description.** Each authenticated user can view only their own evaluation history, ordered by most recent first, from persisted Firestore records.

**Acceptance criteria:**

- [ ] `/dashboard/evaluation` lists only evaluations owned by the signed-in user.
- [ ] The newest evaluation appears first in the history table.
- [ ] A user cannot retrieve another user's evaluation through the history view.
- [ ] Refreshing the page preserves the previously completed evaluation records.

### FR-14 — Free-tier quota (5/24h with 429 + X-RateLimit-Reset)

**Description.** Free-tier users can start at most five evaluations in a rolling 24-hour window; the sixth request is rejected before the pipeline begins.

**Acceptance criteria:**

- [ ] The sixth evaluation started within 24 hours returns HTTP 429.
- [ ] The 429 response includes an `X-RateLimit-Reset` header.
- [ ] Free-tier quota is evaluated before SSE streaming starts.
- [ ] The UI routes a quota-exhausted free user to the waitlist modal.

### FR-15 — Shareable owner-gated results URL at /dashboard/evaluation/results/[id]

**Description.** Each completed evaluation gets a persistent results URL that renders for its owner and is inaccessible to other users.

**Acceptance criteria:**

- [ ] Completing an evaluation routes the user to `/dashboard/evaluation/results/[id]`.
- [ ] The results page renders for the evaluation owner.
- [ ] A different authenticated user receives a non-owner access failure for the same ID.
- [ ] The route can be refreshed or revisited later without losing the stored results.

### FR-16 — Settings profile + tier card + waitlist modal

**Description.** The settings page shows read-only Google profile data, a tier card, and a waitlist modal for Pro access.

**Acceptance criteria:**

- [ ] `/settings` displays the user's Google email, display name, and photo URL as read-only fields.
- [ ] The tier card reflects the current Firestore `tier` value.
- [ ] Clicking "Upgrade to Pro" opens the waitlist modal.
- [ ] Submitting the modal creates a waitlist record for the signed-in user.

### FR-17 — Data-export (GET /api/user/export) + account-deletion (DELETE /api/user)

**Description.** The account settings danger zone exposes a JSON export endpoint and a hard-delete endpoint for the signed-in user.

**Acceptance criteria:**

- [ ] `GET /api/user/export` returns a JSON bundle for the authenticated user.
- [ ] The export bundle includes the user record and that user's evaluations.
- [ ] `DELETE /api/user` removes the Firestore user document and the user's evaluations.
- [ ] After account deletion succeeds, the user is signed out client-side.

### FR-18 — Nightly 30-day free-tier prune (Cloud Scheduler + Cloud Run Job)

**Description.** A nightly Cloud Scheduler trigger runs a Cloud Run Job that deletes free-tier evaluations older than 30 days.

**Acceptance criteria:**

- [ ] A Cloud Scheduler job triggers the prune workflow once per night.
- [ ] The prune task runs as a Cloud Run Job.
- [ ] Evaluations older than 30 days are deleted for free-tier users.
- [ ] Pro-tier evaluations are not deleted by the prune job.

### FR-19 — Marketing landing page at /

**Description.** The root route serves a public marketing landing page with the product pitch, pricing, and a sign-in CTA.

**Acceptance criteria:**

- [ ] Anonymous visitors can load `/` without signing in.
- [ ] The page includes a hero section, How It Works content, and pricing cards.
- [ ] The primary CTA routes to `/sign-in`.
- [ ] The landing footer links to `/privacy` and `/terms`.

### FR-20 — Privacy notice + terms pages (/privacy, /terms)

**Description.** Static privacy and terms pages are available at `/privacy` and `/terms`, and are linked from the public entry points.

**Acceptance criteria:**

- [ ] `/privacy` renders a static privacy notice.
- [ ] `/terms` renders a static terms page.
- [ ] Both pages are reachable from the landing footer.
- [ ] The sign-up consent copy references the privacy notice.

### FR-21 — Manual Entry Mode (privacy alternative to document upload)

**Description.** An intake-page toggle lets users replace the three document uploads with a structured form that collects the same eligibility-driving fields without accepting any MyKad digits. Users who are unwilling to hand their MyKad / payslip / utility bill to an LLM can type the information instead, and the five-step pipeline runs unchanged from classify onward. Design spec: `docs/superpowers/specs/2026-04-21-manual-entry-mode-design.md`.

**Acceptance criteria:**

- [ ] The intake page exposes a segmented toggle with "Upload documents" (default) and "Enter manually" options, visible on both the v1 landing and the v2 `/dashboard/evaluation/new` route.
- [ ] The manual form has four sections — Identity (full name, age), Income (monthly RM, employment type), Address (optional), Household (dynamic dependants list: relationship + age + optional adult monthly income).
- [ ] Household size is derived server-side as `1 + len(dependants)` and never asked for directly.
- [ ] Manual Entry never accepts a full IC or an IC suffix. The backend receives age directly and builds a `Profile` with `ic_last6 = None` for this path.
- [ ] `employment_type` is a two-value input (`"gig"` or `"salaried"`) and maps server-side to `Profile.form_type` — `gig → form_b`, `salaried → form_be`.
- [ ] `build_profile_from_manual_entry` applied to the Aisyah payload produces a `Profile` equal to `AISYAH_PROFILE` field-for-field, including `household_flags.income_band`. Feeding that built Profile through the rule engine produces `AISYAH_SCHEME_MATCHES` — the same ranked schemes and total RM upside the upload path produces.
- [ ] Validation errors return HTTP 422 with field-level messages the form can bind to.
- [ ] Sample-persona actions in manual mode pre-fill every form field with the Aisyah or Farhan fixture values and are idempotent on repeat clicks.
- [ ] Manual Continue remains disabled until the form is submission-ready: required fields are valid, dependant rows are valid, and spouse count is `<= 4`.
- [ ] Multi-spouse guidance stays live in the Household editor; `>1` spouses shows the shared-household note, while `>4` spouses shows the destructive cap note and keeps Continue unavailable.
- [ ] `?mode=manual` query parameter preloads the manual tab on first paint.
- [ ] The stepper still shows all five steps; the `extract` step label reads "Profile prepared" in manual mode.
- [ ] The manual path follows the same authenticated policy as `/api/agent/intake`; there is no manual-entry bypass.

### FR-22 — Admin moderation surface for agentic scheme discovery (Phase 11 Feature 1)

**Description.** A long-running discovery agent watches a hardcoded allowlist of gazetted government source URLs, detects content drift, and queues `SchemeCandidate` records for an admin reviewer. Admins triage candidates from `/dashboard/discovery` (queue) and `/dashboard/discovery/[id]` (candidate detail with unified diff against the current rule). Approval is two-track: matched candidates stamp `verified_schemes/{scheme_id}.verifiedAt` (visible to all users as a "Source verified DD MMM YYYY" badge); ALL approved candidates additionally write a YAML manifest under `backend/data/discovered/` as the bridge artifact for the engineer who hand-codes the Pydantic rule.

**Acceptance criteria:**

- [ ] An email in `LAYAK_ADMIN_EMAIL_ALLOWLIST` (comma-separated, case-insensitive) is promoted to `role: admin` via Firebase custom claims on first authed request. Promotion is idempotent per process.
- [ ] Non-admin users hitting `/dashboard/discovery*` see no admin-route content and are redirected to `/dashboard`. The sidebar "Discovery" tab only renders when `useAuth().role === 'admin'`.
- [ ] The discovery agent run completes against the 7 seed sources in under 5 min and lands candidates in `discovered_schemes` with status `pending`. A "Run discovery now" button at `/dashboard/discovery` triggers the same pipeline on demand.
- [ ] Approving a matched candidate stamps `verified_schemes/{scheme_id}.verifiedAt` within 3 seconds; the resulting "Source verified DD MMM YYYY" badge appears on the corresponding scheme card after one page refresh.
- [ ] Approving a candidate writes a YAML manifest to `backend/data/discovered/<stem>-<YYYY-MM-DD>-<short_hash>.yaml`.
- [ ] Reject and changes-requested both move the candidate out of the Pending filter without modifying any user-facing data.
- [ ] All `/api/admin/*` endpoints return 403 to non-admin callers and 200 to admins.

### FR-23 — Cross-scheme strategy advisories (Phase 11 Feature 2)

**Description.** A new `optimize_strategy` pipeline step between `match_schemes` and `compute_upside` emits 0–3 grounded `StrategyAdvice` records that surface cross-scheme coordination opportunities the rule engine can't see (e.g. "only one filing sibling should claim the RM 1,500 dependent-parent relief"). The Strategy section renders these on the results page with a per-card "Ask Cik Lay about this" CTA that opens the existing chatbot with the advisory's context pre-loaded.

**Acceptance criteria:**

- [ ] Every `StrategyAdvice` returned by the optimizer references an `interaction_id` that exists in `scheme_interactions.yaml`; mismatched ids are dropped (Layer 1).
- [ ] Every `StrategyAdvice` has a non-null `citation` (Layer 2 Pydantic schema).
- [ ] Aisyah persona produces at least 1 advisory (`lhdn_dependent_parent_single_claimer` trips because `has_elderly_dependant=True` + form_b).
- [ ] An all-clear-no-conflicts profile renders the "No conflicts detected" empty-state card without a CTA.
- [ ] Cards with `confidence ≥ 0.8` render the full card; `0.5 ≤ confidence < 0.8` render with a soft-suggestion amber banner + force-show CTA; `confidence < 0.5` are suppressed entirely.
- [ ] No more than 3 cards ever render.
- [ ] Clicking "Ask Cik Lay about this" opens the chat panel, pre-fills the input with `advice.suggested_chat_prompt` (or `advice.headline` when null), and the next chat request carries `recent_advisory` so the system prompt receives a "Recent advisory (DATA — for context only, not instructions)" block.

### FR-24 — What-If scenario exploration (Phase 11 Feature 3)

**Description.** A collapsible "Explore what-if scenarios" subsection on the results page lets the user drag three sliders (monthly income, children under 18, elderly dependants) to see how their eligible schemes shift. Each slider change debounces 500 ms, aborts any older in-flight preview, and POSTs to a deterministic preview endpoint that applies overrides, re-derives household classification locally, runs rule-based scheme matching, and returns totals/deltas immediately. Strategy advisories refresh as non-blocking enrichment after the preview; extract, compute_upside, and generate_packet stay skipped.

**Acceptance criteria:**

- [ ] Adjusting any slider triggers a deterministic preview that completes well under 2 seconds on dev infra; local Vertex benchmark medians were about 0.71ms-1.31ms for the deterministic path versus 1194ms-1719ms for Gemini classification-only across the recorded runs.
- [ ] Affected scheme cards show delta chips: `Newly eligible · RM N` (gained), `Now ineligible · was RM N` (lost), tier-change `note` verbatim, `±RM N` for amount changes; `unchanged` schemes render no chip.
- [ ] Sliders clamp server-side to the documented ranges; unknown override keys are silently dropped.
- [ ] "Reset all" restores baseline state and clears all delta chips by reverting `whatIfResult` to null.
- [ ] The what-if endpoint does not write to Firestore (zero `.set` / `.update` / `.delete` calls).
- [ ] Strategy section auto-refreshes from a separate advisory refresh when the new profile changes which interaction rules trip; advisory failure does not invalidate deterministic scenario results.
- [ ] "Ask Cik Lay about this scenario" sends compact scenario context from the computed preview, separate from `recent_advisory`, so chat explains the supplied scenario without recomputing eligibility.
- [ ] Free-tier users get an additional rate limit of 5 calls / minute / uid; not counted against the daily evaluation quota. Pro tier bypasses.

### FR-25 — Two-tier reasoning surface (Phase 11 Feature 4)

**Description.** Replaces the thin pipeline-stepper with a two-tier UI that makes the agent's reasoning legible in the first 30 seconds. Tier 1 (always-visible lay narration): 6 short citation-bearing lines, one per pipeline step. Tier 2 (collapsed-by-default developer transcript): timestamps + tool names + Vertex retrieval hits with scores + Code Execution stdout excerpts + per-step latency.

**Acceptance criteria:**

- [ ] Every pipeline step (`extract`, `classify`, `match`, `optimize_strategy`, `compute_upside`, `generate`) emits one `PipelineNarrativeEvent` and one `PipelineTechnicalEvent` on completion.
- [ ] Tier 1 lay narration renders 6 lines, no jargon, no scheme IDs visible (scheme names only).
- [ ] Tier 2 technical transcript stays collapsed by default; expanding reveals timestamps, tool names, Vertex citations, latencies.
- [ ] Technical event log lines NEVER carry the profile's `name` or `address`; the only IC fragment surfaced is `***-**-{last4}`. Pytest enforces this contract.
- [ ] On the persisted results page, the narrative card renders in `retrospective` mode — collapsed to a one-line "Layak's pipeline completed across {{count}} steps." summary with a chevron to expand into the full two-tier replay.
- [ ] Multilingual: lay narration ships in en/ms/zh from the backend `_HEADLINES` catalog; technical transcript stays English (developer audience).

### FR-26 — BUDI95 RON95 petrol subsidy info-only card (Phase 12)

**Description.** Adds the BUDI95 targeted petrol subsidy (active since 30 Sep 2025; RM1.99/L for eligible Malaysians vs market price; 14.8M users by Feb 2026) to the scheme library as a **`subsidy_credit`-kind, info-only** rule. Eligibility is age-gated only (`age ≥ 16`) — no licence question, no consumption slider, no API call. The card carries a "Check your balance" CTA that opens [budi95.gov.my](https://www.budi95.gov.my/) in a new tab. **The scheme does NOT stack into the headline upside total** because we cannot confirm the user's actual remaining quota without a backend API integration.

**Acceptance criteria:**

- [ ] `app/rules/budi95.py` exports `match(profile) -> SchemeMatch` with `kind="subsidy_credit"`, `annual_rm=0.0`, and `qualifies=True` iff `profile.age >= 16`.
- [ ] At least three rule citations: eligibility (MOF 30 Sep 2025 press release), monthly quota cap (Maybank2u explainer), program reach (MOF Feb 2026 14.8M-users statement).
- [ ] `generate_packet` produces no `PacketDraft` for this scheme — there's nothing to draft.
- [ ] `compute_upside.total_annual_rm` is invariant whether or not BUDI95 qualifies (subsidy_credit kind is filtered from the sum).
- [ ] The scheme card surfaces the official portal as a "Check your balance" CTA, not a "Start application" button.
- [ ] Pytest guards: age 16 qualifies; age 15 doesn't; scheme contributes 0 to upside; no draft packet generated.

### FR-27 — MyKasih (SARA RM100) info-only card (Phase 12)

**Description.** Adds the SARA RM100 one-off MyKad credit (auto-loaded on 9 Feb 2026 to every Malaysian 18+ via the MyKasih platform) to the scheme library as a **`subsidy_credit`-kind, info-only** rule. The credit is **valid until 31 December 2026; unused balance is forfeited after that date** — surfaced prominently in bold on the card so users see the deadline. Eligibility is age-gated only (`age ≥ 18`). The card surfaces a "Check your balance" CTA pointing at [checkstatus.mykasih.net](https://checkstatus.mykasih.net/). **The scheme does NOT stack into the headline upside total** because the user may have already spent the credit, and we have no backend API to confirm remaining balance.

**Naming decision.** Layak's user-facing label is "MyKasih" (more memorable and widely Googled by the public) even though the official program name is "SARA Untuk Semua" (Sumbangan Asas Rahmah) delivered via the MyKasih platform. The rule's eligibility blurb + citations explicitly reference "SARA Untuk Semua via MyKasih" so the grounding chain is precise — only the display label is shortened.

**Acceptance criteria:**

- [ ] `app/rules/mykasih.py` exports `match(profile) -> SchemeMatch` with `scheme_id="mykasih"`, `scheme_name="MyKasih"`, `kind="subsidy_credit"`, `annual_rm=0.0`, `expires_at_iso="2026-12-31"`, and `qualifies=True` iff `profile.age >= 18`.
- [ ] At least four rule citations: eligibility (Malay Mail 5 Feb 2026 announcement), merchant network (MyKasih Foundation SARA page), expiry (SoyaCincau 9 Feb 2026 frozen-food article confirming 31 Dec 2026 forfeit), one-off nature (Edge Malaysia article).
- [ ] `generate_packet` produces no `PacketDraft`.
- [ ] `compute_upside.total_annual_rm` invariant w.r.t. this scheme.
- [ ] The frontend card renders a bold "Expires 31 Dec 2026" line (i18n: en "Expires 31 Dec 2026" / ms "Tamat 31 Dis 2026" / zh "2026 年 12 月 31 日到期"), formatted via `Intl.DateTimeFormat`. The line uses the hibiscus accent colour so the deadline pops visually.
- [ ] The card communicates the one-off / non-recurring nature so users don't carry RM100 into 2027 projections by default.
- [ ] Display label across en/ms/zh is "MyKasih" (no translation — it's a brand name); the eligibility hint text explains the SARA programme it delivers.
- [ ] Pytest guards: age 18 qualifies; age 17 doesn't; scheme contributes 0 to upside; no draft packet generated; `expires_at_iso == "2026-12-31"`; all four citations present.
- [ ] Rule auto-retirement hook: when `today > expires_at_iso`, the rule surfaces as a stale-rule candidate in `/dashboard/discovery` for admin retirement (or admin re-approval if MOF announces a 2027 tranche before then).

### FR-28 — Schemes-page "Latest Update" auto-derivation + day-1 seed (Phase 12)

**Description.** Replaces the hardcoded `'2026'` in `SchemesStatsStrip` with a `max(verified_at)` derivation across the `verified_schemes` Firestore collection, formatted as "Mon DD, YYYY" via the user's locale. The value auto-refreshes whenever an admin approves a new discovery candidate. A one-time seed script populates `verifiedAt` for every locked scheme with the deploy date so the tile shows a real value before any admin action.

**Acceptance criteria:**

- [ ] `scripts/seed_verified_schemes.py` idempotently upserts `verifiedAt=SERVER_TIMESTAMP` for every scheme in the rule registry that doesn't already have one. Documented to run on first deploy and after locking new rules into the codebase.
- [ ] `SchemesStatsStrip` lifts the "Latest Update" tile value from `GET /api/schemes/verified` (or a new `/api/schemes/stats` aggregator endpoint). Format: `Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' })`. ms/zh locales render their native month names.
- [ ] When the admin approves a new discovery candidate via `/dashboard/discovery/[id]`, the next page load of `/dashboard/schemes` reflects the new max date with no redeploy required.
- [ ] Fallback to `"—"` when the response is empty (shouldn't happen after seed, but defensive).

### FR-29 — Manual-entry IC removal (Phase 12)

**Description.** The manual-entry form drops the full-IC field (added in Phase 11 Task 13.5) and asks for `age` directly via a numeric input. The upload path is unchanged — Gemini OCR still extracts `ic_last6` from the uploaded MyKad image; that retention is the user's affirmative choice to upload an IC photo. The manual path now persists **zero IC information of any kind** — a strictly tighter PDPA posture than Phase 11 Task 13.5.

**Acceptance criteria:**

- [ ] `ManualEntryPayload.ic` (12-digit field added in 13.5) is removed; replaced with `age: int = Field(ge=0, le=130)`.
- [ ] `build_profile_from_manual_entry` reads `payload.age` directly and emits `Profile(ic_last6=None, age=payload.age, ...)`. The `_parse_ic` helper + two-digit-year disambiguation logic from 13.5 are removed.
- [ ] `Profile.ic_last6` becomes `str | None` (was required); upload path still sets it, manual path sets `None`.
- [ ] Jinja packet templates render `"— (manual entry; IC not collected)"` (or i18n equivalent) when `profile.ic_last6` is `None`.
- [ ] The frontend manual form drops the IC `Controller` block; adds a numeric `age` Input mirroring the dependant-age field; sample defaults use `age: 34` (Aisyah) / `age: 38` (Farhan).
- [ ] Privacy-page copy: manual-entry path now described as "we collect your age and household composition; no IC information of any kind." Upload-path copy unchanged.
- [ ] Backend `pytest` green after removing the four 13.5-era IC-parsing tests and adding `test_manual_profile_has_no_ic_last6`.

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

- Raw uploaded documents are processed in-memory and are not intentionally persisted by the application after extraction completes.
- Authenticated v2 flows persist user + evaluation records in Firestore (profile, classification, matches, upside trace, language, status) so history, results rehydration, quota enforcement, and PDPA export/delete can work.
- IC numbers are surfaced and persisted as last-6-digits only (place-of-birth code + serial); full IC numbers are never accepted in manual entry and must never be logged or written to Firestore as a single field.
- `.env` is git-ignored; `.env.example` is the only committed environment template.

### NFR-4 — Accessibility & responsiveness

- Passes the three viewport checks (375px, 768px, 1440px) for layout integrity.
- All interactive elements are keyboard-reachable.
- Alt text on every non-decorative image.
- Colour contrast ratios meet WCAG 2.1 AA for body copy.
- Plain-language copy throughout English, Bahasa Malaysia, and Simplified Chinese; source-language legal/proper-noun text is preserved where grounding depends on it.

### NFR-5 — Reliability

- Bundled PDF sources in `backend/data/schemes/` — live fetches to `hasil.gov.my`, `jkm.gov.my`, or `data.gov.my` are never on the critical path.
- Cached Aisyah / Farhan seed data is a one-click fallback (FR-10).
- Rule-engine unit tests run in CI and fail the build if any threshold value drifts from the cached PDFs without a deliberate version bump.

### NFR-6 — Security

- Cloud Run service account has the minimum Vertex AI access roles plus `roles/secretmanager.secretAccessor` for the Firebase admin secret; no broader privileges.
- Gemini access uses Vertex AI ADC via `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_LOCATION`; the backend secret mount is reserved for `FIREBASE_ADMIN_KEY`.
- HTTPS-only; Cloud Run defaults hold.
- No credentials, tokens, or IC values appear in any commit, log line, or UI string.
- AI disclosure section in README names Claude Code explicitly (hackathon Rules §4.2).

### NFR-7 — Session security

- ID tokens are verified on every authenticated call.
- CORS is pinned to the frontend origin.
- No PII is written to logs.

### NFR-8 — PDPA compliance

- Consent is captured before sign-up completes.
- Export and delete endpoints are functional for the signed-in user.
- Free-tier data retention is limited to 30 days.

### NFR-9 — Tier-aware rate limits

- Free tier is limited to 5 evaluations per rolling 24 hours.
- Pro tier is unlimited.
- The accepted race-condition behavior is documented.

## 6. Scope Boundaries

### 6.1 In scope (v1 — demo-night deliverables)

Mirrored verbatim from `docs/project-idea.md` §5. Ten items:

1. Single-page Next.js web app deployed at a Cloud Run HTTPS URL, localized to English, Bahasa Malaysia, and Simplified Chinese.
2. Document-upload widget accepting three image/PDF files (IC, payslip or e-wallet income screenshot, utility bill).
3. Gemini 2.5 Flash multimodal extraction into a strict JSON profile.
4. Hardcoded eligibility rule engine for STR 2026 (household-with-children tier), JKM Warga Emas, and five LHDN reliefs.
5. Gemini Code Execution arithmetic step computing annual RM upside per scheme + total.
6. Ranked scheme list ordered by RM upside.
7. Provenance panel: every rule cites its source PDF URL.
8. PDF packet generator producing three pre-filled drafts watermarked "DRAFT — NOT SUBMITTED."
9. Deterministic, localized "Why I qualify" explanation per scheme.
10. Hardcoded Aisyah / Farhan sample-data buttons for demo fallback.

### 6.1.1 Additional v2 deliverables

- User accounts via Firebase Auth / Google OAuth.
- Persistent storage in Firestore.
- Per-user evaluation history.
- Per-user language preference synced across devices.
- Tiered quotas: Free 5/24h, Pro unlimited.
- PDPA export and deletion endpoints.

### 6.2 Out of scope (v1 — explicit)

Mirrored verbatim from `docs/project-idea.md` §5. Any item below renders as a greyed-out "Checking… (v2)" card in the UI, never as a working feature.

- Live submission to any government portal (disqualification risk).
- Additional locales beyond English / Bahasa Malaysia / Simplified Chinese (for example Tamil).
- Schemes beyond the three locked: i-Saraan, PERKESO, MyKasih, eKasih, PADU sync, state-level aid (Kita Selangor, Penang elderly), SARA claim flow.
- Appeal workflow (BK-02 / BK-05 / JKM20).
- Mobile native app.
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
- Tax-form support beyond the current Form B / Form BE split.
- Stripe billing (deferred to v2.1).
- Email/password auth (deferred indefinitely).
- Admin panel (deferred — tier flips via gcloud/script).

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
- **Document upload has a known limitation.** MyKad, payslip, and utility-bill scans do not disclose household composition — the OCR pipeline cannot infer dependant rows from the files alone. The Upload intake therefore includes a supplemental Household editor that rides along with the multipart submission; leaving it empty still under-matches schemes that depend on dependants (JKM Warga Emas, LHDN child relief, LHDN parent medical relief). Sample personas prefill that Household editor so the demo path visibly models the full household before Continue starts evaluation.
- **v2 persists evaluation results (profile summary, scheme matches, total RM upside) to Firestore; original uploaded documents remain discarded after extraction; the packet watermark posture is unchanged.**
- **AI disclosure.** The README declares that this project was built with Claude Code (Anthropic) as the primary agentic coding assistant, per hackathon Rules §4.2. All AI-generated code is reviewed by human developers before commit.
