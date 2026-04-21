# Layak v2 — Production SaaS Pivot (Design Spec)

**Status:** Approved, awaiting implementation plan
**Date:** 21 April 2026
**Author:** PO2 (Adam) + Claude Code brainstorm
**Scope:** Post-hackathon evolution of Layak from a stateless demo into an authenticated, tier-gated, production SaaS. v1 (the hackathon submission being handed in tonight, 21 Apr 23:00 MYT) is preserved as shipped; v2 layers new capabilities on top. Deadline for v2 SaaS: **24 April 2026 · 23:59 MYT**.

**Out of scope for this spec:** `docs/roadmap.md` updates (the roadmap is the record of the 24 h sprint and stays frozen).

---

## 1. Context & Goal

Layak v1 is a stateless, anonymous single-page agent that processes three uploaded documents and returns a ranked list of Malaysian social-assistance schemes with provenance-cited rule packets. It ships tonight per `docs/roadmap.md`.

Layak v2 turns the same pipeline into a production SaaS:

- **Authenticated users** (Google OAuth only) with per-user evaluation history.
- **Tiered model:** Free = 5 evaluations per rolling 24 hours, 30-day history retention. Pro = unlimited evaluations, unlimited history, priority queue, CSV export, early access to new schemes.
- **Three-route evaluation flow:** summary/history, upload, results — each a distinct URL with a persistent, shareable (owner-gated) results ID.
- **Persisted evaluations** in Firestore; uploaded documents are still discarded post-extraction (privacy invariant preserved from v1).
- **Marketing landing** with pricing and an inlined "How It Works" section (moved out of the dashboard).
- **PDPA 2010 posture:** explicit sign-up consent, data export, account deletion, 30-day free-tier auto-prune, plain-English privacy notice.

**Non-goals for v2:**

- Stripe billing. Pro is a boolean `tier` field flipped manually for waitlist approvals. Checkout and subscription management deferred to v2.1.
- Email/password authentication. Google OAuth only.
- Guest mode. The "Use Aisyah sample documents" path survives, but only post-login as an in-product demo trigger.
- A separate admin panel. Tier flips happen via `gcloud firestore` or a one-off script.

---

## 2. Scope & Route Map

### 2.1 Public (unauthenticated) routes

| Route                  | Purpose                                                                                                                                                                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                    | Marketing landing: hero, "How It Works" (moved here from `/dashboard/how-it-works`, **Gemini Code Execution mentions stripped**), pricing grid (Free / Pro), CTA "Continue with Google." The "DRAFT packets only — you stay in control" copy is **removed** (the packet watermark carries the invariant). |
| `/sign-in`, `/sign-up` | Same component; single "Continue with Google" button; post-auth redirect to `/dashboard`. Sign-up requires a PDPA consent checkbox before the OAuth popup opens.                                                                                                                                          |
| `/privacy`             | PDPA-compliant privacy notice (static).                                                                                                                                                                                                                                                                   |
| `/terms`               | Terms of use (static).                                                                                                                                                                                                                                                                                    |

### 2.2 Authenticated (dashboard) routes

