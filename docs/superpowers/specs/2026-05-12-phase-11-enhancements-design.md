# Phase 11 — Production-Grade SaaS Enhancements (Pre-Finals)

> **Status:** DESIGN — pending team review · target build window: 2026-05-12 (Tue) → 2026-05-15 (Fri) · demo: 2026-05-16 (Sat)
>
> **Scope contract:** Four locked features. Everything else is deferred to a post-finals roadmap section in the README. This is the explicit Option A scope decision the team aligned on after weighing Lifecycle Vigilance, Household Mode, and PDF Citation Viewer alternatives.

---

## 1. Context — why Phase 11 exists

Layak has been shortlisted into the Open Category finals of Project 2030: MyAI Future Hackathon (12 finalists in Track 2 — Citizens First, GovTech & Digital Services). The judging panel scores on a 100-point rubric weighted:

| Weight | Dimension                          |
| -----: | ---------------------------------- |
|     25 | AI Implementation & Tech Execution |
|     20 | Innovation & Creativity            |
|     20 | Impact & Problem Relevance         |
|     15 | Code Quality                       |
|     10 | UI/UX & Product Experience         |
|     10 | Pitch / Demo                       |

Layak's existing implementation (Phases 0–10) is technically strong but **surface-reads as an AI-powered OCR-and-rule-engine app**. The agentic depth (ADK SequentialAgent, Vertex AI Search RAG, Gemini Code Execution, six rule modules with citation provenance) is invisible in the first 30 seconds a judge spends on the app.

Phase 11 closes that gap by adding four production-grade features that **make the agentic substrate legible and elevate Layak from "submission prototype" to "platform with operator console + recurring user value."** None of the four features is a demo gimmick — each has standalone product-quality justification for a real SaaS roadmap.

The four features, in build order:

1. **Agentic Scheme Discovery + Admin Moderation** — the platform pillar
2. **Cross-Scheme Strategy Optimizer + Cik Lay handoff** — the reasoning pillar
3. **What-If Scenario Subsection on Results** — the adaptivity pillar
4. **Two-Tier Reasoning Surface** — the transparency pillar

---

## 2. Feature 1 — Agentic Scheme Discovery + Admin Moderation

### 2.1 Problem

Layak's six in-scope schemes (STR 2026, BK-01, JKM Warga Emas, BKK, i-Saraan, PERKESO SKSPS, LHDN Form B reliefs) are encoded as hardcoded Pydantic rule modules that were hand-derived from gazetted PDFs at development time. Rate changes (e.g., the Bajet 2021 BKK rate correction we already shipped) require an engineer to read the source, transcribe new thresholds, update the Pydantic rule, and redeploy. There is no automation, no admin visibility, and no way for the platform to surface "I noticed this rate changed" without engineer intervention.

This is a **product risk** (schemes go stale), an **operations risk** (no clear queue of pending updates), and a **storytelling risk** (judges see a static rule engine, not an agentic system).

### 2.2 Solution

A long-running, cron-triggered multi-agent pipeline that watches a fixed allowlist of authoritative government source URLs, detects content changes, extracts structured scheme-candidate records via Gemini 2.5 Pro structured output, and enqueues them in a moderation queue. An admin UI lets a human reviewer approve, request changes, or reject each candidate. Approved candidates become user-visible in two ways: (a) immediately, as a "verified_at" timestamp update on existing scheme cards, and (b) as a draft YAML manifest under `backend/data/discovered/` for engineer review when a brand-new scheme appears.

### 2.3 Pipeline topology

```
                       Cloud Scheduler (or manual trigger)
                                  │
                                  ▼
                       ┌──────── DiscoveryAgent ────────┐
                       │     (ADK LlmAgent + tools)     │
                       └────────────────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
   source_watcher_tool   extract_candidate_tool    publish_tool
   ──────────────────    ──────────────────────    ─────────────
   Fetches each URL      Gemini 2.5 Pro            On admin
   in the allowlist,     structured-output         approval, writes
   computes content      pass over the changed     to `verified_schemes`
   hash, diffs against   document content;         Firestore collection
   last-seen hash,       emits SchemeCandidate     and stamps
   emits "changed"       record with required      verified_at on
   events.               citation field.           the affected
                                                   scheme.
                                  │
                                  ▼
                         Firestore: discovered_schemes
                         { id, status: "pending"|"approved"|"rejected",
                           extracted_payload, source_url, content_hash,
                           created_at, reviewed_by, reviewed_at }
                                  │
                                  ▼
                          Admin UI moderation queue
                          (/admin/discovery)
```

### 2.4 Source allowlist (v1, hardcoded)

Lives in `backend/data/discovery_sources.yaml`. Each entry: `{ id, name, agency, url, content_selector (optional), check_frequency_hours }`. Initial seed:

| id            | source                                                    | agency  |
| ------------- | --------------------------------------------------------- | ------- |
| `str_2026`    | MOF Bajet 2026 STR information page                       | MOF     |
| `bk_01`       | MOF BK-01 (Bantuan Kanak-Kanak) brochure URL              | MOF     |
| `jkm_we`      | JKM Warga Emas program page                               | JKM     |
| `jkm_bkk`     | JKM BKK monthly assistance program page                   | JKM     |
| `lhdn_form_b` | LHDN public ruling for Form B reliefs                     | LHDN    |
| `i_saraan`    | KWSP i-Saraan voluntary contribution program page         | KWSP    |
| `sksps`       | PERKESO SKSPS Self-Employment Social Security scheme page | PERKESO |