| Route                                | Purpose                                                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`                         | Greeting, `TierBadge`, `QuotaMeter`, Start Evaluation CTA, active applications placeholder, recent activity (last 3 evaluations).                                                      |
| `/dashboard/evaluation`              | Summary + history: `AggregateStatsCards` (total evaluations, cumulative RM identified, unique schemes qualified) + paginated `EvaluationHistoryTable`.                                 |
| `/dashboard/evaluation/upload`       | Intake form (three file inputs with REQUIRED pills, "Use Aisyah sample documents" button). Submit → creates Firestore evaluation doc → routes to `/dashboard/evaluation/results/[id]`. |
| `/dashboard/evaluation/results/[id]` | Results screen (RM hero, ranked scheme list, provenance panel, packet download). Owner-gated via Firestore rule.                                                                       |
| `/dashboard/schemes`                 | Scheme catalog. No structural change from v1.                                                                                                                                          |
| `/settings`                          | Profile (read-only Google fields), tier card + "Upgrade to Pro" waitlist modal, danger zone (export data / delete account).                                                            |

### 2.3 Routes removed / changed

- `/dashboard/how-it-works` — **removed.** Content relocated to a section on `/`.
- Old `/dashboard/evaluation/` (single-page upload + pipeline + results) — **split** into `/evaluation`, `/evaluation/upload`, `/evaluation/results/[id]`.

---

## 3. Architecture & Data Model

### 3.1 Service topology

No change to v1 service count:

- **Frontend** (Next.js 16, Cloud Run) + Firebase Auth client SDK (Google OAuth).
- **Backend** (FastAPI + ADK-Python, Cloud Run) + `firebase-admin` (ID token verification) + `google-cloud-firestore` (persistence).
- **Firestore** (new, `asia-southeast1`) — users + evaluations + waitlist collections.
- **Cloud Scheduler → Cloud Run Job** (new) — nightly free-tier 30-day prune at 02:00 MYT.

No GCS bucket. No Memorystore. No Cloud SQL.

### 3.2 Auth flow

1. User clicks "Continue with Google" on `/sign-in` or `/sign-up`. Firebase Auth client SDK opens the OAuth popup.
2. On success the client receives a Firebase ID token; Firebase stores it in IndexedDB by default.
3. Every backend call attaches `Authorization: Bearer <id-token>` via a fetch wrapper.
4. Backend FastAPI dependency verifies the token with `firebase_admin.auth.verify_id_token`, extracts `uid`, injects it as `request.user_id`.
5. First authenticated request for a new user lazy-creates `users/{userId}` with `tier="free"`. No Cloud Function trigger needed.

### 3.3 Firestore schema (top-level, flat `userId` field for simpler queries)

```
users/{userId}
  email:           string
  displayName:     string
  photoURL:        string
  tier:            "free" | "pro"
  createdAt:       timestamp
  lastLoginAt:     timestamp
  pdpaConsentAt:   timestamp | null

evaluations/{evalId}
  userId:          string (indexed)
  status:          "running" | "complete" | "error"
  createdAt:       timestamp (indexed — rate-limit window)
  completedAt:     timestamp | null
  profile:         Profile (embedded; IC last-4 only)
  classification:  HouseholdClassification (embedded)
  matches:         SchemeMatch[] (embedded)
  totalAnnualRM:   number
  stepStates:      { extract, classify, match, computeUpside, generate }
  error:           null | { step: string, message: string }

waitlist/{autoId}
  email:           string
  userId:          string (the signed-in user at the time)
  createdAt:       timestamp
```

**Composite indexes:**

- `evaluations`: `(userId ASC, createdAt DESC)` — powers history view and rate-limit count.

### 3.4 Firestore security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read:  if request.auth.uid == userId;
      allow write: if false;  // backend (Admin SDK) only
    }
    match /evaluations/{evalId} {
      allow read:  if request.auth.uid == resource.data.userId;
      allow write: if false;  // backend (Admin SDK) only
    }
    match /waitlist/{entry} {
      allow create: if request.auth.uid != null;
      allow read, update, delete: if false;
    }
  }
}
```

### 3.5 Evaluation lifecycle

1. `POST /api/agent/intake` (authed, multipart three files) — backend creates `evaluations/{evalId}` with `status="running"`, `userId=<uid>`, `createdAt=now()`.
2. Backend runs the existing ADK `SequentialAgent` pipeline. On each `step_result` it streams an SSE event **and** writes `stepStates[step] = "complete"` + any step payload to Firestore.
3. On the final `done` event the backend writes `status="complete"`, `completedAt`, `profile`, `classification`, `matches`, `totalAnnualRM` in a single Firestore write, then emits the terminal SSE event.
4. Frontend upload page consumes the SSE to drive the pipeline stepper live, and navigates to `/dashboard/evaluation/results/[id]` on `done`.
5. `/results/[id]` reads the Firestore doc first. If `status === "running"` the page subscribes to Firestore realtime updates (not SSE) — this handles refresh/deep-link scenarios. On `status === "complete"` it renders the RM hero, scheme list, provenance panel, packet download.
6. If an error occurs mid-pipeline: backend writes `status="error"`, `error={step, message}`; UI renders the existing `ErrorRecoveryCard` with "Try sample documents" and "Start over" actions.

### 3.6 Rate limit

Free tier: ≤ 5 evaluations per rolling 24 hours. Enforcement before SSE opens:

```python
if user.tier == "free":
    count = (
        firestore.collection("evaluations")
        .where("userId", "==", uid)
        .where("createdAt", ">=", now - timedelta(hours=24))
        .count()
        .get()
    )
    if count >= 5:
        return JSONResponse(
            {"error": "rate_limit", "resetAt": ...},
            status_code=429,
            headers={"X-RateLimit-Reset": ...},
        )
```

Race-condition note: concurrent submissions can squeeze past the cap by 1-2. Accepted trade-off; this is a UX cap, not a billing boundary. Documented in TRD.

### 3.7 Packet generation

Unchanged logic, **regenerated on demand** from the stored profile + matches (no packet PDFs persisted). `GET /api/evaluations/{id}/packet` → backend reads Firestore eval → WeasyPrint renders three PDFs from embedded data → returns ZIP. No GCS.

### 3.8 PDPA endpoints

- `GET /api/user/export` — JSON dump of `users/{userId}` + all `evaluations` where `userId==<uid>`. Served as file attachment.
- `DELETE /api/user` — transactional cascade: deletes all `evaluations` for the user, deletes `users/{userId}`, calls `firebase_admin.auth.delete_user(uid)`. Signs the user out client-side after success.

### 3.9 Nightly prune job

Cloud Run Job (`layak-prune-free-tier`), triggered by Cloud Scheduler at 02:00 MYT daily. Logic:

```python
cutoff = now() - timedelta(days=30)
free_users = firestore.collection("users").where("tier", "==", "free").stream()
for u in free_users:
    stale = (
        firestore.collection("evaluations")
        .where("userId", "==", u.id)
        .where("createdAt", "<", cutoff)
        .stream()
    )
    for doc in stale:
        doc.reference.delete()
```

Runs in under a minute for expected v2 volume. Observability: job emits count of deleted docs to Cloud Logging.

### 3.10 Supabase fallback (documented, not built)

If Firebase Auth or Firestore presents a blocker within the first sprint day of v2, fall back to:

- **Auth:** Supabase Auth with the Google OAuth provider.
- **DB:** Supabase Postgres with row-level-security policies keyed on `auth.uid()`.
- **Schema translation:** `users` table + `evaluations` table with JSONB columns for `profile`, `classification`, `matches`; `waitlist` table unchanged shape.
- **Security rules:** RLS policies (`CREATE POLICY … USING (auth.uid() = user_id)`).
- **Migration cost:** ~1 day. Trigger: PO1 calls it; both accept without re-debate.

---

## 4. UX / Component Changes

### 4.1 Landing page (`/`) — full rewrite (unauthenticated)

- Hero: tagline + "Continue with Google" primary CTA.
- How It Works section: moved inline from `/dashboard/how-it-works`; **all Gemini Code Execution mentions stripped**.
- Pricing grid: two cards side-by-side —
  - **Free:** 5 evaluations per 24 h · 30-day history · the three locked schemes (STR, JKM Warga Emas, LHDN) · watermarked draft packets.
  - **Pro:** Unlimited evaluations · unlimited history · priority queue · CSV export of evaluation history · early access to new schemes.

- Footer: `/privacy`, `/terms`, `/sign-in` links.
- **Removed copy:** "DRAFT packets only — you stay in control" — redundant against the PDF watermark.

### 4.2 Auth pages (`/sign-in`, `/sign-up`)

Single full-viewport card, Google button, loading spinner during OAuth, error toast on failure. `/sign-up` renders the same layout but positions the PDPA consent checkbox above the Google button.

### 4.3 New authenticated components

- **`QuotaMeter`** — topbar or `/dashboard` hero. "3 of 5 evaluations used today" + linear progress bar for Free; "Unlimited" pill for Pro. Polls Firestore count query on mount with 30-second client cache.
- **`TierBadge`** — Free / Pro pill, visible in `UserMenu` dropdown and `/settings`.
- **`StartEvaluationCTA`** — `/dashboard` primary button → `/dashboard/evaluation/upload`. Disabled when quota exhausted, with reset-at tooltip.
- **`EvaluationHistoryTable`** — `/dashboard/evaluation`, paginated 20/page, columns date / status / RM / actions. Row → `/results/[id]`. Empty state: "No evaluations yet" + CTA.
- **`AggregateStatsCards`** — three cards above the history table: total evaluations, cumulative RM identified, unique schemes qualified.
- **`UpgradeWaitlistModal`** — captures email (pre-filled from Google), writes to `waitlist` collection. Triggered by any Pro gate.