**Out of scope (v2 roadmap):** open-web crawling, dynamic source registration via admin UI, allowlist editing in-product, broker-style RSS/Atom feeds.

### 2.5 Auth & role gating

The existing Firebase Admin SDK setup (`backend/app/auth.py:28`) already wires `firebase_admin.auth` + Firestore. Adding the admin role uses Firebase **custom claims**:

- **Bootstrap:** a new env var `LAYAK_ADMIN_EMAIL_ALLOWLIST` (comma-separated) on backend cold-start ensures any user whose email matches the allowlist receives the `{role: 'admin'}` custom claim on next token refresh.
- **Frontend gate:** `frontend/src/components/auth/auth-guard.tsx` extended with an `requireRole?: 'admin'` prop. `/admin/*` routes use the guard.
- **Backend gate:** a new `verify_admin_role(token)` helper in `auth.py` checks the `role` claim and 403s on mismatch. All `/api/admin/*` endpoints use it.

This is **not full RBAC** — it is a deliberately simple two-tier (user / admin) scheme appropriate for v1. A v2 roadmap line in the README captures the upgrade path to multi-reviewer workflows.

### 2.6 Admin UI surface

Two new routes under the existing `(app)` group:

- **`/admin/discovery`** — paginated queue table: candidate id, source agency, candidate name, status badge, age, "Review →" CTA. Filter chips: All / Pending / Approved / Rejected / Changed. Single Approve / Reject buttons in-row for fast triage.

- **`/admin/discovery/[id]`** — candidate detail page:
  - Left column: structured candidate fields (name, agency, eligibility summary, rate summary, citation snippet, source URL, AI confidence)
  - Right column: side-by-side **diff view** against the existing rule for that scheme (when matched) — old eligibility/rate vs proposed. Markdown-style diff highlighting.
  - Actions: `Approve` (immediate publish), `Request changes` (returns to pending with admin note), `Reject` (terminal).

The diff view is the single highest-trust feature of the admin UI — the reviewer must be able to see _exactly_ what's changing before approving.

### 2.7 Publishing — two-track on approve

On approve, the system performs both:

1. **Immediate user-visible update — for _matched_ candidates only.** When the candidate's `scheme_id` resolves to an existing hardcoded rule (the common case — a rate or eligibility tweak on a scheme Layak already supports), a `verified_schemes` Firestore collection is updated with per-scheme metadata: `{ scheme_id, verified_at, source_hash, last_known_payload }`. The public `/api/schemes` endpoint joins this with the hardcoded rule data so every scheme card on `/dashboard/schemes` and on results pages shows a "Source last verified: 2 days ago via automated discovery" badge.

2. **Engineer-track artifact — for _all_ approved candidates (matched + brand-new).** A YAML manifest file is written to `backend/data/discovered/<scheme_id-or-uuid>-<timestamp>.yaml` containing the structured candidate. Engineers use this as the canonical reference for updating the hardcoded Pydantic rule. **Layak does not auto-generate rule code from candidates** — that boundary is intentional and is called out explicitly in the README.

**Brand-new candidates (no matching `scheme_id`) do NOT appear in user evaluations** until an engineer hand-codes a Pydantic rule module for them and ships it in a follow-up release. The approval-time YAML is the bridge artifact. This is deliberate — autonomous scheme expansion without human rule-engineering review is a v2 concern.

### 2.8 Public-facing trust signal

Every scheme card across the app (`/dashboard/schemes`, results page scheme cards) gains a small footer line: **"Source verified DD MMM YYYY via automated discovery."** Tooltip on hover: "Layak's background agent re-reads the gazetted source every 24 hours and surfaces any rate or eligibility change to an admin reviewer before it reaches you."

### 2.9 Data shapes (Pydantic v2)

```python
class SchemeCandidate(BaseModel):
    candidate_id: str            # uuid4
    source_id: str               # foreign key into discovery_sources.yaml
    scheme_id: str | None        # matched to existing scheme, or None for new
    name: str
    agency: str
    eligibility_summary: str     # ≤ 800 chars, plain language
    rate_summary: str            # ≤ 400 chars, plain language
    citation: Citation           # required, non-null
    source_url: str
    source_content_hash: str
    extracted_at: datetime
    confidence: float            # 0–1, from Gemini self-reported

class CandidateRecord(BaseModel):
    candidate: SchemeCandidate
    status: Literal["pending", "approved", "rejected", "changes_requested"]
    reviewed_by: str | None      # firebase uid
    reviewed_at: datetime | None
    admin_note: str | None
```

### 2.10 Acceptance criteria

- [ ] Cron-triggered discovery run against the 7 seed sources completes in < 5 min with all candidates landing in `discovered_schemes` with status `pending`
- [ ] Manual-trigger button at `/admin/discovery` invokes the same pipeline on demand (for demo + dev)
- [ ] Approving a candidate stamps `verified_at` within 3 seconds; visible on the corresponding scheme card after one page refresh
- [ ] Approving a candidate writes a YAML to `backend/data/discovered/`
- [ ] Reject and changes-requested both move the candidate out of the active queue without modifying any user-facing data
- [ ] Non-admin users hitting `/admin/*` get a 403 with no admin-route content rendered (verified via auth-guard layer)
- [ ] All scheme cards across the app show a `verified_at` badge