### 4.4 Settings (`/settings`)

- **Profile card:** email, displayName, photoURL (from Google, read-only).
- **Tier card:** `TierBadge` + "Upgrade to Pro" button (opens waitlist modal).
- **Danger zone:** "Export my data" (downloads JSON), "Delete my account" (confirm dialog → cascade delete + sign-out).

### 4.5 Existing-component changes

- `Sidebar`: remove `How It Works` nav link.
- `UserMenu`: Google photo, email, `TierBadge`, Settings, Sign Out. Remove the mock profile placeholder.
- `Topbar` breadcrumbs: add `results/[id]` case (label `Results`).
- `EvaluationProvider` context: extend to hydrate from Firestore on direct `/results/[id]` navigation.

### 4.6 Width-consistency fix (Phase 1 UI bug)

Single shell in `(app)/layout.tsx`: `max-w-5xl mx-auto px-4 md:px-6`. Remove per-page width overrides.

### 4.7 Components unchanged

`/dashboard/schemes` content, `/dashboard/evaluation/upload` widget UX, the pipeline stepper, the scheme card + provenance panel + packet download components.

---

## 5. Security & PDPA Posture

### 5.1 Auth boundary

- All `/api/**` dashboard endpoints require `Depends(current_user)`. Only `/api/health` is anonymous.
- CORS pinned to the frontend Cloud Run origin.
- Backend uses `firebase-admin` (bypasses Firestore security rules); the rules gate the client SDK and eliminate a class of "client writes bad data" bugs.

### 5.2 PDPA 2010 compliance

- **Consent gate:** sign-up flow requires a PDPA consent checkbox before the OAuth popup. Timestamp stored as `pdpaConsentAt` on the user doc. Re-consent is required if the privacy notice's "last updated" date advances.
- **Minimised collection:** Google profile (email, displayName, photoURL), Firebase UID, and per-evaluation: extracted Profile with IC last-4 only (v1 invariant preserved — full 12-digit IC never persisted), classification, matches. Uploaded documents are discarded after extraction.
- **Retention:** Free tier 30-day rolling window (nightly prune). Pro tier indefinite. Deleted accounts cascade synchronously.
- **User rights:** `GET /api/user/export` (access) and `DELETE /api/user` (deletion). Rectification is out of scope for v2 (all derived data; user re-runs evaluation to rectify).
- **Notice contents at `/privacy`:** categories of data, purposes, retention, PDPA rights, data-controller contact, breach-notification commitment.
- **Transport / at-rest:** HTTPS-only (Cloud Run defaults), Firestore encrypts by default, Firebase Auth tokens over TLS.

### 5.3 Secrets

- New: `firebase-admin-key` (service account JSON) in GCP Secret Manager, mounted via `--set-secrets=FIREBASE_ADMIN_KEY=firebase-admin-key:latest`.
- Existing: `gemini-api-key` unchanged.
- Frontend Firebase config values (API key, auth domain, project ID, etc.) are publishable and baked into the Next.js build env — not secret. They still live in `.env` for local dev and `--set-env-vars` for prod.

---

## 6. Migration Path (v1 → v2)

| Component                                        | v1 state                                 | v2 change                                                                                                                          |
| ------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `backend/app/main.py` `/api/agent/intake`        | anonymous, multipart → SSE               | add `Depends(current_user)` + rate-limit check + pre-pipeline Firestore doc create + per-step writes + final-state write on `done` |
| `backend/app/agents/root_agent.py`               | profile/matches only                     | accepts `eval_id` + `user_id`; writes step results to Firestore alongside SSE emission                                             |
| `backend/app/schema/`                            | `Profile`, `SchemeMatch`, `Packet`, etc. | add `UserDoc`, `EvaluationDoc` mirroring Firestore shape; existing models embedded as sub-documents                                |
| `backend/app/auth.py`                            | —                                        | new module: `current_user` dep, Firebase Admin init, Firestore client factory                                                      |
| `backend/app/routes/user.py`                     | —                                        | new: export + delete endpoints                                                                                                     |
| `backend/app/routes/evaluations.py`              | —                                        | new: list, get-by-id, packet regeneration                                                                                          |
| `backend/scripts/prune_free_tier.py`             | —                                        | new: nightly prune job entrypoint                                                                                                  |
| `frontend/src/app/page.tsx`                      | current-style home                       | replaced by marketing landing (Section 4.1)                                                                                        |
| `frontend/src/app/(app)/**`                      | dashboard routes                         | wrap in `<AuthGuard>`; add ID-token fetch wrapper                                                                                  |
| `frontend/src/app/(app)/dashboard/evaluation/**` | single page                              | split into summary / upload / results/[id]                                                                                         |
| `frontend/src/lib/firebase.ts`                   | —                                        | new: client SDK init + providers + fetch wrapper                                                                                   |
| `frontend/src/components/layout/sidebar.tsx`     | has How It Works link                    | remove link                                                                                                                        |
| `frontend/src/components/layout/user-menu.tsx`   | mock profile                             | live Google profile + `TierBadge` + Settings + Sign Out                                                                            |
| `NEXT_PUBLIC_USE_MOCK_SSE` flag                  | dev fixture replay                       | kept as dev-only; "Use Aisyah sample documents" button posts real PDFs through the real backend so Firestore is populated          |
| `/public/fixtures/`                              | —                                        | new: three bundled synthetic PDFs for the sample-documents button                                                                  |
| `.env`                                           | `GEMINI_API_KEY`, VAIS vars              | add backend `FIREBASE_ADMIN_KEY`; add `NEXT_PUBLIC_FIREBASE_*` client config                                                       |

---

## 7. Phase Structure for `plan.md`

### 7.1 Phase 1 appendages (v1 UI bugs)

Append to the existing Phase 1 section as tasks 7-10 (or equivalent numbering). All PO2.

1. **Refinement: Width-consistency pass.** Single shell in `(app)/layout.tsx` (`max-w-5xl mx-auto px-4 md:px-6`); remove per-page overrides.
2. **Refactor: Move How It Works content to landing page.** Inline the pipeline visual into `/`; strip `/dashboard/how-it-works` route.
3. **Refinement: Strip Gemini Code Execution mentions.** Delete copy referencing it from UI (landing, dashboard, how-it-works).
4. **Refinement: Remove "DRAFT packets only — you stay in control" from landing.** Packet watermark carries the invariant.

### 7.2 Phase X (submission) — deadline updated

Hard submit moves from 21 Apr 23:00 MYT → **24 Apr 23:59 MYT**. Buffer windows shift proportionally.

### 7.3 New phases for v2 SaaS

**Phase 2 — SaaS Foundation (Auth + Firestore wiring).**

Goal: signed-in user reaches `/dashboard` with a verified Firebase token; `users/{userId}` exists.

Tasks:

- Firebase project + Firestore setup (PO1).
- Backend auth middleware + Admin SDK init + security rules deploy (PO1).
- Frontend Firebase SDK + `<AuthGuard>` + `/sign-in` + `/sign-up` pages + ID-token fetch wrapper (PO2).
- Integration smoke test (Both).

Exit: fresh browser → Google sign-in → `/dashboard` renders → user doc exists → authed fetch succeeds.

**Phase 3 — Persisted Evaluations + Rate Limiting.**

Goal: signed-in user runs an evaluation, it persists to Firestore, the results page lives at `/results/[id]`, free-tier caps at 5/24 h.

Tasks:

- Backend eval persistence: doc lifecycle + list / get-by-id / packet regeneration endpoints (PO1).
- Rate-limit check before SSE opens (PO1).
- Frontend 3-route split: `/evaluation`, `/evaluation/upload`, `/evaluation/results/[id]` (PO2).
- `QuotaMeter` + 429 handling with waitlist modal (PO2).
- Aisyah fixtures promoted to real uploads (three PDFs in `public/fixtures/`); dev-only mock SSE flag retained (PO2).

Exit: sign-in → upload → SSE streams pipeline → results/[id] persists → a 6th evaluation within 24 h returns 429.

**Phase 4 — Dashboard UX (History, Stats, Settings).**

Goal: paid-feeling dashboard.

Tasks:

- `EvaluationHistoryTable` + pagination + empty state (PO2).
- `AggregateStatsCards` (PO2).
- Settings page (profile, tier card, danger zone) (PO2).
- Backend PDPA endpoints (export + cascade delete) (PO1).
- Waitlist Firestore collection + `UpgradeWaitlistModal` (PO2).

Exit: history renders for a user with ≥ 1 evaluation; export downloads a JSON; delete removes user + evaluations + Firebase Auth record; waitlist captures emails.

**Phase 5 — Marketing Landing + Legal.**

Goal: an anonymous visitor at `/` reads the pitch, pricing, and How It Works; signs up with PDPA consent.

Tasks:

- Landing page rewrite (PO2).
- `/privacy` + `/terms` static pages (PO2).
- Sign-up PDPA consent gate wiring (PO2).
- Auth page polish (PO2).

Exit: anon visitor reads pitch + pricing + How It Works; signs up with consent; lands on `/dashboard`.

**Phase 6 — Production Cutover.**

Goal: live at `https://layak.tech` with nightly prune; submission package refreshed.

Tasks:

- Cloud Scheduler + nightly prune Cloud Run Job (PO1).
- `.tech` domain claim via Student Copilot + Cloud Run custom-domain mapping + DNS (PO2).
- Firebase service account in Secret Manager; prod deploy with `--min-instances=1 --cpu-boost` on both services (PO1).
- Prod smoke: incognito `layak.tech` → sign up → evaluation → history from a fresh device (Both).
- Submission package refresh: README v2, re-recorded video reflecting the SaaS flow, deck updates; Google Form resubmit before 24 Apr 23:59 (Both).

Exit: `layak.tech` works end-to-end from a fresh device; updated submission package is in the repo and submitted.

---

## 8. Doc-Update Mapping

### 8.1 `docs/plan.md`

- Append four Phase 1 UI bug tasks (Section 7.1 above).
- Update Phase X deadline to 24 Apr 23:59 MYT; shift buffer windows.
- Add Phase 2 through Phase 6 with the breakdown in Section 7.3, matching the existing plan's task density (Purpose/Issue, Implementation, Exit criteria).

### 8.2 `docs/prd.md`

- Update header to note this PRD now covers v1 (hackathon demo build) **and** v2 (production SaaS).
- Update §3 Target Users: retain Aisyah as the primary free-tier persona; add a short secondary note on "paying Pro users" without inventing a full persona (TBD post-launch).
- Add FR-11 through FR-20 for v2:
  - **FR-11 Google OAuth sign-in** — "Continue with Google" button works on first use; ID token stored client-side; failed OAuth shows a retryable error surface.
  - **FR-12 PDPA-consent sign-up gate** — checkbox required before OAuth on `/sign-up`; `pdpaConsentAt` timestamp persisted.
  - **FR-13 Persisted per-user evaluation history** — `/dashboard/evaluation` lists the signed-in user's evaluations in reverse-chronological order; foreign user IDs never appear in a response.
  - **FR-14 Free-tier quota** — a 6th evaluation started within 24 h of the first returns HTTP 429 with `X-RateLimit-Reset`; UI routes to the waitlist modal.
  - **FR-15 Shareable (owner-gated) results URL** — `/dashboard/evaluation/results/[id]` renders for the owner; returns 404 for any other authenticated user; returns to sign-in for anonymous visitors.
  - **FR-16 Settings profile + tier card** — shows Google profile fields read-only; `TierBadge` reflects Firestore `tier` field; "Upgrade" opens the waitlist modal.
  - **FR-17 Data-export and account-deletion endpoints** — `GET /api/user/export` returns a JSON bundle; `DELETE /api/user` cascades through Firestore and Firebase Auth; user is signed out client-side after success.
  - **FR-18 Nightly 30-day prune** — Cloud Scheduler triggers a Cloud Run Job that deletes free-tier evaluations older than 30 days; Pro evaluations unaffected.
  - **FR-19 Marketing landing page** — `/` renders for anonymous visitors with hero, How It Works, pricing, and footer; CTA routes to `/sign-in`.
  - **FR-20 Privacy notice + terms** — `/privacy` and `/terms` render as static pages; both are linked from the landing footer and the sign-up consent copy.