---

## 3. Feature 2 — Cross-Scheme Strategy Optimizer + Cik Lay Handoff

### 3.1 Problem

Layak's current `rank_schemes` tool sorts matches by `annual_rm` descending. This is mathematically additive but **policy-incorrect** — Malaysian schemes interact (shared reliefs, liquidity tradeoffs, sequencing constraints), and naive additive ranking can over-promise or recommend conflicting claims. A truly production-grade GovTech advisor needs to layer **strategic reasoning** on top of eligibility matching.

### 3.2 Solution

Insert a new `OptimizerAgent` step into the existing ADK SequentialAgent **between `rank_schemes` and `generate_packet`** (it needs the post-rank ordering to focus analysis on top-candidate schemes, and it must run before packet generation so draft packets can reflect strategy advisories). The optimizer reads the ranked matches + the user profile, then produces 1–3 grounded `StrategyAdvice` records that the results page renders as a new "Strategy" section. The optimizer is **structurally incapable of asserting ungrounded claims** thanks to a five-layer grounding stack (§3.5).

For deeper exploration of any advisory, users click an `Ask Cik Lay about this` CTA that opens the existing results chatbot with the advisory's content pre-injected as context and a sensible follow-up question pre-populated in the input.

### 3.3 V1 scope decision — 3 hardcoded interaction rules

Encoding all real cross-scheme interactions in Malaysian tax/welfare policy is a multi-week research project. **V1 ships with three hardcoded interaction rules** that cover the Aisyah persona and the majority of Malaysian middle-class cases:

1. **`lhdn_dependent_parent_single_claimer`** — LHDN dependent-parent relief (RM 1,500/parent) is single-claimer-per-parent. If the filer has siblings who also file, the higher-bracket sibling should claim.
2. **`i_saraan_liquidity_tradeoff`** — i-Saraan returns RM 500/yr govt match but requires locking RM 3,333 in voluntary EPF contribution. Skip if the filer lacks RM 3,333 of liquid headroom.
3. **`lhdn_spouse_relief_filing_status`** — LHDN spouse relief (RM 4,000) requires joint assessment OR a non-working spouse with no separate Form B/BE income. Optimizer flags if spouse filing status is ambiguous in the profile.

These three rules cover ~80% of the realistic advisory surface for a working middle-class Malaysian household. The `scheme_interactions.yaml` schema is extensible — adding rule 4, 5, 6 is a YAML edit, not a code change.

### 3.4 Knowledge base — `scheme_interactions.yaml`

```yaml
- id: lhdn_dependent_parent_single_claimer
  applies_to: [lhdn_form_b, lhdn_form_be]
  trigger_conditions:
    - has_elderly_dependant: true
    - filer_has_siblings_filing_taxes: unknown # optimizer always advises when this is unknown
  rule: |
    LHDN dependent-parent relief is RM 1,500 per parent and can only be
    claimed by ONE filer per parent. When multiple siblings file taxes, the
    sibling in the highest marginal tax bracket maximises family-level cash
    benefit by being the sole claimer.
  advice_template: |
    Coordinate with siblings who also file taxes. Whichever sibling has the
    highest marginal tax bracket should claim the RM 1,500 dependent-parent
    relief — they save more total tax. Then split the cash benefit informally.
  severity: warn
  citation: { pdf: pr-no-4-2024.pdf, section: '§5.2', page: 12 }
  suggested_chat_prompt: |
    Who in my family should claim the dependent-parent relief, and how do
    we coordinate it on the LHDN portal?
```

(Two more rules follow the same shape. Full file lives at `backend/data/scheme_interactions.yaml`.)

### 3.5 Five-layer grounding architecture

Every layer is mandatory. The optimizer cannot bypass any of them.

| Layer | Mechanism                                                                                                                               | Failure mode                                        |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **1** | `scheme_interactions.yaml` registry — _no rule, no advice_                                                                              | Optimizer falls silent on unknown territory         |
| **2** | Pydantic `StrategyAdvice` schema with mandatory `interaction_id`, `citation`, `confidence` fields enforced via Gemini `response_schema` | Ungrounded output fails validation, dropped         |
| **3** | Post-Gemini Vertex AI Search re-grounding pass — verifies the citation exists in the source PDFs                                        | Fabricated page numbers caught, advice dropped      |
| **4** | Few-shot prompt with 4–5 hand-written Aisyah-style worked examples demonstrating exact shape, tone, grounding                           | Drift away from acceptable output shape is rare     |
| **5** | Frontend confidence-gated rendering: ≥0.8 full card; 0.5–0.8 soft suggestion routed to Cik Lay; <0.5 suppressed                         | Low-confidence claims never assert; degrade to chat |

### 3.6 `StrategyAdvice` data shape

```python
class StrategyAdvice(BaseModel):
    advice_id: str                     # uuid4 per result
    interaction_id: str                # MUST exist in scheme_interactions.yaml
    severity: Literal["info", "warn", "act"]
    headline: str                      # ≤ 80 chars, action-oriented
    rationale: str                     # ≤ 280 chars, plain language
    citation: Citation                 # required, non-null
    confidence: float                  # 0–1
    suggested_chat_prompt: str | None  # pre-populates Cik Lay input on handoff
    applies_to_scheme_ids: list[str]   # which matched schemes this advisory touches
```

### 3.7 UI surface — Strategy section on results page