- Each FR follows the existing style (Description + falsifiable acceptance criteria as a bullet list).
- Add NFRs:
  - **NFR-7 Session security** — ID tokens verified on every authed call; CORS pinned to frontend origin; no PII in logs.
  - **NFR-8 PDPA compliance** — consent captured, export + delete endpoints functional, 30-day free-tier retention enforced.
  - **NFR-9 Tier-aware rate limits** — free tier 5 evaluations / 24 h; Pro unlimited; race condition acceptable (documented).

- Update §6 Scope Boundaries:
  - Move from "out of scope" to "in scope (v2)": user accounts, persistent storage, per-user evaluation history, tiered quotas, PDPA export/deletion.
  - Keep in "out of scope": Stripe billing (deferred to v2.1), email/password auth, live government-portal submission (remains invariant), Malay/Chinese/Tamil UI, the other scheme expansions.

- Update §7 Disclaimers to note that v2 persists evaluations but still does not persist original uploaded documents, and the packet watermark posture is unchanged.

### 8.3 `docs/trd.md`

- Update header to note dual-module coverage (v1 demo build + v2 SaaS).
- Update §1 Architecture Overview with the v2 topology (Firebase Auth, Firestore, Cloud Scheduler, Cloud Run Job).
- Update §2 Architecture Diagram:
  - Extend the system-topology ASCII with a Firestore node and an "Authenticated browser" lane.
  - Add a §2.3 Auth flow diagram showing the OAuth popup → ID token → Authorization header → `verify_id_token` → user_id injection.

- Update §3 Component Responsibilities table with Firebase Auth, Firestore, Cloud Scheduler, Cloud Run Job rows.
- Update §4 Data Flow with the authed lifecycle: sign-in → rate-limit check → Firestore doc create → streamed pipeline → step-wise writes → final state → `/results/[id]` reads Firestore.
- Add a new §5.5 "Firestore as the session + archive layer" covering schema, indexes, security rules, and migration notes.
- Add §6.7 "New environment variables" covering `FIREBASE_ADMIN_KEY` (backend, Secret Manager) and `NEXT_PUBLIC_FIREBASE_*` (frontend, build-time).
- Update §7 Security & Secrets to cover ID-token verification, Firestore security rules, PDPA posture, and the new secret.
- Update §8 Feasible-Minimum Tech Stack (Plan B): keep the existing Vertex AI Search collapse note; add a new §8.2 "Supabase fallback for the auth + DB layer" with the schema translation, RLS policy template, and the "PO1 calls it" trigger protocol.
- Add §9.7 "Rate-limit race condition" to Open Questions (acknowledged-and-accepted).
- Update §10 Phase ownership matrix with Phase 2 through Phase 6 rows mapped to `plan.md` tasks.

---

## 9. Open Questions / Deferrals

- **Stripe billing:** deferred to v2.1. Pro tier is a manual flip at launch.
- **Email/password auth:** deferred indefinitely. Google OAuth only.
- **Admin panel:** deferred. Tier flips happen via `gcloud firestore` or a one-off script.
- **i18n:** English-only in v2. Malay/Chinese/Tamil deferred.
- **Additional schemes:** same three-scheme scope as v1. New schemes gated behind Pro at launch (for narrative), added in v2.1+.
- **Pro-tier mechanics at launch:** only the rate-limit uncap is enforced programmatically. The other Pro benefits on the pricing card (priority queue, CSV export, early access to new schemes) are promised in marketing copy for the waitlist and implemented as v2.1 tasks. Documented here so implementers know not to stretch Phase 4 scope for them.
- **Observability:** rely on Cloud Run / Firestore built-in logging + metrics at launch. No custom dashboards, Cloud Monitoring alerts, or error-tracking SaaS (Sentry, etc.) are in v2.0 scope. Revisit after first week of real traffic.

---

## 10. Approval Trail

- All five design sections (scope + routes, architecture + data model, UX + components, security + PDPA + migration, plan.md phase structure) reviewed and approved inline during brainstorm on 21 April 2026.
- Open decisions resolved: stack (Firebase Auth + Firestore, Supabase fallback); billing (manual toggle, waitlist modal); persistence scope (eval records only, no GCS); auth providers (Google only); deadline (24 Apr 23:59 MYT).
- Ready to translate into `docs/plan.md`, `docs/prd.md`, `docs/trd.md` via Copilot CLI.