Inserts **between** the ranked scheme cards and the draft-packet preview. Three cards maximum, vertical stack.

Each card renders:

- Status icon (`info` = blue dot, `warn` = amber triangle, `act` = green checkmark)
- Headline (font-medium, ≤ 80 chars)
- Rationale paragraph (≤ 280 chars, plain language)
- Citation line: "Cited: <pdf> §<section> p.<page>"
- Right-aligned bottom CTA: `Ask Cik Lay about this →` (only present when `suggested_chat_prompt` is non-null)

The CTA is intentionally low-density — it does not appear on every card, only on cards where deeper conversational exploration adds value. Pure-acknowledgment cards (e.g., "No conflicts detected, proceed as drafted") have no CTA.

### 3.8 Cik Lay handoff contract

The existing `results-chat-panel.tsx` already mounts on every results page variant. The handoff:

1. User clicks `Ask Cik Lay about this →` on a strategy card.
2. The card's `StrategyAdvice` payload is passed to a new `useChat().handoffFromAdvice(advice)` method.
3. The chat opens (if collapsed), and:
   - The chat's system context is augmented with a `recent_advisory` block containing the advice payload — the system prompt knows what the user was just looking at.
   - The chat's input field is pre-populated with `advice.suggested_chat_prompt`.
   - The first message bubble shown is a soft framing: "I see you're asking about: _<advisory headline>_. Here's the context I have so far…" — only renders when handoff-triggered, not on free-form chat opens.
4. User edits the pre-filled prompt or hits send.

The existing `backend/app/agents/chat_prompt.py:build_system_instruction` is extended to accept an optional `recent_advisory: StrategyAdvice | None` argument that injects the advisory into the system prompt's context section.

### 3.9 Cik Lay's existing grounding stays intact

Per Phase 10's hard-constrained system prompt and Vertex AI Search retrieval, Cik Lay already grounds responses on the user's evaluation context + the 9 source PDFs. The advisory handoff adds _additional_ context but does not relax any guardrail. Cik Lay's existing five-layer guardrails (input validator, output validator, safety settings, grounding, retry) remain unchanged.

### 3.10 Acceptance criteria

- [ ] Every `StrategyAdvice` returned by the optimizer references an `interaction_id` that exists in `scheme_interactions.yaml`; mismatch → validation error → card dropped
- [ ] Every `StrategyAdvice` has a non-null `citation` whose `(pdf, page)` pair Vertex AI Search confirms exists; mismatch → card dropped
- [ ] Aisyah persona produces at least 1 advisory (the dependent-parent coordination rule trips)
- [ ] An all-green-no-conflicts profile renders the "No conflicts detected" card without an `Ask Cik Lay` CTA
- [ ] Clicking `Ask Cik Lay about this →` opens the chat with pre-populated input AND injected system context (verifiable via opening DevTools and seeing the augmented payload)
- [ ] No more than 3 cards ever render
- [ ] Cards with `confidence < 0.5` never render
- [ ] Cards with `0.5 <= confidence < 0.8` render with degraded copy ("Layak isn't fully certain — worth asking Cik Lay") and force-show the CTA

---

## 4. Feature 3 — What-If Scenario Subsection on Results Page

### 4.1 Problem

The current results page is a snapshot of the user's eligibility at one frozen profile state. Users who want to explore "what changes if my income drops" or "what changes if I have a third child" must run a brand-new evaluation. This is friction at the moment of highest engagement (post-results, considering next moves).

### 4.2 Solution

A new collapsible subsection on the results page, between the Strategy section and the draft-packet preview, titled **"Explore what-if scenarios."** Contains three sliders bound to the most consequential profile fields:

| Slider                | Range      | Step |
| --------------------- | ---------- | ---- |
| Monthly income (RM)   | 0 – 15,000 | 100  |
| Dependants (children) | 0 – 6      | 1    |
| Elderly dependants    | 0 – 4      | 1    |

Each slider change debounces (500ms) then triggers a lightweight backend re-run that produces:

- An updated total annual upside RM
- Per-scheme delta chips (`+RM 1,200 STR moved Tier 2 → Tier 1`, `-RM 600 BKK now exceeds threshold`)
- A reordering animation on the scheme cards
- An optional re-run of the Optimizer step if the new profile changes which interaction rules trigger

### 4.3 Architecture — partial re-run, not full pipeline

The original five-step pipeline (`extract → classify → match → rank → generate`) does not need to re-run end-to-end for a what-if. The expensive steps (`extract`, `generate_packet`) are skipped. A new endpoint **`POST /api/evaluations/{evalId}/what-if`** runs only:

```
   ┌─ what-if endpoint ─┐
   │                    │
   │  classify_household │  (deterministic Python, cheap)
   │         │           │
   │         ▼           │
   │    match_schemes    │  (rule-engine evaluation against 6 schemes)
   │         │           │
   │         ▼           │
   │    rank_schemes     │  (sort)
   │         │           │
   │         ▼           │
   │   optimize_strategy │  (only if strategy section is in viewport)
   │                    │
   └────────────────────┘
```

Request payload:

```python
class WhatIfRequest(BaseModel):
    eval_id: str
    overrides: dict[str, Any]  # subset of profile fields, e.g. {"monthly_income_rm": 2500}
```

Response payload — slim, no PDF generation:

```python
class SchemeDelta(BaseModel):
    scheme_id: str
    status: Literal["gained", "lost", "tier_changed", "unchanged", "amount_changed"]
    baseline_annual_rm: float | None      # None when status == "gained"
    new_annual_rm: float | None           # None when status == "lost"
    delta_rm: float                       # signed; 0 when status == "unchanged"
    note: str | None                      # e.g. "Tier 2 → Tier 1"; max 80 chars

class WhatIfResponse(BaseModel):
    total_annual_rm: float
    matches: list[SchemeMatch]
    strategy: list[StrategyAdvice]
    deltas: list[SchemeDelta]   # which schemes gained/lost/changed-tier vs baseline
```

Note: `Citation`, `SchemeMatch`, and related types referenced throughout this spec are reused from the existing `backend/app/schema/scheme.py` module — Phase 11 does not redefine them.

The endpoint is **stateless** with respect to Firestore — it does not persist what-if results. The original evaluation remains the durable record; what-ifs are exploratory.

### 4.4 UI behaviour

The subsection is **collapsed by default** (single-line header: "Explore what-if scenarios"). Expanding it reveals the slider trio.

Each slider has:

- A current value chip ("RM 3,800 → RM 2,500")
- A "Reset to my actual" button per slider when modified
- A "Reset all" link at the section header

Below the sliders, a small "Recalculating…" indicator while in-flight, then:

- The annual upside hero number animates (CountUp library, already in deps if present) to the new value
- Affected scheme cards above the section get a coloured-border pulse animation (1 second)
- Delta chips appear under each scheme name: `+RM 1,200`, `Tier 2 → Tier 1`, `No change`, or `Now ineligible — RM <amount>`

When the user collapses the section or clicks "Reset all," the page reverts to the original evaluation values.

### 4.5 Acceptance criteria

- [ ] Adjusting any slider triggers a re-run that completes in < 2 seconds end-to-end (network + compute) on dev infra
- [ ] Total upside number animates smoothly to the new value (no flash-of-old-value)
- [ ] Affected scheme cards show delta chips; unaffected cards show "No change" pill
- [ ] Cards reorder when ranking changes (Framer Motion AnimatePresence or shadcn equivalent)
- [ ] "Reset all" restores baseline state and clears all delta chips
- [ ] The what-if endpoint does not write to Firestore (verified via test harness)
- [ ] What-if response includes refreshed Strategy advisories when the new profile changes which interaction rules trip
- [ ] Free-tier users get an additional rate limit on what-if calls (5 per minute) — not counted against evaluation quota

---

## 5. Feature 4 — Two-Tier Reasoning Surface

### 5.1 Problem

The current `pipeline-stepper.tsx` is a thin five-dot progress bar. It conveys "something is happening" but tells the user (and any judge watching) **nothing** about the agentic depth that's actually running. The full transcript of tool calls, Vertex AI Search hits, Code Execution stdout, and Gemini reasoning is invisible.

A naive fix — surface the full developer-grade transcript inline — would clutter the UI for the primary user (Aisyah-class laypeople). The right answer is a **two-tier surface**: a humanized, plain-language narration always-visible by default, plus a collapsible developer-grade transcript dropdown for users (and judges) who want to look deeper.

### 5.2 Solution

Replace `pipeline-stepper.tsx`'s visual treatment with a new `pipeline-narrative.tsx` component that streams two parallel layers from the backend.

**Tier 1 — Lay narration (default-visible).** 4–5 short, action-oriented, citation-bearing lines that read like a friendly progress log:

```
✓ Read your payslip — found gross pay RM 3,800
✓ Matched 6 schemes from the federal scheme library
✓ Verified each rate against the gazetted source
✓ Calculated your annual upside — RM 12,308
✓ Drafted 3 application packets ready to review
```

Each line is the output of one ADK tool, written in plain language by the tool itself (not by Gemini), and includes the key data point produced by that step.

**Tier 2 — Developer transcript (collapsed-by-default).** A `Show technical details ▾` chevron below the narration card. Expanded, it reveals a terminal-styled monospaced log:

```
[14:02:01] extract_profile
           → reading payslip.pdf line 17
           → gross_pay = RM 3,800 (Gemini Flash, conf 0.95, 1.2s)

[14:02:03] classify_household
           → per-capita = 3,800 / 4 = RM 950
           → income_band = B40 (LHDN §2.1 thresholds)
           → notes: ["household size: 4", "filer category: Form B", ...]

[14:02:05] match_schemes
           → querying Vertex AI Search: "STR 2026 household tier"
           → hit: risalah-str-2026.pdf p.4 §3.2 (score 0.91)
           → hit: bk-01.pdf p.7 §4.1 (score 0.88)
           → 6 schemes matched

[14:02:07] optimize_strategy
           → loaded scheme_interactions.yaml (3 rules)
           → triggered: lhdn_dependent_parent_single_claimer (conf 0.87)
           → 1 advisory produced

[14:02:08] compute_upside
           → Code Execution: total_annual_rm = 12,308

[14:02:09] generate_packet
           → 3 PDF drafts written via WeasyPrint (avg 218 KB)
```

### 5.3 Backend SSE contract

The existing pipeline SSE stream (`use-agent-pipeline.ts`) is extended to emit two new event types alongside the existing `step` event:

```python
class PipelineNarrativeEvent(BaseModel):
    type: Literal["narrative"] = "narrative"
    step: PipelineStep
    headline: str       # lay-tier text, ≤ 80 chars
    data_point: str | None  # the key value produced by the step, ≤ 40 chars

class PipelineTechnicalEvent(BaseModel):
    type: Literal["technical"] = "technical"
    step: PipelineStep
    timestamp: str      # ISO-8601
    log_lines: list[str]  # 1–N lines of monospaced log content
```

Each ADK tool's wrapper is updated to emit one of each (narrative + technical) on completion. Existing `step` and `done` events stay unchanged so no other consumer breaks.

### 5.4 UI surface

Two stacked sub-components inside `pipeline-narrative.tsx`:

- `<NarrativeLayer />` — always visible. Renders the headline + data_point of each `PipelineNarrativeEvent` as a single-line entry with a leading checkmark icon. Lines stream in as events arrive. Card has soft slate background and consistent vertical rhythm.
- `<TechnicalLayer />` — wrapped in a `<Collapsible>` (shadcn). Default closed. When opened, renders the `PipelineTechnicalEvent` payloads as monospaced log lines in a terminal-styled card (slightly darker bg, JetBrains Mono or similar).

When the pipeline completes, the entire narrative card collapses into a single summary line on the results page: "Layak's pipeline completed in 8.2 seconds — show details ▾" — which expands to reveal both tiers as a retrospective.

### 5.5 Acceptance criteria

- [ ] Every ADK tool emits both a `PipelineNarrativeEvent` and a `PipelineTechnicalEvent` on completion
- [ ] Tier 1 lay narration renders 4–6 lines, no jargon, no scheme IDs visible (use scheme names)
- [ ] Tier 2 technical transcript is collapsed by default
- [ ] Expanding the technical layer reveals timestamps, tool names, Vertex hits with scores, Code Execution stdout, latencies
- [ ] On results page (post-completion), the entire narrative card collapses to a one-line summary
- [ ] No regression on the existing pipeline progress bar (still emits `step` events for any backwards-compatible consumer)
- [ ] Multilingual: lay narration translates to ms / zh per the existing i18n pipeline; technical transcript stays English (developer audience)

---

## 6. Architecture changes (cross-feature)

### 6.1 TRD §1 statelessness correction

The current TRD §1 reads: _"The app is stateless — no DB, no GCS, no Firestore in v1."_ This is already inaccurate (Firebase Admin SDK + Firestore are wired for auth + quota), and Phase 11 takes it further (admin queue state, scheme verification timestamps).

**Update §1 to:** _"Stateless with respect to user-uploaded source documents — uploaded MyKad / payslip / utility files are processed in-memory during the pipeline and never persisted. Evaluation results (matches, upside, draft packets) are persisted in Firestore under `evaluations/{evalId}` for history retrieval, chat context, and what-if re-runs. Admin/auth state and operational metadata (discovered scheme candidates, scheme verification timestamps) also live in Firestore. Scheme rule code in `backend/app/rules/` remains the canonical source of truth for matching logic."_

This phrasing is precise on the privacy contract that actually matters (no user PDF blobs at rest) while honestly acknowledging the Firestore footprint that's already shipped (Phases 5–10) and the additions Phase 11 brings.

### 6.2 New Firestore collections

| Collection           | Purpose                                         | Access                   |
| -------------------- | ----------------------------------------------- | ------------------------ |
| `discovered_schemes` | Candidate queue + lifecycle                     | Admin read/write         |
| `verified_schemes`   | Per-scheme `verified_at` + `last_known_payload` | Public read; admin write |

### 6.3 New backend modules

| Path                                            | Purpose                                                  |
| ----------------------------------------------- | -------------------------------------------------------- |
| `backend/app/agents/tools/source_watcher.py`    | Fetch+hash+diff URL                                      |
| `backend/app/agents/tools/extract_candidate.py` | Gemini structured-output extractor                       |
| `backend/app/agents/tools/optimize_strategy.py` | Optimizer agent tool                                     |
| `backend/app/agents/discovery_agent.py`         | DiscoveryAgent runner (entry point for cron)             |
| `backend/app/data/discovery_sources.yaml`       | Source allowlist                                         |
| `backend/app/data/scheme_interactions.yaml`     | Optimizer knowledge base                                 |
| `backend/app/data/discovered/.gitkeep`          | Engineer-track YAML output directory                     |
| `backend/app/schema/discovery.py`               | SchemeCandidate, CandidateRecord                         |
| `backend/app/schema/strategy.py`                | StrategyAdvice                                           |
| `backend/app/schema/what_if.py`                 | WhatIfRequest, WhatIfResponse, SchemeDelta               |
| `backend/app/routes/admin.py`                   | Admin endpoints (queue, approve, reject, manual-trigger) |
| `backend/app/routes/what_if.py`                 | What-if endpoint                                         |

### 6.4 Modified backend modules

| Path                                | Change                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `backend/app/auth.py`               | Add `verify_admin_role`, custom-claim bootstrap from `LAYAK_ADMIN_EMAIL_ALLOWLIST` |
| `backend/app/agents/root_agent.py`  | Insert `OptimizerAgent` step between `match_schemes` and `generate_packet`         |
| `backend/app/agents/chat_prompt.py` | Accept optional `recent_advisory` in `build_system_instruction`                    |
| `backend/app/main.py`               | Mount admin + what-if routes                                                       |
| `backend/app/routes/chat.py`        | Accept advisory handoff context in chat request                                    |

### 6.5 New frontend modules

| Path                                                        | Purpose                                        |
| ----------------------------------------------------------- | ---------------------------------------------- |
| `frontend/src/app/(app)/admin/layout.tsx`                   | Admin-gated layout (role check via auth guard) |
| `frontend/src/app/(app)/admin/discovery/page.tsx`           | Discovery queue list                           |
| `frontend/src/app/(app)/admin/discovery/[id]/page.tsx`      | Candidate detail + diff view                   |
| `frontend/src/components/admin/discovery-queue.tsx`         | Queue table component                          |
| `frontend/src/components/admin/candidate-detail.tsx`        | Detail card + diff renderer                    |
| `frontend/src/components/admin/diff-view.tsx`               | Side-by-side diff component                    |
| `frontend/src/components/evaluation/strategy-section.tsx`   | Strategy section container                     |
| `frontend/src/components/evaluation/strategy-card.tsx`      | Individual advisory card                       |
| `frontend/src/components/evaluation/what-if-panel.tsx`      | What-if slider section                         |
| `frontend/src/components/evaluation/pipeline-narrative.tsx` | Two-tier reasoning surface (replaces stepper)  |
| `frontend/src/components/schemes/scheme-verified-badge.tsx` | `verified_at` badge component                  |
| `frontend/src/hooks/use-what-if.ts`                         | What-if SSE/POST consumer hook                 |
| `frontend/src/hooks/use-discovery-admin.ts`                 | Admin queue data hook                          |

### 6.6 Modified frontend modules

| Path                                                                     | Change                                                                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/auth/auth-guard.tsx`                            | Accept `requireRole?: 'admin'` prop                                                                           |
| `frontend/src/lib/auth-context.tsx`                                      | Surface custom-claim `role` from Firebase token                                                               |
| `frontend/src/components/evaluation/pipeline-stepper.tsx`                | Replaced by `pipeline-narrative.tsx` (file deletion + import updates)                                         |
| `frontend/src/components/evaluation/evaluation-results-by-id-client.tsx` | Mount Strategy section + What-if panel; pass eval context to chat handoff                                     |
| `frontend/src/components/evaluation/results-chat-panel.tsx`              | Accept advisory handoff payload                                                                               |
| `frontend/src/hooks/use-chat.ts`                                         | Expose `handoffFromAdvice(advice)` method                                                                     |
| `frontend/src/components/schemes/schemes-overview.tsx`                   | Render `verified_at` badge per card                                                                           |
| `frontend/src/components/evaluation/scheme-card-grid.tsx`                | Render `verified_at` badge per card                                                                           |
| `frontend/src/lib/i18n/locales/{en,ms,zh}.json`                          | New namespaces: `evaluation.strategy.*`, `evaluation.whatIf.*`, `evaluation.narrative.*`, `admin.discovery.*` |

### 6.7 New environment variables

| Name                             | Purpose                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| `LAYAK_ADMIN_EMAIL_ALLOWLIST`    | Comma-separated email allowlist for bootstrap admin role   |
| `LAYAK_DISCOVERY_CRON_TOKEN`     | Bearer token Cloud Scheduler presents to trigger discovery |
| `LAYAK_DISCOVERY_INTERVAL_HOURS` | Default 24; overridable for dev (e.g., 0 for manual-only)  |

---

## 7. Out of scope — deferred to v2 roadmap

Captured here so the team can point to the README's roadmap section when judges ask "what about X?"

- **PDF Citation Viewer** — clicking RM numbers to open inline-rendered PDF pages with cited paragraph highlighted. Deferred for laypeople-friction reasons; valuable as a v2 verification surface.
- **Lifecycle Vigilance Loop** — user-facing drift notifications when admin approves a discovery candidate; deadline pulse for scheme filing windows; outcome capture on submitted packets.
- **Household / Family Mode** — multi-member household profile, `ParallelAgent` per-member eval, aggregator agent.
- **Optimizer rule code-generation** — auto-emit Pydantic rule modules from accepted candidates.
- **Open-web crawling** — discovery agent scanning beyond the source allowlist.
- **Multi-reviewer admin workflow** — reviewer + approver split, audit log of who-approved-what.
- **Voice intake / Gemini Live API** — Bahasa Malaysia conversational profile capture.

Each of these is intentionally absent from Phase 11 to keep scope honest at ~6 working days of effort across the team.

---

## 8. Risk register

| Risk                                                               | Severity | Mitigation                                                                                                         |
| ------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------ |
| Optimizer hallucinates a non-existent interaction rule             | High     | 5-layer grounding stack; `interaction_id` must exist in registry                                                   |
| Optimizer cites a fabricated PDF page                              | High     | Vertex AI Search re-grounding pass; mismatch drops the card                                                        |
| Discovery agent fails on demo day (Cloud Scheduler / Gemini quota) | Medium   | Manual-trigger button at `/admin/discovery` always works                                                           |
| Admin role bootstrap fails (env var typo)                          | Medium   | Bootstrap is idempotent on every cold start; logs misses verbosely                                                 |
| What-if re-run exceeds 2-second budget on cold Cloud Run instance  | Low      | Re-run skips extract + generate; only classify + match + rank + (optionally) optimize. All deterministic / cached. |
| Scope creep past 4 features                                        | High     | This spec hard-locks the 4. Team aligns before deviation.                                                          |
| Phase 11 build slips into Saturday                                 | High     | Buffer day Friday is mandatory; ship at hour 72/96 not hour 96/96                                                  |
| Cik Lay handoff context injection breaks existing chat guardrails  | Medium   | Handoff augments system prompt only; all 5 existing guardrails remain. Add regression test.                        |
| Verified_at badge causes layout regression on small schemes cards  | Low      | Component renders inline within existing card footer; no layout shift expected.                                    |

---

## 9. Testing posture

Consistent with the existing project (no frontend test harness; backend has 297 passing pytest cases as of Phase 10).

**Backend (mandatory, lock contracts before frontend consumes):**

- `backend/tests/test_discovery_pipeline.py` — DiscoveryAgent end-to-end against a fixture URL with a synthetic content hash diff
- `backend/tests/test_extract_candidate.py` — extractor against 2–3 ground-truth gov-PDF snippets; asserts `SchemeCandidate` schema validity + citation presence
- `backend/tests/test_strategy_optimizer.py` — Aisyah persona produces expected `lhdn_dependent_parent_single_claimer` advisory; all-clear profile produces no warning cards; confidence-gating tests
- `backend/tests/test_admin_routes.py` — non-admin 403 on every `/api/admin/*` endpoint; admin 200; approve/reject lifecycle; manual-trigger flow
- `backend/tests/test_what_if.py` — what-if endpoint vs original evaluation; idempotency; rate-limit
- `backend/tests/test_chat_prompt.py` — handoff context augmentation (new advisory block in system prompt)
- `backend/tests/test_pipeline_narrative.py` — every tool emits both `PipelineNarrativeEvent` and `PipelineTechnicalEvent`

**Frontend (manual smoke + lint, no harness):**

- Manual walkthrough on dev: trigger discovery → review candidate → approve → see badge updated
- Manual walkthrough: Aisyah eval → see Strategy section render → click Ask Cik Lay → verify pre-fill + context
- Manual walkthrough: drag what-if sliders → numbers animate → reset works
- Manual walkthrough: pipeline runs → narrative shows → expand technical → all tools represented
- `pnpm -C frontend lint` + `pnpm -C frontend build` clean on every commit

**Cross-feature regression:** Phase 10 chatbot keeps its existing test suite passing; no Phase 11 change relaxes any chatbot guardrail.

---

## 10. Documentation updates

- `docs/trd.md` — §1 statelessness correction; new §5.8 (Agentic Discovery), §5.9 (Strategy Optimizer), §5.10 (What-If), §5.11 (Two-Tier Reasoning Surface)
- `docs/prd.md` — Add FR-11 (admin moderation), FR-12 (strategy advisories), FR-13 (what-if exploration), FR-14 (reasoning transparency); NFR additions on admin role gating and optimizer grounding
- `docs/progress.md` — One dated entry per Phase 11 task on completion
- `README.md` — AI disclosure section (Claude Code / Codex / Copilot CLI usage); architecture diagram; deferred-to-v2 roadmap section explicitly listing the 7 items in §7

---

## 11. Open questions for team discussion

These are intentionally surfaced for the team meeting, not pre-decided in this spec:

1. **Who owns Optimizer prompt-and-grounding tuning?** This is the highest-risk subtask; needs a single owner with policy reading comfort.
2. **Do we ship the Cloud Scheduler integration for Phase 11, or stay manual-trigger-only with Scheduler as a stretch goal?** Manual-only is simpler; Scheduler is more demo-impressive but adds a deploy step.
3. **Admin email allowlist values?** Team needs to decide whose Gmail accounts get bootstrap admin access for the demo.
4. **Do we update the existing Aisyah fixture to include `filer_has_siblings_filing_taxes: true`** so the dependent-parent advisory trips reliably in the demo run, or do we leave it at the more realistic `unknown` value (which also trips the advisory by design)?
5. **YAML manifest output on approve** — strict file naming convention? Suggested: `<scheme_id>-<YYYY-MM-DD>-<short_hash>.yaml`.
6. **`verified_at` badge — show on every scheme card, or only on the Schemes Overview page?** Tradeoff: clarity vs visual density on results page.
7. **What-if rate limit** — 5/min/user reasonable? Adjusts based on Cloud Run capacity.

---

## 12. Build sequencing recommendation

To minimize integration risk, recommend this build order across the four features:

1. **(Day 1, Tue PM)** Auth role + admin route gating + TRD statelessness correction (foundation; unblocks Feature 1 admin UI)
2. **(Day 1–2, Tue–Wed)** Feature 4 (Two-Tier Reasoning Surface) — small, isolated; gets reasoning legible early
3. **(Day 2–3, Wed–Thu)** Feature 1 (Agentic Discovery + Admin Moderation) — longest pole; parallelize: backend pipeline + admin UI by separate owners
4. **(Day 3, Thu)** Feature 2 (Cross-Scheme Optimizer + Cik Lay) — slot OptimizerAgent into root_agent.py + Strategy UI + Cik Lay context augmentation
5. **(Day 4, Fri)** Feature 3 (What-If Scenario Subsection) — composes naturally with Feature 2; ship last
6. **(Day 4 PM, Fri)** Demo rehearsal + bug-fix only

Critical path: Auth role → admin UI → discovery integration → publishing. If this slips, Feature 1 ships in degraded form (manual queue, no Cloud Scheduler) before any other feature is dropped.

---

**End of design.**
