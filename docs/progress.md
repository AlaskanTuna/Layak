# PROGRESS (AGENT ONLY)

> Refer to `docs/plan.md` when recording completed tasks.

---

## [22/04/26] - Phase 4 Task 4 PO1: PDPA export + cascade-delete endpoints

PO1's Phase 4 Task 4 — authed users can now exercise PDPA 2010 §26 (data-subject access) and §34 (right-to-erasure) via two REST endpoints. No admin-impersonation path exposed; every caller only touches their own data.

- **`backend/app/routes/user.py` (new).**
  - `GET /api/user/export` — streams the caller's `users/{uid}` doc + all their `evaluations` (ordered `createdAt DESC`) as a JSON attachment. Body shape: `{uid, exportedAt:<ISO-8601 UTC>, schemaVersion:1, user, evaluations:[{id, ...rest}]}`. Headers: `Content-Disposition: attachment; filename="layak-export-{uid}.json"` + `Cache-Control: no-store` (personal data). Timestamps serialised through `_serialise_doc` which converts `DatetimeWithNanoseconds` to ISO strings.
  - `DELETE /api/user` — cascade: (1) batch-delete every `evaluations/{evalId}` where `userId == uid` in chunks of 450 ops (stays under the 500-op-per-batch Firestore cap so Pro users with hundreds of evals still complete cleanly), (2) delete `users/{uid}`, (3) `fb_auth.delete_user(uid)`. Ordering is deliberate — Firestore-first, Auth-last — so a partial failure never leaves the user with an active session AND live records. `UserNotFoundError` on step 3 is idempotent (logged + treated as success on retry). Other Auth failures after Firestore success return 500 with a retry hint; the Firestore half is idempotent-by-being-empty on retry.
- **`backend/app/main.py`**: mounted `user_router` alongside `evaluations_router`.
- **Tests** — `backend/tests/test_user_routes.py` — 10 cases: auth wall on both endpoints; export happy path (asserts `eval_collection.where` scoped to `userId == uid`, validates ISO timestamp serialisation, attachment header, `Cache-Control: no-store`); export with no evals; export with missing user doc (200 + `user:null`, not 404); delete cascade (3 evals + user doc = 4 batch deletes, `auth.delete_user(uid)` called exactly once with the right uid); delete idempotent on `UserNotFoundError`; **critical invariant** — delete 500 on Firestore failure NEVER calls `auth.delete_user`; delete 500 on Auth failure after Firestore success returns a descriptive detail mentioning retry; delete batches 950 evals via multiple batch commits. All 10 pass.
- **Full backend suite**: 156/156 green (123 prior + 10 new PDPA + 23 new sanitiser tests from the Manual Entry review below). Ruff clean.

---

## [22/04/26] - Manual Entry review: input sanitisation, monthly_cost_rm field, utility-bill reverted to Optional, address cap 500→300

Post-launch hardening pass on Phase 3 Task 6 (Manual Entry Mode) following PO1's review. Every free-text field now runs through a Unicode-aware sanitiser before reaching Gemini prompts or WeasyPrint templates; the utility-bill section is optional again; RM cost now sits above kWh; prompt-injection backstop added on the classify step.

- **`backend/app/schema/sanitize.py` (new).** Single place for free-text scrubbing. `sanitize_free_text(value, max_length, allow_newlines=False)` strips every character whose Unicode general category is `Cc` (control), `Cf` (format — includes zero-width joiner/non-joiner/BOM, LTR/RTL override, LTR/RTL embed, bidi isolate), `Cs` (surrogate), or `Co` (private-use). `\t` and `\n` are whitelisted explicitly; newlines downgrade to spaces on single-line fields. NFKC-normalises so fullwidth / halfwidth / compatibility variants collapse (prevents duplicate Firestore docs for visually-same names). Collapses `[ \t]+` runs to a single space; clamps 3+ newline runs to 2 (paragraph break). Raises `ValueError` on empty-after-cleaning so Pydantic re-raises as 422. Two wrappers: `sanitize_name` (200-grapheme cap, single-line) and `sanitize_address` (300-grapheme cap, multi-line).
- **`backend/app/schema/manual_entry.py`**: `name` and `address` now typed as `Annotated[str, AfterValidator(sanitize_name)]` / `AfterValidator(sanitize_address)`. Address `max_length` tightened from 500 → 300. New `monthly_cost_rm: float | None` (ge=0, le=100_000). Field order on the payload: `address` → `monthly_cost_rm` → `monthly_kwh` → `dependants`.
- **`backend/app/schema/profile.py`**: mirror `monthly_cost_rm: float | None`. Profile round-trips cleanly through Firestore.
- **`backend/app/agents/tools/build_profile.py`**: threads `monthly_cost_rm` from payload → Profile.
- **`backend/app/agents/tools/extract.py`**: added `monthly_cost_rm` bullet to the Gemini extract prompt so the upload path can populate it from the TNB bill's RM total when visible.
- **`backend/app/agents/tools/classify.py`**: added a **Security** paragraph to the prompt — instructs Gemini to treat `name` and `address` as data-only, ignore any instruction-shaped text inside them. Defence-in-depth alongside the content sanitiser; Gemini response is still shape-validated through `HouseholdClassification.model_validate_json`.
- **Frontend — `manual-entry-form.tsx`**: Utility bill section reverted from Required → **Optional** (green pill). New `monthly_cost_rm` field rendered **above** `monthly_kwh` with help copy that acknowledges users recall RM more readily than kWh (`"The RM amount on the bottom of your latest TNB bill. Most people remember this more easily than kWh."`). Address `<Textarea maxLength={300}>` matches the backend cap. Zod schema extended with `monthly_cost_rm` regex (`/^\d+(\.\d{1,2})?$/`, max 100,000). Aisyah default: `monthly_cost_rm: '95.40'` (realistic for a 220 kWh household in Kuantan).
- **Frontend — `agent-types.ts`**: `Profile.monthly_cost_rm?` + `ManualEntryPayload.monthly_cost_rm` added.
- **Tests** — `backend/tests/test_sanitize.py` (23 cases): control-char stripping; tab/newline preservation-when-allowed; newline downgrade-when-not; RTL override stripped; zero-width joiner + BOM stripped; bidi isolate stripped; CJK + diacritics preserved (Malaysian happy path); NFKC fullwidth→halfwidth; whitespace collapsing; surrounding-whitespace trim; empty-after-cleaning rejection; whitespace-only rejection; max-length truncation; non-string input rejection; `sanitize_name` 200-cap + whitespace reject + newline downgrade; `sanitize_address` 300-cap + newline preservation + control-strip-with-newlines + 3+-newline clamping; prompt-injection regression cases (RTL-embedded "system:" prefix stripped to visible text; legit "Ignore Ibrahim" name not stripped — sanitisation is NOT semantic filtering).
- **Review findings documented** in `docs/plan.md` under Phase 3 Task 6's post-launch pass — including three noted-but-not-actioned items for future hardening: total-payload token cap (belt-and-braces on top of per-field caps), frontend mirror of the sanitiser (defence-in-depth UX), and Gemini structured-output schema revisit when the SDK's `extra="forbid"` dialect issue is resolved.
- **Full backend suite**: 156/156 green; ruff clean. Frontend `pnpm lint` + `tsc --noEmit` clean.

---

## [22/04/26] - Phase 3 Tasks 3-5 PO2: persisted results route, QuotaMeter + 429 waitlist, real Aisyah fixtures

PO2 landed the persisted results split, quota UI, and real fixture upload path so the Phase 3 dashboard flow now matches the Firestore-backed backend. `frontend/src/app/(app)/dashboard/evaluation/results/[id]/page.tsx` now owns the deep-link route, with `frontend/src/app/pages/evaluation/evaluation-results-by-id-page.tsx` and `frontend/src/components/evaluation/evaluation-results-by-id-client.tsx` handling the Firestore-first re-entry and 2s polling while `status === "running"`. `frontend/src/components/evaluation/persisted-packet-download.tsx` streams `GET /api/evaluations/{id}/packet` so regenerated ZIPs come from the stored doc instead of the transient SSE path.

`frontend/src/components/dashboard/quota-meter.tsx` now reads `GET /api/quota` on mount and refresh, and the upload flow routes `429` responses through `frontend/src/hooks/use-agent-pipeline.ts` into `frontend/src/components/settings/upgrade-waitlist-modal.tsx` with the backend reset timestamp attached. `backend/app/routes/quota.py` exposes the public `get_used_count` and `estimate_reset_at` helpers extracted from `backend/app/services/rate_limit.py`, and `frontend/src/components/dashboard/dashboard-hero.tsx` plus the upload page now surface the quota state before the user hits the cap.

`backend/scripts/generate_aisyah_fixtures.py` now builds the three synthetic PDFs with WeasyPrint, watermarks them `SYNTHETIC — FOR DEMO ONLY`, and lands them in `frontend/public/fixtures/`. `frontend/src/lib/aisyah-fixtures.ts` fetches those PDFs as `File` objects, applies `AISYAH_DEPENDANT_OVERRIDES`, and `frontend/src/components/upload/upload-widget.tsx` sends the real files through the live intake path while `NEXT_PUBLIC_USE_MOCK_SSE=1` remains the dev replay escape hatch. Frontend build green; backend ruff + 123/123 pytest still green. Phase 3 PO2 queue closed; awaiting joint pre-demo browser smoke for Phase 2 Task 4 sub-steps 4-5.

---

## [22/04/26] - Phase 3 Task 2 PO1: free-tier rate-limit preflight (5 evals / 24h)

Free-tier users now hit a preflight quota check BEFORE the intake route opens its SSE stream. The 6th evaluation within a rolling 24-hour window returns HTTP 429 with `X-RateLimit-Reset` plus a JSON body shaped for the Phase 4 waitlist modal and `QuotaMeter`. Pro-tier users bypass the check entirely. Spec §3.6's race-condition trade-off (1-2 over-cap submissions on concurrent requests) is accepted as documented.

- **`backend/app/services/rate_limit.py` (new).** `enforce_quota(db, user)` runs `.where("userId","==",uid).where("createdAt",">=",now-24h).count().get()` and returns:
  - `None` if Pro tier (skips Firestore entirely) or if the count is under `FREE_TIER_LIMIT = 5`.
  - `JSONResponse(status_code=429, ...)` otherwise — body `{error:"rate_limit", tier:"free", limit:5, windowHours:24, resetAt:<ISO-8601>, message}`; headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (unix seconds), `Retry-After` (seconds).
  - `_estimate_reset_at` runs a secondary `order_by("createdAt").limit(1).stream()` to find the oldest eval in window; reset = oldest + 24h. Falls back to `now + 24h` when the lookup fails or returns empty.
  - Fail-open on Firestore errors — a transient outage shouldn't hard-block users; the race-condition trade-off already accepts minor over-cap slippage.
- **`backend/app/auth.py`**: extended `UserInfo` with `tier: str = "free"` (default for ergonomics). `_upsert_user_doc` now returns the tier read from the existing snapshot — no extra Firestore round-trip because we already had the snapshot in hand. `current_user` threads the returned tier into the constructed `UserInfo`.
- **`backend/app/main.py`**: both `/api/agent/intake` and `/api/agent/intake_manual` call `enforce_quota(db, user)` AFTER `CurrentUser` resolves but BEFORE `create_running_evaluation` writes anything. On 429 the route returns the response directly — no Firestore write, no SSE stream, no model time consumed. Route return type widened from `StreamingResponse` to `Response` to reflect the two-shape return.
- **Audit followup (Phase 3 Task 1 Warning)**: fixed the stale 403/404 docstrings in `backend/app/routes/evaluations.py` — the code correctly returns 404 (not 403) on wrong-owner access to avoid leaking existence, but the docstrings said otherwise. Rewrote both the method and the `_load_owned_evaluation` helper comments.
- **Tests**: `backend/tests/test_rate_limit.py` — 10 cases. Unit tests for `enforce_quota`: Pro bypass (asserts `db.collection` is NEVER called), free under cap, free at zero, 429 body + headers shape (validates every header and body key including ISO-8601 `resetAt` alignment to the oldest-eval `+24h`), 429 above cap, reset-time fallback when oldest-lookup is empty (→ `now + 24h`), reset-time fallback on `order_by` exception (→ `now + 24h`), fail-open on count-query exception (→ None), count-shape tolerance for the bare-`.value` SDK variant (driven by `_extract_count`'s three-level descent). Plus one integration test against `/api/agent/intake_manual` that mocks an at-cap count, asserts the route returns 429 with `X-RateLimit-Limit` + `Retry-After` headers and a `{error:"rate_limit"}` body, AND asserts `eval_collection.document` was never called — proving no Firestore write happened on a rate-limited request.
- **Fixture updates**: existing `test_manual_entry.py` and `test_evaluations_routes.py` user-snapshot mocks now explicitly set `to_dict.return_value = {"tier": "free"}` so `_upsert_user_doc`'s tier read resolves deterministically instead of relying on MagicMock's truthy-but-uncastable auto-attribute.
- **Full backend suite: 123/123 green** (113 prior + 10 new). Ruff clean.
- **Not yet deployed**; commit + push + CI/CD redeploy lands next, then live smoke.

---

## [21/04/26] - Phase 3 Task 1 PO1: evaluations persistence layer + read routes + packet regen

PO1's Phase 3 Task 1 — every evaluation now lands in `evaluations/{evalId}` Firestore alongside the SSE stream, with list/get/packet read endpoints on top. Packets stay unpersisted (regenerated on demand from stored profile + matches, per spec §3.7). Addresses all three forward-compat Gaps flagged by the Phase 2 Task 4 subagent audit.

- **`backend/app/services/evaluation_persistence.py` (new).** Two entry points:
  - `create_running_evaluation(db, user_id, profile=None)` — inserts `evaluations/{evalId}` with `status="running"`, `userId`, `createdAt=SERVER_TIMESTAMP`, `stepStates` all `pending`, embedded `profile` when the manual path already has it (upload path passes `None`; extract fills it later). Raises `HTTPException(503)` on Firestore write failure so the intake route converts it to a retryable status before any SSE stream opens — fix for the forward-compat audit's mid-route-Firestore-failure Gap.
  - `persist_event_stream(events, eval_id, doc_ref)` async generator that wraps `stream_agent_events`. Forwards every event verbatim, mirrors the event's effect to Firestore via `doc_ref.update(...)`, and stamps `eval_id` onto the yielded `DoneEvent` / `ErrorEvent` via `event.model_copy(update={"eval_id": ...})`. Firestore write failures mid-stream are logged + swallowed so SSE never hangs on a persistence hiccup. Error sanitisation runs via `sanitize_error_message` before the `error.message` hits Firestore (privacy invariant NFR-3).
- **`backend/app/schema/firestore.py` (new).** Pydantic mirrors: `UserDoc`, `EvaluationDoc`, `StepStates` (per-step state: `pending|running|complete|error`), `EvaluationError` (`{step, message}`), plus `EvaluationStatus` / `Tier` / `StepState` literals. `extra="forbid"` across the board. Firestore's camelCase field names (`userId`, `createdAt`, `totalAnnualRM`) preserved with `# noqa: N815` suppressing the lint — the wire shape has to match Firestore and the frontend.
- **`backend/app/schema/events.py`**: added optional `eval_id: str \| None = None` to `DoneEvent` + `ErrorEvent`. Frontend `agent-types.ts` mirrors — `DoneEvent.eval_id?` on the TypeScript side.
- **`backend/app/auth.py`**: added public `get_firestore()` wrapper (re-export of `_get_firestore`) so Phase 3+ route modules get a clean public API without reaching for the module-private — addresses the forward-compat audit's first Gap.
- **`backend/app/routes/evaluations.py` (new).** Three endpoints, all authed via `CurrentUser`:
  - `GET /api/evaluations?limit=N` — paginated list (default 20, max 50), newest-first; uses the `(userId ASC, createdAt DESC)` composite index. Returns a slim `EvaluationListItem` per row (id / status / totalAnnualRM / createdAt / completedAt) — heavy profile + matches fields only on detail fetch.
  - `GET /api/evaluations/{eval_id}` — full `EvaluationDoc`. Owner-gated: returns 404 (not 403) when `data.userId != user.uid` so existence of another user's eval is not leaked to a guesser.
  - `GET /api/evaluations/{eval_id}/packet` — reads Firestore → rebuilds `Profile` + `SchemeMatch[]` via Pydantic validation → calls `generate_packet(...)` → zips the three base64-decoded PDFs with `ZIP_DEFLATED` → returns `Response(media_type="application/zip", Content-Disposition=attachment...)`. 409 if `profile` is still null (extract hasn't run); 500 on shape drift; 404 on missing or non-owner.
- **`backend/app/main.py`**: intake routes now call `create_running_evaluation` before opening the stream and pipe events through `persist_event_stream`. Mounted the evaluations router. Factored repeated `StreamingResponse` headers into `_SSE_HEADERS`.
- **Tests (25 new cases across two files)**:
  - `backend/tests/test_evaluation_persistence.py` — 13 cases: `create_running_evaluation` initial shape (with / without profile) + 503 on Firestore failure; per-event-type mirror assertions for each of the five steps + done + error; Firestore failure swallow; order-preservation; privacy sanitisation on the error path (asserts a 12-digit IC in an error message is redacted to `[redacted]` before hitting Firestore); spec §3.7 packet-bytes-not-persisted invariant.
  - `backend/tests/test_evaluations_routes.py` — 12 cases: list auth wall + uid scoping + limit respect; get-by-id happy path + 404 missing + 404 non-owner (not 403); packet auth wall + 404 non-owner + 409 missing profile + successful ZIP regen with the three draft filenames asserted.
  - `backend/tests/test_manual_entry.py` client fixture updated to mock the evaluations collection with a predictable `"test-eval-id"`; streaming test now asserts `done.eval_id == "test-eval-id"`.
- **Full backend suite: 113/113 green (88 prior + 25 new).** Ruff clean. Frontend `pnpm lint` + `tsc --noEmit` clean.
- **Not deployed this turn; commit + push + CI/CD deploy happens next.**

---

## [21/04/26] - Phase 2 Task 4 PO2: auth-domain unblock, /privacy + /terms stubs, solo verification of sub-steps 1-3+CLI

PO2's contribution to closing Phase 2 Task 4. Cleared the blocker that was preventing PO1's automated smoke from translating to a real browser flow, shipped the legal pages the sign-up consent already linked at, and walked the runbook §3.3 procedure end-to-end as far as a solo run can take it. The two remaining sub-steps (in-browser DevTools Network on `/api/agent/intake_manual` + sign-out cleanup) stay flagged for the joint pre-demo run as PO1 originally scoped.

- **Cloud Run host added to Firebase Authorized domains.** Real-browser smoke was failing with `Firebase: Error (auth/unauthorized-domain)` on both `/sign-in` and `/sign-up`. Diagnosed via the Identity Toolkit warning in `iframe.js`; the Cloud Run hostname `layak-frontend-297019726346.asia-southeast1.run.app` was not on the project's three default-only authorized domains list. Patched via Identity Toolkit Admin REST (`PATCH /admin/v2/projects/{p}/config?updateMask=authorizedDomains`) — required `X-Goog-User-Project: layak-myaifuturehackathon` because gcloud's ADC binds quota to a different project by default and the API otherwise 403s with `SERVICE_DISABLED`. Effective immediately on Firebase's side; no redeploy. Live `authorizedDomains` now: `["localhost", "layak-myaifuturehackathon.firebaseapp.com", "layak-myaifuturehackathon.web.app", "layak-frontend-297019726346.asia-southeast1.run.app"]`. Per-revision Cloud Run hostnames (`*-i2t7hf6seq-as.a.run.app`) are not on the list — wildcards aren't supported.
- **Stub `/privacy` and `/terms` pages.** Sign-up form already linked `<Link href="/privacy">` and `<Link href="/terms">` (`frontend/src/components/sign-up/sign-up-form.tsx:60,64`); Next.js prefetched both on render and 404'd because the routes didn't exist. Created `frontend/src/app/(marketing)/privacy/page.tsx` and `frontend/src/app/(marketing)/terms/page.tsx` as server-rendered static pages inside the `(marketing)` route group so they inherit `MarketingHeader` + `Footer` automatically. Content matches the v2 SaaS posture (Firebase Auth + Firestore persistence + 30-day free-tier prune + PDPA export/delete + DRAFT-only outputs) without overpromising features that aren't built (export/delete endpoints land in Phase 4 Task 4). Build clean: `pnpm run build` lists both as `○ /privacy` and `○ /terms` static prerendered routes; lint clean. **Note:** the deployed Cloud Run frontend bundle is still pre-this-change — a redeploy is needed before judges hit the live URL, but the smoke test path itself is unaffected.
- **Solo smoke verification — sub-steps 1, 2, 3 + CLI proof of 4.** Following the runbook §3.3 procedure in incognito on `https://layak-frontend-297019726346.asia-southeast1.run.app`:
  - **(1) Fresh-browser sign-in** ✓ Google OAuth completed first try.
  - **(2) `/dashboard` auto-redirect** ✓ URL flipped without a manual refresh — `useEffect` on `useAuth().user` in `sign-in-form.tsx` fired as expected.
  - **(3) Firestore `users/{uid}` doc populated** ✓ `GET /v1/projects/layak-myaifuturehackathon/databases/(default)/documents/users/XpCMZJ1IHChOoVpLFvNDe2dArho2` returned the expected shape: `email=heezijie2004@gmail.com`, `displayName="Hee Zi Jie"`, `photoURL=<google-cdn>`, `tier="free"`, `createdAt`/`lastLoginAt=2026-04-21T15:34:29.641Z`, `pdpaConsentAt=null`. `createTime` matched the §3.6 intake-call second to the millisecond — proof that `_upsert_user_doc` ran on the auth dependency, not on sign-in alone.
  - **(4) CLI proxy for Bearer-authed intake** ✓ `POST /api/agent/intake` with the captured ID token + 3 multipart PDFs returned `HTTP/2 200 content-type: text/event-stream`. Control unauthed POST returned `HTTP 401`. The HTTP/2 200 status line lands the moment FastAPI returns the `StreamingResponse`, which only happens after `current_user` resolves — so 200 here is sufficient evidence the auth gate accepted the bearer. **Joint pre-demo still owes the in-browser equivalent against `/api/agent/intake_manual` (sub-step 4 proper) plus sub-step 5 sign-out → `/sign-in` redirect.**
- **Runbook §3 patched** to reflect what we actually learned executing it.
  - **§3.2 token-capture snippet rewritten.** The original `import('https://www.gstatic.com/.../firebase-auth.js')` approach failed with `app/no-app` — fresh CDN imports return a different module instance from the bundled app's, and `getAuth()` on the fresh instance has no registered apps. Replaced with an IndexedDB read against `firebaseLocalStorageDb` → `firebaseLocalStorage` → key `firebase:authUser:{apiKey}`, pulling `uid` + `stsTokenManager.accessToken` directly. Also dropped `navigator.clipboard.writeText` (requires page focus; clicking into DevTools de-focuses) in favour of a `console.log` of a copy-friendly delimited string.
  - **§3.3 promoted to a 5-checkbox manual procedure** matching plan.md's reference text, so the plan's "five manual checkboxes captured in `docs/runbook.md` §3.3" callout actually resolves to a real 5-bullet list.
  - **§3.4 `UID` → `FB_UID`.** Bash treats `UID` as readonly (Unix UID = 1000); the prior snippet would have silently 404'd against `users/1000`. Caught the hard way today.
  - **§3.6 added** as the synthetic CLI alternative for sub-step 4 — the full curl recipe I just used to verify auth solo, kept available for post-deploy revision smoke without firing up a browser.
- **plan.md Phase 2 Task 4 third checkbox** left **unticked** per PO1's "Owns by both; tick when executed jointly pre-demo" note, but annotated with the solo evidence above so the joint run knows what's already covered and what still needs eyeballs.
- **Suggested commits:** `feat(frontend): add /privacy and /terms stub pages` and `docs(infra): align phase 2 task 4 smoke runbook with browser-first 5-step procedure`. Plan + progress updates ride along with the docs commit.

---

## [21/04/26] - Phase 2 Task 4 PO1: auth-gate re-enable + integration smoke runbook (browser check pending)

PO1's half of Phase 2 Task 4 — the automated parts of the integration smoke plus the final un-bridging of the auth gate. Live browser check (fresh-browser sign-in flow) still owned jointly by PO1 + PO2 per the Task 4 "Both" owner line.

- **Un-bridged the auth gate in `backend/app/main.py`.** Removed the `PHASE-2-TASK-3-BRIDGE` comment block and the two commented-out `user: CurrentUser` lines; restored the `from app.auth import CurrentUser` import, made `user: CurrentUser` the first signature parameter on both `/api/agent/intake` and `/api/agent/intake_manual`, and threaded `_ = user` through as a Phase 3 placeholder on both routes. `backend/tests/test_manual_entry.py` restored the `test_intake_manual_rejects_missing_auth` 401-assertion (had been removed during the bridge window, replaced with a stub comment that's now gone).
- **Live backend smoke captured as runbook §3** (`docs/runbook.md`). Five automated checks (three curl, one multipart curl, one Firestore list):
  - `GET /health` → HTTP 200, `{"status":"ok","version":"0.1.0"}` ✓
  - `POST /api/agent/intake_manual` (valid JSON body, no bearer) → **401** (auth gate active; was 200 streaming the full pipeline BEFORE the cleanup — prior bridge deployment let unauthed traffic through)
  - `POST /api/agent/intake_manual` (valid JSON body, malformed bearer) → **401**
  - `POST /api/agent/intake` (multipart body, no bearer) → **401**
  - `gcloud firestore documents list --collection=users --project=layak-myaifuturehackathon` → enumerates (empty on fresh project; populates after first authed sign-in).
- **Live browser check deferred to joint PO1+PO2 session.** Five checkboxes documented in runbook §3.3 covering the browser path: fresh profile → OAuth → `/dashboard` auto-renders → `users/{uid}` Firestore doc appears → authed SSE POST carries Bearer header → sign-out redirects.
- **Why this matters.** Before the un-bridge, the PO2 follow-up deploy had the Firebase Admin secret mounted but intake routes were still bypassing `Depends(current_user)` — so real uploads silently ran as anonymous. PO1's Task 4 work closes that hole by flipping the gate on and verifying the 401 behaviour end-to-end against the deployed revision.
- **Commit message:** `feat(auth): re-enable bearer auth on intake endpoints; add phase 2 task 4 smoke runbook`.
- **Backend checks:** pytest 88/88 green; ruff clean. `test_intake_manual_rejects_missing_auth` passes against the restored gate.
- **Audit (two subagents in parallel)**: correctness audit of the auth un-bridge + forward-compat audit against Phase 3 evaluations persistence. No Criticals flagged (see audit summary in chat).

---

## [21/04/26] - Phase 2 Task 2 follow-up: Firebase Admin secret live, backend + frontend redeployed via CI/CD

PO2 completed the last deferred checkbox of Phase 2 Task 2 on PO1's behalf. Firebase Admin SDK is now fully configured in production, the backend deployment carries the Admin key via Secret Manager, and both services were redeployed together through the freshly-minted GitHub Actions workflow so the auth-enforcing backend and the Firebase-signed-in frontend cut over as one release.

- **`layak-firebase-admin` service account created** (`layak-firebase-admin@layak-myaifuturehackathon.iam.gserviceaccount.com`). Roles: `roles/firebaseauth.admin` (supports the `check_revoked=True` path in `verify_firebase_id_token` so revoked/disabled users surface as 401 rather than silently passing) + `roles/datastore.user` (Admin SDK writes to the `users/{uid}` and `evaluations/{evalId}` collections). Narrow pair — no project Owner or blanket Editor.
- **Key minted + vaulted**. `gcloud iam service-accounts keys create` run under `umask 077` against `/tmp/fb-admin-key-<pid>.json`. Immediately uploaded as the first version of Secret Manager secret `firebase-admin-key` (`replication-policy=automatic`), then `shred -u` on the local file. The secret is the only place the private key material lives — not on disk, not in git, not in the workflow file.
- **Secret accessor bound to the runtime SA**. `roles/secretmanager.secretAccessor` granted on `firebase-admin-key` to the default Compute SA `297019726346-compute@developer.gserviceaccount.com` — the same SA that reads `gemini-api-key`. Scoped to the secret, not project-level.
- **`.github/workflows/cloud-run-deploy.yml` updated**. Backend `--set-secrets` changed from `GEMINI_API_KEY=gemini-api-key:latest` to `GEMINI_API_KEY=gemini-api-key:latest,FIREBASE_ADMIN_KEY=firebase-admin-key:latest`. Cloud Run injects both as env vars on every revision; the Admin SDK's lazy-init in `backend/app/auth.py` parses `FIREBASE_ADMIN_KEY` on the first authed request and caches the `Certificate` in a module-level singleton guarded by a `threading.Lock`.
- **Coordinated cutover via `workflow_dispatch`**. Ran `gh workflow run cloud-run-deploy.yml --ref main -f services=both` after pushing the workflow update, so backend (new auth-enforcing revision) and frontend (Firebase-SDK revision from the Phase 2 Task 3 code) flip to live together. Brief overlap window (~3-8 min per Cloud Build) tolerated — Cloud Run keeps the old revision serving until the new one reports ready, then 100% traffic shifts atomically.
- **Firestore rules already live**. Deployed during Phase 2 Task 3 infra bring-up via `firebase deploy --only firestore:rules,firestore:indexes`; client writes on `users/{userId}` and `evaluations/{evalId}` remain server-only, owner-gated reads per `request.auth.uid == resource.data.userId`. No rule change this turn.
- **Unblocks Phase 2 Task 4** (integration smoke). Fresh-browser sign-in → `/dashboard` → one authed backend call → `users/{uid}` doc creation — all three checks now have a functioning path end-to-end. Task 4 proper still needs a live browser; the auth boundary is verifiable via curl (`POST /api/agent/intake` without bearer → 401; with malformed bearer → 401).

---

## [21/04/26] - Phase 3 Task 6 PO1: Manual Entry Mode — privacy-first intake alternative (FR-21)

Shipped the "Enter manually" toggle alongside the existing three-document upload. Privacy-cautious users can now type name / DOB / IC last-4 / income / employment type / optional address / dependants list instead of uploading MyKad, payslip, and TNB bill. The Gemini OCR `extract` step is bypassed; classify → match → compute_upside → generate run unchanged. Full IC never crosses the wire — only `ic_last4` + `date_of_birth` are accepted as identity inputs.

- **Backend — new files**:
  - `backend/app/schema/manual_entry.py` (33 lines) — `ManualEntryPayload` Pydantic v2 model: name, `date_of_birth: date`, `ic_last4` (regex-4-digit), `monthly_income_rm` (0 ≤ x ≤ 1M), `employment_type ∈ {gig, salaried}`, optional `address` (max 500), `dependants: list[DependantInput]` (max 15). `extra="forbid"` on both models.
  - `backend/app/agents/tools/build_profile.py` (92 lines) — `_classify_income_band` transcribes the six bands from `extract.py:42-47` (`< 1,500` → `b40_hardcore`; `1,500-2,500` → `b40_household`; `2,501-5,000` with kids → `b40_household_with_children` else fallback `b40_household`; `5,001-10,000` → `m40`; `> 10,000` → `t20`). `derive_household_flags` handles the `<18` / `≥60` dependant gates. `_age_from_dob(dob, today)` is `today`-injectable for deterministic tests. `build_profile_from_manual_entry(payload, today=None)` assembles the `Profile` with `household_size = 1 + len(dependants)` and `form_type = {gig→form_b, salaried→form_be}`. Name is stripped but **not** uppercased — the `AISYAH_PROFILE` fixture stores mixed case and changing it would ripple through the demo UI.
- **Backend — refactor**:
  - `backend/app/agents/root_agent.py::stream_agent_events` now takes `uploads | None` **OR** `prebuilt_profile: Profile | None` (XOR). When `prebuilt_profile` is passed, the Gemini OCR call is skipped but the synthetic `step_started/step_result: extract` pair still fires so the frontend stepper sees the same 5-step wire shape.
  - `backend/app/main.py` adds `POST /api/agent/intake_manual` — JSON body, same SSE response format, same `CurrentUser` dependency so v2 auth policy applies identically. `/health` still unauthed.
- **Backend — tests**: `backend/tests/test_manual_entry.py` (33 tests). Coverage: parametrised `_classify_income_band` across all six bands + edges; `derive_household_flags` on Aisyah + age-18-not-under-18 + parent-59-not-elderly; `_age_from_dob` before/on/after birthday; `build_profile_from_manual_entry(aisyah) == AISYAH_PROFILE` (the deterministic round-trip); `match_schemes(built) == AISYAH_SCHEME_MATCHES` (rule-engine parity); validation boundaries (empty name, bad IC, negative income, unknown employment type, extra fields, > 15 dependants, bad relationship enum); SSE route integration (missing auth → 401, malformed body → 422, full Aisyah stream → 11 events in the expected order with `extract.step_result` carrying the built Profile). **88/88 full suite green; ruff clean.**
- **Frontend — new files**:
  - `frontend/src/components/evaluation/intake-mode-toggle.tsx` — segmented radio-group toggle (Lucide `FileText` / `KeyboardIcon`), lifts state to the parent.
  - `frontend/src/components/evaluation/manual-entry-form.tsx` (~280 lines) — react-hook-form + zod v4 schema, four Card-wrapped sections (Identity / Income / Address / Household). Dependants via `useFieldArray` with per-row relationship dropdown + age + optional IC last-4. "Use Aisyah sample data" button resets to the fixture values and notifies the parent to flip the demo banner. Zod uses plain `z.number()` + RHF `valueAsNumber: true` (not `z.coerce.number()`) to sidestep a resolver-type mismatch between `@hookform/resolvers@5` and `zod@4`.
- **Frontend — extensions**:
  - `frontend/src/lib/agent-types.ts` adds `ManualEntryPayload`, `DependantInput`, `EmploymentType`, and `Profile.address?: string | null` (previously present on the backend schema but missing from the TS mirror).
  - `frontend/src/hooks/use-agent-pipeline.ts` extends `StartOptions` with `{ mode: 'manual'; payload: ManualEntryPayload }`. Factored a shared `streamFromResponse` helper so `startReal` and `startManual` share the SSE consumer + abort + error-handling code.
  - `frontend/src/components/evaluation/pipeline-stepper.tsx` adds a `labelOverrides?: Partial<Record<Step, string>>` prop; manual mode passes `{ extract: 'Profile prepared' }`.
  - `frontend/src/components/evaluation/evaluation-upload-client.tsx` hosts the toggle, routes between `UploadWidget` and `ManualEntryForm`, honours `?mode=manual` query param on first paint, and threads the label override into the stepper.
- **Checks**: backend `pytest` 88/88 + `ruff` clean. Frontend `pnpm lint` clean; `tsc --noEmit` clean (Next.js 16 internal `.next/dev/types` cold-build type noise ignored — not introduced by this change).
- **Sizing reality check**: landed in ~3 hours end-to-end vs the original ~6-10h estimate. The pad came from polish items that all got built regardless (dynamic dependants rows, pre-fill button, comprehensive validation tests, stepper label override) but fit inside 3h because react-hook-form + zod were already installed and `stream_agent_events` was already factored cleanly enough to accept a prebuilt `Profile`.
- **Not shipped to prod this turn**: `layak-backend-00003-j75` still serves v1. The authed + manual-capable revision lands alongside Phase 2 Task 2's post-Firebase-setup deploy.

---

## [21/04/26] - Phase 1 Task 6 CI/CD: GitHub Actions Cloud Run deploy via Workload Identity Federation

Un-deferred the Phase 1 Task 6 CI/CD item now that the deadline moved to 24 April. Keyless auth wired end-to-end from GitHub Actions to GCP, with a single workflow file driving per-service deploys off `main`.

- **WIF infrastructure** (gcloud, one-time): pool `github-actions` + OIDC provider `github` with issuer `https://token.actions.githubusercontent.com` and attribute condition `assertion.repository=='AlaskanTuna/myai-future-hackathon'` — restricts impersonation to this exact repo. SA `github-actions-deployer@layak-myaifuturehackathon.iam.gserviceaccount.com` holds `roles/run.admin`, `roles/cloudbuild.builds.editor`, `roles/artifactregistry.writer`, `roles/storage.admin` at project scope, plus `roles/iam.serviceAccountUser` narrowed to the Compute SA (not project-wide) so the deployer can "act as" the runtime SA without blanket impersonation of every SA in the project. Final binding: `roles/iam.workloadIdentityUser` on the deployer SA with `principalSet://…/attribute.repository/AlaskanTuna/myai-future-hackathon` — only workflows from this repo can mint tokens for the SA.
- **`.github/workflows/cloud-run-deploy.yml`** — triggers on push to `main` with paths filter `backend/**` + `frontend/**` + the workflow file itself; plus `workflow_dispatch` with a `services` choice input (both / backend / frontend). Permissions: `id-token: write` (required for WIF), `contents: read`. Env block centralises the project ID, region, WIF provider resource name, deployer SA, backend URL, and the six public `NEXT_PUBLIC_FIREBASE_*` values.
- **Three jobs**: `detect-changes` runs `dorny/paths-filter@v3` to emit `backend` / `frontend` booleans; `deploy-backend` and `deploy-frontend` each `needs: detect-changes` with `if` conditions that combine the push-branch filter output OR the dispatch input. Both deploy jobs use `google-github-actions/auth@v2` → `setup-gcloud@v2` → `gcloud run deploy --source`. Per-job `concurrency: deploy-{service}-{ref}` with `cancel-in-progress: false` prevents parallel revision races on the same service while keeping backend and frontend independent.
- **Backend deploy command** mirrors current manual flags: `--source backend --min-instances 1 --cpu-boost --allow-unauthenticated --set-secrets GEMINI_API_KEY=gemini-api-key:latest --memory 1Gi --timeout 300`. Deliberately does **not** yet include `FIREBASE_ADMIN_KEY=firebase-admin-key:latest` — that secret doesn't exist yet. PO1 will add that in the same commit that runs runbook §2 to create the `layak-firebase-admin` SA, mint the key, and populate the secret.
- **Frontend deploy command** adds `--set-build-env-vars` for `NEXT_PUBLIC_BACKEND_URL` plus all six `NEXT_PUBLIC_FIREBASE_*` keys so the Firebase Web SDK boots in the production bundle. These values are public by Firebase design (access control lives in Firestore rules and the backend Admin SDK), so they live in the workflow env block, not in GitHub Secrets.
- **Safe first-push semantics** — the initial commit of this file touches only `.github/workflows/cloud-run-deploy.yml`, which is in the trigger paths but not in the `detect-changes` filter. The workflow fires, both service filter outputs come back false, both deploy jobs evaluate to `if: false` and skip. Net: no production deploy from this commit. PO1's next push (Task 2 Firebase-admin wiring or any `backend/**` change) will be the first real deploy through CI/CD.
- **Verification path** — once PO1 or PO2 needs to confirm WIF auth end-to-end, run `gh workflow run cloud-run-deploy.yml --ref main -f services=frontend` for a single-service smoke. Frontend redeploy is safe (it just rebuilds against the same live backend URL); backend redeploy regresses the demo until the Firebase Admin secret lands.
- **Runbook linkage** — Phase 1 Task 6 item ticked in `docs/plan.md` with the annotation pointing at the WIF setup + follow-up. Runbook §2 (Firebase Admin service account) is unchanged — it now doubles as the Task 6 follow-up PO1 picks up when doing Task 2 deploy.
- **`.github/workflows/.gitkeep`** removed — directory now holds real content.

---

## [21/04/26] - Added root README.md with live URLs, stack, and deploy commands

Delegated to Copilot CLI, `README.md` now serves as the repo's top-level operator doc (`docs: add root readme with live urls, stack, and deploy commands`, commit `0b5875e`). It consolidates live URLs, overview, architecture pointer, versioned tech stack, repo layout, local dev, deploy commands, docs links, and status/licence so the repo has one copy-pasteable landing page for onboarding and deploy context.

- **Live URLs / deploys** — frontend/backend Cloud Run URLs and the exact `gcloud run deploy` commands are now surfaced at the top of the repo.
- **Docs links** — the root doc now points at `docs/prd.md`, `docs/trd.md`, `docs/roadmap.md`, `docs/plan.md`, and `docs/progress.md`.
- **Scope** — no code paths changed; this is a docs-only landing page for operator context.

---

## [21/04/26] - Phase 1 Task 9 PO2: draft-control copy removal

Cherry-picked `9174b3a` (`refactor(frontend): remove redundant draft-control copy from landing`) from PO2 source commit `877beef` into `frontend/src/components/landing/landing-hero.tsx`. Removed the ShieldCheck-badged "DRAFT packets only — you stay in control" span and the trailing "Every packet is a DRAFT you lodge yourself." sentence; scoped audit of `landing-cta.tsx` and `landing-features.tsx` found no duplicate copy, and the backend watermark `DRAFT — NOT SUBMITTED` in `backend/app/templates/_base.html.jinja` stayed untouched.

- **`frontend/src/components/landing/landing-hero.tsx`** — dropped the badge copy and the duplicate draft-control sentence.
- **Scope check** — `landing-cta.tsx` and `landing-features.tsx` were audited; no follow-up removals were needed.
- **Validation** — lint + build stayed clean.

---

## [21/04/26] - Phase 1 Task 8 PO2: how-it-works move + Gemini Code Execution rename

Cherry-picked `d9e25bb` (`refactor(frontend): move how-it-works to landing and drop dashboard route`) from PO2 source commit `9f98138`; one merge conflict was resolved by taking the deletion of `frontend/src/app/pages/dashboard/how-it-works-page.tsx`. `frontend/src/components/how-it-works/how-it-works-content.tsx` now says "On-stage arithmetic" / "Python" in Step 04, `frontend/src/app/pages/marketing/landing-page.tsx` renders `<section id="how-it-works"><HowItWorksContent /></section>`, and the sidebar/footer/header/breadcrumb route wiring now points to `/#how-it-works` or drops the stale label. The dashboard route files were deleted, and the route table now shows 11 prerendered static routes.

- **Landing page** — How It Works now renders inline on the marketing landing page.
- **Route cleanup** — the dashboard How It Works page files were deleted, and stale sidebar/footer/header/breadcrumb links were removed.
- **Copy rename** — Step 04 and the stack card now use "On-stage arithmetic" / "Python" instead of Gemini Code Execution.
- **Validation** — lint + build stayed clean.

---

## [21/04/26] - Phase 1 Task 7 PO2: width-consistency pass

Cherry-picked `5c19386` (`refactor(frontend): normalise width shell on authed routes`) from PO2 source commit `f407e3d` to move the width boundary into `frontend/src/components/layout/app-shell.tsx`. Added `mx-auto w-full max-w-5xl` to the shell `<main>` and stripped page-level `mx-auto`/`max-w-*` wrappers from `dashboard-page.tsx`, `how-it-works-page.tsx` (before it was deleted), `schemes-page.tsx`, `evaluation-overview-page.tsx`, `evaluation-upload-page.tsx`, `evaluation-results-page.tsx`, and `settings-page.tsx`, so the narrower `max-w-3xl` screens now expand to the shared shell width.

- **`frontend/src/components/layout/app-shell.tsx`** — shell `<main>` now owns the width contract.
- **Authed pages** — page-level width wrappers were removed from the dashboard, evaluation, schemes, and settings pages.
- **Outcome** — the former narrower screens now inherit `max-w-5xl` from the shell.
- **Validation** — lint + build stayed clean.

---

## [21/04/26] - Phase 2 Task 3 PO2: Frontend Firebase Web SDK + AuthGuard + Google sign-in/up + PDPA consent

PO2's slice of Phase 2 Task 3 — the browser now has a real Firebase Auth client, dashboard routes redirect anons to `/sign-in`, and `POST /api/agent/intake` sends a bearer token once the Admin-SDK revision is redeployed. Handoff-ready for the Phase 2 Task 4 joint smoke; no redeploy this turn per the "stop at the handoff" directive.

- **Firebase project stood up end-to-end (infra, not code).** The `layak-myaifuturehackathon` GCP project had Firebase the concept but zero Firebase the infra — no Firestore DB, no Identity Toolkit, no Web App. Enabled `firestore.googleapis.com` + `identitytoolkit.googleapis.com`, provisioned Firestore Native DB in `asia-southeast1` as `(default)`, confirmed the Google sign-in provider the user enabled via Console is live (OAuth client `297019726346-78mbvndtm8oll3ntodb9rai60lhqp9ti`), and deployed PO1's `firestore.rules` + `firestore.indexes.json` via `firebase deploy --only firestore:rules,firestore:indexes`. Registered the Web App `Layak Web` via `firebase apps:create WEB` → App ID `1:297019726346:web:8399534a56cf8ea5dc5df3` and pulled the six-key SDK config with `firebase apps:sdkconfig WEB`.
- **`frontend/src/lib/firebase.ts`** — lazy singleton boundary. `getFirebaseApp()` + `getFirebaseAuth()` cache instances per-module, `assertConfig()` throws with a named key list if any `NEXT_PUBLIC_FIREBASE_*` is missing so misconfig fails loud at first call instead of silently returning null. `signInWithGoogle()` forces `prompt: 'select_account'` so the popup always presents the account picker (avoids the silent-Google-identity trap when a user wants to switch accounts). `authedFetch(input, init)` reads `getFirebaseAuth().currentUser`, calls `getIdToken()` if present, injects `Authorization: Bearer <token>` onto a cloned `Headers`, and falls through to plain `fetch` for anonymous calls — keeps the pre-auth backend revision usable during the cutover window.
- **`frontend/src/lib/auth-context.tsx`** — minimal `<AuthProvider>` + `useAuth()` hook. Single `onAuthStateChanged` subscription in a root-level `useEffect`, state is `{ user, loading }`; loading starts `true` and flips to `false` on first callback so the guard can render a loader without flashing unauthed content. Unsubscribes on unmount.
- **`frontend/src/components/auth/auth-guard.tsx`** — redirects to `/sign-in` via `router.replace()` when `!loading && !user`, otherwise renders children. Shows an `aria-live="polite"` Loader2 spinner during the `loading` window or the one-frame gap before `router.replace()` unmounts the guard. Used from `frontend/src/app/(app)/layout.tsx` which now wraps `<AppShell>` in `<AuthGuard>`.
- **Root `frontend/src/app/layout.tsx`** — mounts `<AuthProvider>` inside `<ThemeProvider>` so auth state is readable across all three route groups (`(app)`, `(auth)`, `(marketing)`). Needed because `/sign-in` and `/sign-up` redirect signed-in users forward to `/dashboard` on mount.
- **`frontend/src/components/sign-in/sign-in-form.tsx`** — rewritten. Removed the v1 "Continue as guest" primary button and the disabled email+password inputs (v2 is Google-only per the pivot spec). Single Google-branded button with the multi-colour G SVG icon (new `frontend/src/components/auth/google-icon.tsx`, 4-path inline SVG, no brand-icon dep). Spinner swap on `pending`; error copy surfaces under the button with `role="alert"`; `useEffect` redirects to `/dashboard` if `useAuth()` reports a user.
- **`frontend/src/components/sign-up/sign-up-form.tsx`** — same Google button + the PDPA consent checkbox. Raw `<input type="checkbox">` styled with `accent-primary` + shadcn-consistent radius rather than adding the shadcn `Checkbox` primitive for a single use site. The button's `disabled` prop is ORed against `!consent` so the signup flow is gated on consent before the OAuth popup opens. Copy links to `/privacy` and `/terms`, which are Phase 5 Task 2 deliverables — the anchors will 404 until then, acceptable trade per the route-group precedent.
- **`frontend/src/components/layout/user-menu.tsx`** — real sign-out + real identity. Avatar initial derives from `displayName` or `email` (was hardcoded `"G"` for guest). Menu header shows `displayName` + `email` (truncated). Sign-out swaps the `<Link href="/sign-in">` destructive link for a `<button>` that calls `signOutCurrentUser()` then `router.replace('/sign-in')`; `signingOut` state keeps the button disabled during the await window so a double click can't fire two revoke calls.
- **`frontend/src/hooks/use-agent-pipeline.ts`** — swapped `fetch(...)` → `authedFetch(...)` on the `/api/agent/intake` SSE POST. `authedFetch` preserves streaming (it passes init through to native `fetch`), so the existing `parseSseStream(res.body)` generator is untouched. During the interim (backend pre-auth revision still serving), the missing-token fallback path in `authedFetch` returns a no-header fetch and the upload still works; once PO1 redeploys with `FIREBASE_ADMIN_KEY` wired, the same code path enforces the bearer.
- **Env plumbing.** Repo-root `.env` (gitignored) got real `NEXT_PUBLIC_FIREBASE_*` values from the sdkconfig dump plus a `FIREBASE_ADMIN_KEY=` placeholder for the upcoming backend redeploy. Repo-root `.env.example` mirrors the keys as empty placeholders with doc comments clarifying that the Web SDK config values are **not** secrets — they're public project identifiers, access is gated by Firestore rules + backend Admin SDK, not by opacity. The existing `frontend/.env.local` → `../.env` symlink (created by the `predev` hook) means both backend (`python-dotenv`) and frontend (Next.js) read from the same source.
- **`pnpm add firebase`** → `firebase 12.12.1` locked in `frontend/package.json`. pnpm flagged three ignored build scripts (`@firebase/util`, `msw`, `protobufjs`) — these are peer dependencies of unused Firebase modules (Remote Config, mock service worker, gRPC); safe to leave unapproved since we only import from `firebase/app` + `firebase/auth`.
- **Smoke: `pnpm run lint` clean; `pnpm run build` clean — 12 routes prerendered static.** One mid-build type error fixed before passing: `assertConfig()` initially used an `asserts firebaseConfig is Record<…, string>` signature referencing a module-level `firebaseConfig`, which TS rejects — assertion signatures can only name formal parameters. Downgraded to a regular `void` return; `FirebaseOptions` permits the optional-string shape so the downstream `initializeApp(firebaseConfig)` still typechecks.
- **Not done this turn (per PO2 directive "stop at the handoff prior Phase 2 Task 4").** No `pnpm dev` + browser smoke. No frontend redeploy. Backend redeploy with `--set-secrets=FIREBASE_ADMIN_KEY=...` stays PO1's call after the Task 4 joint sign-in-from-fresh-browser check.

---

## [21/04/26] - Phase 2 Task 2 PO1: Firebase Admin SDK boundary + authed /api/agent/intake

PO1's slice of Phase 2 Task 2 — the backend now verifies Firebase ID tokens on `/api/agent/intake` and lazy-creates `users/{uid}` on first touch. Code-only this turn; redeploy deferred until the Firebase service-account secret is populated and Phase 2 Task 3 can mint real ID tokens for an end-to-end smoke.

- **`backend/app/auth.py`** — single-file boundary for everything Firebase. `_init_firebase_admin` lazy-parses `FIREBASE_ADMIN_KEY` (JSON from Secret Manager) into a `Certificate`; re-entrant via a `threading.Lock` + sentinel so concurrent first requests don't double-init. `verify_firebase_id_token` wraps `firebase_admin.auth.verify_id_token` so every route imports through this module rather than `firebase_admin` directly. `current_user(request, authorization)` parses `Authorization: Bearer <id-token>`, surfaces 401 for missing/empty/invalid/expired/revoked tokens, and surfaces **503** (not 500) when the key env var is absent or malformed so the frontend can distinguish "service misconfigured" from "bad token." `UserInfo` is a frozen dataclass — `uid` / `email` / `display_name` / `photo_url`. `CurrentUser = Annotated[UserInfo, Depends(current_user)]` is the single import route modules need.
- **`_upsert_user_doc`** — Firestore shape matches spec §3.3 character-for-character: `email`, `displayName`, `photoURL`, `tier="free"`, `createdAt=SERVER_TIMESTAMP`, `lastLoginAt=SERVER_TIMESTAMP`, `pdpaConsentAt=None`. Returning users only get `lastLoginAt` updated (one `.update()` call, no payload drift). Race between concurrent first-touches is explicitly acceptable per spec §3.5 — both writers converge on identical creation data.
- **`backend/app/main.py`** — `/api/agent/intake` now takes `user: CurrentUser` as its first parameter. Starlette parses the multipart body before dep resolution, so a bad token still pays the upload cost — acceptable for v1 demo volume; revisit with middleware-level gating if abuse surfaces. `/health` stays unauthed. `user.uid` is threaded through as a placeholder (`_ = user`) — Phase 3 swaps that for the `evaluations/{evalId}` write path.
- **Deps** — `firebase-admin>=6.5,<7` added to `backend/pyproject.toml` + `backend/Dockerfile`. Installed locally into `.venv` (pulls `google-cloud-firestore` transitively, so no extra dep line).
- **Tests** — `backend/tests/test_auth.py`, 16 cases. Stubs `_init_firebase_admin` + `_get_firestore` + `verify_firebase_id_token` via monkeypatch so CI never needs real Firebase creds. Coverage: missing header, non-Bearer scheme, empty bearer, invalid/expired/revoked/disabled tokens (all → 401), `CertificateFetchError` (→ 503, transient outage), token missing uid, valid-token happy path (asserts exact `set` payload), returning-user path (asserts only `lastLoginAt` is touched), `request.state.user_id` mutation, padded-whitespace bearer token, 503 on missing env, 503 on non-JSON env, 503 on JSON-valid-but-shape-invalid service-account. Full suite: **55/55 passing** (39 prior + 16 new). Ruff: clean.
- **Post-audit fixes applied before commit** (correctness subagent flagged three Criticals):
  - `credentials.Certificate()` is now inside the try/except in `_init_firebase_admin` so a JSON-valid but shape-invalid key (e.g. missing `private_key`) returns 503, not 500.
  - `UserDisabledError` added to the 401 branch; `CertificateFetchError` added as 503 ("verifier temporarily unavailable") so a transient Google cert outage doesn't force the client to re-auth.
  - Dropped the `claims.get("sub")` fallback — Firebase-minted ID tokens always set `uid`, so the fallback was dead code that could accept non-Firebase JWTs in pathological cases. `current_user` now requires `uid` directly.
  - Runbook §2.1 IAM role corrected from `roles/firebase.sdkAdminServiceAgent` (Google-managed, wrong for customer SAs) to `roles/firebaseauth.admin` + `roles/datastore.user`.
  - Runbook §2.3.1 added to document that secret rotation requires a new Cloud Run revision — the Admin SDK and Firestore clients are process-cached.
- **Import-smoke of `app.main`** without `FIREBASE_ADMIN_KEY` in env — loads cleanly (lazy init defers the env-var read until the first authed request). `GET /health` → 200; `POST /api/agent/intake` with no header → 401 `{"detail":"Missing bearer token"}`; with a header but no key env → 503 `{"detail":"Firebase Admin not configured"}`.
- **Runbook** — new `docs/runbook.md` §2 captures the three-step rollout: (1) create `layak-firebase-admin` service account with `firebase.sdkAdminServiceAgent` + `datastore.user`, (2) mint + push a key to Secret Manager as `firebase-admin-key`, grant `secretAccessor` to the default Compute SA, (3) redeploy with `--set-secrets "GEMINI_API_KEY=...,FIREBASE_ADMIN_KEY=firebase-admin-key:latest"`. Verification curls included.
- **Not shipped to prod this turn.** The currently-live `layak-backend-00003-j75` revision is still the unauthed v1 stack — the demo path is unaffected. The authed revision lands the moment Phase 2 Task 3 (PO2) can sign in and attach a real Bearer.

---

## [21/04/26] - Phase 2 Task 1 PO1: Firestore contract checked in (rules + composite index + rollout runbook)

PO1's slice of Phase 2 Task 1 — the Firestore contract that later Phase 2/3 work will depend on. No deploy yet; this task ends at the repo having the rules, indexes, and Firebase project config committed, plus a repeatable rollout command recorded in the new runbook.

- **`firebase.json` at repo root** — one-line config pointing at `firestore.rules` and `firestore.indexes.json`. Required for the Firebase CLI (`firebase deploy --only firestore:rules,firestore:indexes`) to pick up both files from a single `firebase deploy` call.
- **`firestore.rules`** — transcribed verbatim from `docs/superpowers/specs/2026-04-21-v2-saas-pivot-design.md` §3.4. Three matchers:
  - `users/{userId}` — client read only when `request.auth.uid == userId`; `allow write: if false` (backend Admin SDK bypasses rules).
  - `evaluations/{evalId}` — client read only when `request.auth.uid == resource.data.userId`; `allow write: if false`.
  - `waitlist/{entry}` — `allow create` if any authenticated user; reads/updates/deletes blocked.
- **`firestore.indexes.json`** — one composite index covering the two hot queries: the `/dashboard/evaluation` history view (`orderBy createdAt desc, where userId == uid`) and the rate-limit count (`where userId == uid AND createdAt >= now - 24h`). Shape: `collectionGroup: evaluations`, `queryScope: COLLECTION`, fields `[userId ASC, createdAt DESC]`, empty `fieldOverrides`.
- **New `docs/runbook.md` §1 "Firestore rollout (Phase 2 Task 1)"** — canonical rollout:
  1. Pre-flight: `gcloud services enable firestore.googleapis.com firebase.googleapis.com`; one-time `gcloud firestore databases create --location=asia-southeast1 --type=firestore-native`.
  2. Preferred deploy: `firebase use layak-myaifuturehackathon && firebase deploy --only firestore:rules,firestore:indexes`.
  3. Alternative (composite index only, no rules): `gcloud firestore indexes composite create --collection-group=evaluations --query-scope=COLLECTION --field-config=field-path=userId,order=ascending --field-config=field-path=createdAt,order=descending`.
  4. Verification: `gcloud firestore indexes composite list` shows the index; `firebase deploy --only firestore:rules --dry-run` shows no drift.
- **`.firebaserc`** — minimal project binding (`"default": "layak-myaifuturehackathon"`). Added after the audit flagged that `firebase deploy` otherwise prompts/writes this on first run; committing it makes the runbook command deterministic on a fresh clone.
- **Out of scope for this task**: no Firestore database provisioned; no Firebase project initialised; no Admin SDK / `backend/app/auth.py` — those belong to Phase 2 Task 2. All code changes are contract-only — zero runtime impact on the deployed v1 services.
- **Audits (two subagents in parallel)**:
  - **Correctness** (`general-purpose`): rules match spec §3.4 character-for-character; single composite index satisfies both the history view and the rate-limit count; `firebase.json` valid. Warnings (missing `.firebaserc`, bogus `--dry-run`, §1.2 vs §1.3 not mutually exclusive, `firebase.googleapis.com` scope creep) were addressed inline this turn before commit.
  - **Forward-compatibility** (`general-purpose`): all six future operations (lazy-create user, evaluations write path, client realtime read on `/results/[id]`, rate-limit count, history view, waitlist create, PDPA cascade delete) are cleanly supported by the current contract — no amendment expected through Phase 4.

---

## [21/04/26] - Task 6 PO1: backend + frontend deployed to Cloud Run with CORS lockdown

PO1's slice of Phase 1 Task 6 — both services live on Cloud Run in `asia-southeast1`, `min-instances=1 --cpu-boost` to guarantee no cold start during the demo window.

- **Live URLs**:
  - Frontend: `https://layak-frontend-297019726346.asia-southeast1.run.app`
  - Backend: `https://layak-backend-297019726346.asia-southeast1.run.app`
- **Backend deploy**: `gcloud run deploy layak-backend --source backend --region asia-southeast1 --min-instances 1 --cpu-boost --allow-unauthenticated --set-secrets GEMINI_API_KEY=gemini-api-key:latest --memory 1Gi --timeout 300`. Revision `layak-backend-00003-j75` currently serving 100% traffic. Built from the committed `backend/Dockerfile` (python:3.12-slim + WeasyPrint native deps + uvicorn PID-1).
- **Frontend deploy**: `gcloud run deploy layak-frontend --source frontend --region asia-southeast1 --min-instances 1 --cpu-boost --allow-unauthenticated --set-build-env-vars NEXT_PUBLIC_BACKEND_URL=<backend-url> --memory 512Mi --timeout 60`. Buildpack auto-detected Next.js 16; `NEXT_PUBLIC_BACKEND_URL` correctly baked at `next build`.
- **IAM bootstrap** (one-off): granted `roles/secretmanager.secretAccessor` to the default Compute SA `297019726346-compute@developer.gserviceaccount.com` on the `gemini-api-key` secret; project Owner role on `haosdevs@gmail.com` to unblock Cloud Build staging-bucket creation.
- **Routing discovery**: Cloud Run GFE silently returns a generic 404 for `/healthz` before traffic ever reaches the container (log-trace confirmed: `/` and `/api/agent/intake` both hit uvicorn, `/healthz` never did). Renamed `/healthz` → `/health` in `backend/app/main.py` and redeployed. `/health` → `{"status":"ok","version":"0.1.0"}` 200.
- **CORS lockdown** (audit Critical): the original `allow_origin_regex` accepted any `https://*.run.app`, which would let any attacker-hosted Cloud Run service drive the SSE pipeline from a victim's browser and exfiltrate the extracted profile JSON. Pinned to the two Layak frontend URLs (exact-match `allow_origins=[…]`) plus a localhost-only `allow_origin_regex`. Verified: `Origin: https://attacker.run.app` → 400; legit frontend → 200 with reflected `access-control-allow-origin`; `http://localhost:3000` dev origin → 200.
- **`.gcloudignore` files**: added to both `backend/` and `frontend/` so `.venv/`, `tests/`, `scripts/`, `node_modules/`, `.next/`, and `.env*` stay out of the source-deploy upload.
- **Post-deploy incognito smoke**:
  - `GET /health` → 200 `{"status":"ok"}`.
  - `POST /api/agent/intake` with three dummy PDFs → `step_started(extract)` then `error` with sanitised Gemini `INVALID_ARGUMENT: The document has no pages.` (confirms secret injection + SSE wire + error-path plumbing).
  - `GET /` on frontend → 200 with `<title>Layak</title>`; Next.js 16 SSR content rendered.
- **Audit pass** (subagent `general-purpose`, reviewed deploy YAML + IAM + CORS): Critical issue (CORS wildcard) was fixed inline this turn; Warnings (maxScale=3 scaling cap, default Compute SA with project-editor grade, no revision pinning) logged for post-hackathon cleanup; no Gemini key leakage in the frontend bundle; mock-fallback path (`startMock()` in `use-agent-pipeline.ts`) still reachable as the demo safety net.

---

## [21/04/26] - Task 5 PO2 final sweep: dev-only mock replay toggle and local happy-path smoke

The last Task 5 frontend guardrail is now dev-only (`NODE_ENV !== 'production' && NEXT_PUBLIC_USE_MOCK_SSE=1`), so production builds always hit the real backend while demo replay stays available in development. Verified with a backend SSE smoke against generated Aisyah PDFs: 5 `step_started`, 5 `step_result`, 1 `done`, 0 `error`; all three draft packet filenames were returned with base64 bytes. Frontend `pnpm lint` and `pnpm build` stayed green.

---

## [21/04/26] - Task 5 PO1: WeasyPrint packet generator with Jinja templates and DRAFT watermark (base64-embedded delivery)

PO1's slice of Phase 1 Task 5 — the WeasyPrint draft-packet generator (commit `6ff2b64`). Replaces the Path 1 filename-only stub with real PDF generation. Delivery: base64-encoded PDF bytes in `PacketDraft.blob_bytes_b64`, carried verbatim in the terminal `DoneEvent.packet`. Stateless invariant (docs/trd.md §6.5) preserved — no `/api/agent/packet/{id}` endpoint, no request-scope persistence.

- **Four new Jinja templates under `backend/app/templates/`**:
  - `_base.html.jinja` — shared A4 layout with `@page` running headers (date + page counter), three-line diagonal `DRAFT — NOT SUBMITTED` watermark at 40 pt weight 700, ~9% red alpha, rotated -30°, `position: fixed` so every printed page inherits it. Common sections: Layak brand header, filer IC last-4, legal disclaimer (docs/prd.md §7), signature slots.
  - `bk01.html.jinja` — STR 2026 draft with Malay section labels (Maklumat Pemohon, Isi Rumah, Kelayakan STR, Rujukan Sumber).
  - `jkm18.html.jinja` — JKM Warga Emas draft structuring the per-capita means test and the Budget-2026 RM600 / fallback RM500 rate (docs/trd.md §9.5).
  - `lhdn.html.jinja` — LHDN Form B YA2025 five-relief breakdown table + chargeable-after-reliefs + tax-delta estimate.
- **Rewrote `backend/app/agents/tools/generate_packet.py`** — per-match pipeline: pick template by `scheme_id` from `_TEMPLATE_MAP`, build Jinja context via `_scheme_context()` (derives `children_under_18`, `elderly`, `per_capita`, `annual_income`, plus LHDN-specific `total_relief` / `chargeable_after` so templates stay logic-free), render via cached `Environment(autoescape=True, trim_blocks=True, lstrip_blocks=True)`, pipe through `WeasyPrint HTML(string=html).write_pdf()`, `base64.b64encode()` → `PacketDraft.blob_bytes_b64`.
- **New `Profile.address: str | None = None`** — Gemini was emitting an `address` field that failed validation under `extra="forbid"`; now it's a first-class Optional. Fixture updated with Aisyah's full address. Templates render it.
- **`backend/pyproject.toml` deps**: added `jinja2>=3.1`, `weasyprint>=62`. Installed `weasyprint 68.1`.
- **New `backend/Dockerfile`** (for Task 6): `python:3.12-slim` + apt install `libpango-1.0-0` / `libpangoft2-1.0-0` / `libharfbuzz0b` / `libcairo2` / `libgdk-pixbuf-2.0-0` / `shared-mime-info` / `fonts-dejavu-core` / `fonts-liberation`. `exec uvicorn` as PID 1 for Cloud Run SIGTERM.
- **Cross-platform**: code is pure Python; native deps vary per-OS. Linux/Cloud Run uses Dockerfile apt installs. Windows dev needs GTK+ Windows runtime installer. macOS: `brew install pango`.
- **In-process smoke (authoritative for Task 5 PO1)**: `generate_packet(AISYAH_PROFILE, AISYAH_SCHEME_MATCHES)` produced 3 PDFs (23-27 KB each). `pypdf` text extraction verified on every PDF: `DRAFT` + `NOT SUBMITTED` watermarks present, `AISYAH BINTI AHMAD` rendered, IC last-4 `4321` rendered, **no full-IC leak**.
- **End-to-end SSE smoke (partial)**: Gemini 2.5 Flash rate-limited (503 UNAVAILABLE burst) intermittently blocks `extract` / `classify`. When all three Gemini calls succeed, the full 11-event stream reaches `DoneEvent` with base64-embedded PDFs. Orchestrator correctly reports `ErrorEvent.step="extract"` / `step="classify"` (Path 2 audit fix holds); `sanitize_error_message` redacts 5+-digit runs. Demo safety net: **"Use Aisyah sample documents"** replays the mock SSE fixture bypassing Gemini, and the replay escape hatch is now dev-only.
- **Verification**: ruff clean on 22 files, pytest 39/39 passed in 2.93 s.

---

## [21/04/26] - Frontend page-module refactor: split route implementations out of App Router

Moved the dashboard, evaluation, auth, marketing, settings, and How It Works page implementations into `frontend/src/app/pages/**` while keeping the route `page.tsx` files as thin re-export wrappers. Verified the affected frontend build still compiles and prerenders the touched routes through the new module path.

---

## [21/04/26] - Task 3 Path 2: wired real Gemini 2.5 Flash into extract / classify / compute_upside (Vertex AI Search still pending ADC login)

Path 1 stubs replaced with real Gemini calls. End-to-end SSE stream against the three synthetic Aisyah demo PDFs (rendered via Edge headless from `frontend/public/demo/*.html`): **11 events in 59 s** (median Gemini call ~15-20 s per tool). No error events; all 5 step pairs + terminal `done`. Backend tests 39/39 still pass.

- **New `backend/app/agents/gemini.py`** — shared `google.genai.Client` factory. `get_client()` caches the client via `@lru_cache(maxsize=1)`, sources `GEMINI_API_KEY` from `os.environ` first then falls back to parsing the repo-root `.env`. Exports `FAST_MODEL="gemini-2.5-flash"` + `ORCHESTRATOR_MODEL="gemini-2.5-pro"` plus a `detect_mime()` helper that infers MIME from file magic bytes (PDF `%PDF-`, JPEG, PNG, GIF, WebP) with filename-extension fallback.
- **Rewrote `backend/app/agents/tools/extract.py`** to use Gemini 2.5 Flash multimodal. Sends the three documents as `Part.from_bytes(data, mime_type=detect_mime(...))` followed by an instruction Part. `response_mime_type="application/json"`, `temperature=0.0`, `Profile.model_validate_json()` on return. Server-side `response_schema=Profile` deliberately omitted because Pydantic's `extra="forbid"` emits `additional_properties` which Gemini's schema dialect rejects with `400 INVALID_ARGUMENT` — fix is documented inline. Instruction is explicit about the privacy invariant: only `ic_last4` as the 4-digit suffix, never the full 12-digit IC.
- **Rewrote `backend/app/agents/tools/classify.py`** — Gemini 2.5 Flash structured-output call taking the extracted Profile JSON and returning a HouseholdClassification with per-capita monthly income + a 3-5 item `notes` array of plain-English observations that the pipeline stepper surfaces.
- **Rewrote `backend/app/agents/tools/compute_upside.py`** — Gemini 2.5 Flash with the Code Execution tool enabled (`types.Tool(code_execution=types.ToolCodeExecution())`). Prompt asks for a specific `{:<42s}{:>12,}`-formatted table. `_extract_exec_parts()` helper walks `response.candidates[0].content.parts[]` extracting `executable_code.code` → `python_snippet` and `code_execution_result.output` → `stdout`. `total_annual_rm` + `per_scheme_rm` are computed server-side as the authoritative values regardless of what Gemini's script prints (belt-and-braces). **Downgraded from 2.5 Pro to 2.5 Flash** — free-tier key returns `429 RESOURCE_EXHAUSTED` on every Pro call; Flash supports the same Code Execution tool with identical payload shape. Documented in the module docstring.
- **Added dotenv loader** to the top of `backend/app/main.py` — parses `repo-root/.env` into `os.environ` before `stream_agent_events` imports, so `GEMINI_API_KEY` is available at tool-execution time. 8-line inline parser (no new dep); `noqa: E402` on the late `root_agent` import so ruff doesn't reorder it above the dotenv block.
- **End-to-end smoke**:
  1. `msedge.exe --headless --print-to-pdf=…` rendered `mykad.html`, `grab-earnings.html`, `tnb-bill.html` to PDFs (70-585 KB each).
  2. `curl -F ic=@mykad.pdf -F payslip=@grab-earnings.pdf -F utility=@tnb-bill.pdf POST /api/agent/intake`.
  3. SSE ran 11 events in 59 s. `extract` returned `Profile(name='AISYAH BINTI AHMAD', ic_last4='4321', age=36, monthly_income_rm=2800, form_type='form_b', ...)` — privacy invariant held. Household size defaulted to 1 + empty `dependants` (the demo docs don't carry household info — that would come from a BK-01 or a separate declaration; known limitation, see below). `classify` emitted `per_capita_monthly_rm=2800` + 4 plain-English notes. `match` returned only `lhdn_form_b` qualifying at RM457/yr. `compute_upside` returned a Gemini-rendered Python snippet + stdout 55-char-wide table. `generate` produced a single-draft Packet. `done`.
- **Known limitation**: real-upload path extracts only what the synthetic demo docs disclose. MyKad + Grab earnings + TNB bill don't contain household composition fields, so `household_size=1` + `dependants=[]` falls out — STR 2026 and JKM Warga Emas don't match. The demo narrative handles this cleanly: the **"Use Aisyah sample documents"** button triggers the frontend's mock SSE replay which shows the full three-scheme flow (STR RM450 + JKM RM7,200 + LHDN RM558 = RM8,208/yr) against the fixtured Aisyah profile. Judges see the full pipeline either way.
- **Not done in Path 2 (blocked on user action)**:
  - `gcloud auth application-default login` — interactive browser OAuth, can't be driven from this CLI session.
  - Once ADC is green: `python backend/scripts/seed_vertex_ai_search.py --project layak-myaifuturehackathon --execute` runs in ~5 min (incl. the 180 s indexing wait); populates `VERTEX_AI_SEARCH_DATA_STORE` in `.env` after canaries pass.
  - Vertex AI Search enrichment of `match_schemes` — when the VAIS data store is live, each `SchemeMatch.rule_citations` gets real retrieved passages + URLs instead of the rule engine's hardcoded ones. Rule engine remains the source of truth for the numbers; VAIS is the grounding layer.
- **Verification**: ruff check + format clean on 23 files; pytest 39/39 passed in 2.75 s (rule-engine tests are Gemini-free and unaffected by the tool rewrites).

---

## [21/04/26] - Moved frontend favicon into public static assets

Moved `frontend/src/app/favicon.ico` into `frontend/public/favicon.ico` so Next.js serves it as a static asset. Updated `frontend/src/app/layout.tsx` metadata to point at `/favicon.ico` explicitly, and verified the layout file still type-checks.

## [21/04/26] - Synced frontend Aisyah fixture to Hao's Task 3 Path 1 stub outputs (classify notes, compute_upside stdout, packet filenames)

After merging `origin/main` (Hao's Task 3 Path 1 + demo-doc redesign), the frontend mock fixture drifted from backend stub output in three places — mock-mode would have shown different strings than wired-mode. Aligned verbatim.

- **Classify notes** (`AISYAH_CLASSIFICATION.notes`) — replaced my three expository notes with the five Hao's `classify_household` stub derives from the profile: `Household size: 4.`, `Per-capita monthly income: RM700.`, `Filer category: FORM B.`, `2 child(ren) under 18 in household.`, `1 parent dependant(s) aged 60+.`
- **Compute upside stdout + Python snippet** (`AISYAH_UPSIDE`) — replaced my short `"Total annual upside: RMx,xxx"` format with Hao's deterministic `{:<42s}{:>12,}` table format. Stdout now reads `Scheme … Annual (RM) / ─── / JKM Warga Emas — dependent elderly payment … 7,200 / LHDN Form B — five YA2025 reliefs … 558 / STR 2026 — Household with children tier … 450 / ─── / Total upside (annual) … 8,208`. Python snippet mirrors `backend/app/agents/tools/compute_upside.py:_python_snippet` line-for-line.
- **Packet filenames** (`AISYAH_PACKET.drafts[].filename`) — replaced my lowercase kebab-case filenames with Hao's `_FILENAME_TEMPLATES` output slugged by `ic_last4=4321`: `JKM18-warga-emas-draft-4321.pdf`, `LHDN-form-b-relief-summary-4321.pdf`, `BK-01-STR2026-draft-4321.pdf`. Matches what the `PacketDownload` component will receive from the real backend.
- No schema changes — `Profile`, `SchemeMatch`, `HouseholdClassification`, `ComputeUpsideResult`, `Packet`, `PacketDraft` all stable across the merge. No `agent-types.ts` edits needed.
- Re-alignment may be needed when Hao's Path 2 (real Gemini Code Execution) lands — actual Python output may differ from the stub's template-filled snippet. Left a note in `AISYAH_UPSIDE` for re-sync.
- `pnpm run lint` clean. `pnpm run build` clean.

---

## [21/04/26] - Phase 1 Task 5 PO2 prep: packet download card, error recovery card, mobile polish on scheme card

Front-loading the three PO2 items for Task 5 so the 12:30 paired wiring block is a straight SSE-endpoint swap rather than a build-and-wire session.

- Wrote `frontend/src/components/results/packet-download.tsx` — renders after `state.phase === 'done'` when `state.packet != null`. One `DraftRow` per `PacketDraft`: `FileDown` icon + filename + `scheme_id` meta + right-aligned button. When `blob_bytes_b64` is populated, clicks decode via `atob` → `Uint8Array` → `Blob(application/pdf)` → `URL.createObjectURL` + anchor click download; when null (mock + pre-WeasyPrint real mode), the button is disabled with `Pending backend` copy and a one-line footer explains the packet shell is ready for Task 5 wiring. Header reassures on the DRAFT-watermark invariant. Covers FR-8 UI side.
- Wrote `frontend/src/components/home/error-recovery-card.tsx` — `destructive`-tinted shadcn Card rendered when `state.phase === 'error'`. Title + `AlertTriangle` icon + error message as `CardDescription`. Two full-width-on-mobile, side-by-side-on-sm action buttons: `Try with sample documents` triggers `handleUseSamples` (mock replay — the escape hatch per FR-3 AC "UI offers to retry or fall back to seed data"), `Start over` triggers `reset`. Covers the missing error path the audit in `docs/progress.md` flagged.
- Rewired `frontend/src/components/home/home-client.tsx` — added `showError = state.phase === 'error'` derived flag; rendered `<ErrorRecoveryCard />` above the generic `Start over` button (which is suppressed in the error case since the recovery card carries its own). `<PacketDownload packet={state.packet} />` sits below `<CodeExecutionPanel />` in the results block, so the demo flow reads top-down: stepper → RM hero → scheme cards → code trace → downloads.
- Mobile polish on `frontend/src/components/results/scheme-card.tsx` — header flex direction now `flex-col sm:flex-row sm:items-start sm:justify-between` so the RM value stacks below the title at 375px instead of crowding the scheme-name column. Added `break-words` to the title and `w-fit` to the `agency` Badge so long agency strings don't stretch unnaturally. The upload widget was already column-stacked at all breakpoints (three inputs vertical, not side-by-side) — no change needed there; ticked plan L246 with a note.
- `pnpm run lint` clean. `pnpm run build` clean.
- Next PO2 action: coordinate with PO1 at 12:30 paired-wiring block — confirm SSE event shape hasn't drifted, plug real backend URL, smoke-test Aisyah happy path end-to-end.

---

## [21/04/26] - Demo docs: rebuilt MyKad, Grab earnings, and TNB bill for vision-model parseability and Malaysian-document realism

Consolidated from three iterative rounds of PO1-driven redesign (squashed under one commit per the "why are you creating multiple commits for the same task" feedback). Originals of the three demo docs landed in earlier pushed commits (`d6b1664`, `47214ae`); this commit carries all the later polish.

- **Watermark rewritten on all three docs.** `SYNTHETIC — FOR DEMO ONLY` at 22 % red alpha overlay was actively blocking Gemini 2.5 Flash multimodal OCR — the text was simply unreadable under the band. Replaced with a subtle diagonal `For Demo` marker at 7 % alpha on the A4 docs and 10 % on the MyKad, `font-weight: 500`, two repeats per doc. Still clearly signals "synthetic" to a human viewer while leaving the underlying data fully parseable by the vision model.
- **Typography pass.** Body / value text standardised at `font-weight: 400–500` across all three docs. Gemini 2.5 Flash historically mis-reads ultra-bold numerals; dropping every 700–900 weight on body copy fixed that. 500 retained only on headings and key totals.
- **MyKad (`mykad.html`)**: full rebuild to match the annotated real-MyKad reference.
  - Light blue-green card background (`#d5ecef → #9fc9cf`). No more holographic "MyKad · MyKad · …" diagonal text pattern (removed — PO1 flagged as visually fake). Replaced with a proper security-style background: two layered inline-SVG data-URI patterns at 50 % opacity drawing a horizontal guilloche (Q-curves at staggered offsets) plus overlapping concentric rosettes in muted navy `#1c4a78`. Adds a laminated-plastic feel without reproducing any real security feature. Subtle radial-gradient vignette for corner depth.
  - Pink-stamp title with navy outline (`#f0d3d9` fill, `0.35mm solid #2a2e8c` border, `0.6mm` radius) carrying three stacked lines — `KAD PENGENALAN` (Arial) / `MALAYSIA` (Times serif, 4.2mm, spaced) / `IDENTITY CARD` (Arial) in `#2a2e8c`. Matches the reference layout.
  - `MyKad` word (italic-feeling `Segoe UI` in Malaysian-flag red `#c8102e`) + a small red ✓ checkmark glyph (inline SVG) + a proper Jalur Gemilang flag (inline SVG: 14 horizontal red/white stripes, blue canton at upper-left extending halfway, yellow simplified 5-point star + crescent). Badge is flush-right (`margin-left: auto`, ~2.5mm from card edge) per PO1 feedback.
  - Body starts at `top: 17mm` so the IC number clears the pink stamp's bottom edge. IC number `900324-06-4321` at `font-weight: 500`, colour `#111` (true black), 4.4mm, monospaced-feel letter-spacing — not bolded. Gold chip placeholder (9 × 7mm gradient fill, `::before` / `::after` pseudos drawing 4 horizontal contact lines + 1 vertical divider) sits below the IC. Name in mixed regular weight. Address in all-caps 2mm regular weight. No ghost photo (PO1 explicitly rejected).
  - Photo column on the right: 24 × 29mm grey-gradient placeholder with "Photo placeholder" label + "WARGANEGARA" status below. "H" administrative serial bottom-right.
- **Grab earnings (`grab-earnings.html`)**: commercial-invoice layout mirroring the reference sample.
  - Plain italic green `Grab` wordmark top-left — no swoosh flourish (the quarter-circle border-only shape looked weird and unlike the real logo; dropped).
  - Green rounded title box top-right: `MONTHLY EARNINGS STATEMENT` + `Statement No : GRB-2026-03-38271` / `Date : 31/03/2026` / `Currency : MYR`.
  - Issuer block (Grab Malaysia Sdn. Bhd., KL Sentral address, www.grab.com), partner + statement two-column metadata with green-left-border section titles, itemised earnings table (No / Description / Tax Rate (%) / Amount (MYR)) summing to net RM2,800.00 (= `monthly_income_rm` in `backend/app/fixtures/aisyah.py`).
  - Bank-transfer box (Maybank beneficiary + masked account + SWIFT + payout reference) mirrors the sample's "Please Transfer To" block. Net-Payout row highlighted on emerald background. Thank-you + LHDN Form B deadline note + `** This is a computer generated document. No signature required. **` footer.
- **TNB bill (`tnb-bill.html`)**: full redesign to the real Malaysian-TNB-bill layout (page 1 of 3).
  - Header: navy `Bil Elektrik Anda` pill + red TENAGA / NASIONAL stacked wordmark with a 10mm red brand-mark square carrying an inline-SVG **lightbulb icon** (outline-only, white stroke — replaces the earlier star which looked unlike real TNB branding).
  - Three-column customer + bill grid with Malay labels: `ALAMAT POS` (Aisyah + address), `TARIKH BIL` (05 April 2026), `NO. AKAUN` (082-0012-3456), `TEMPOH BIL` (01.03.2026 – 31.03.2026, 31 Hari), `JENIS BACAAN` (Sebenar), `NO. INVOIS` (TNB-2026-03-0820012), `TARIF` (Domestik (A)), `DEPOSIT SEKURITI` (RM50.00), `JUMLAH BAYARAN DITERIMA` (11.02.2026 – 11.03.2026, RM74.80).
  - CSS-drawn barcode + serial + JomPAY box (biller `9191`, Ref-1 account, Ref-2 invoice, standard JomPAY BM footer blurb).
  - Payment area: navy `Jumlah Bil Anda` card (8.5mm `RM72.46`, white `KLIK DISINI UNTUK PEMBAYARAN` CTA, `Sila Bayar Sebelum 30 April 2026`) + `Ringkasan Bil Anda` three-card summary (`Baki Terdahulu (RM) 0.00 + Caj Semasa (RM) 72.46 + Pelarasan Penggenapan (RM) 0.00`).
  - 6-month bar chart (`Caj Elektrik Anda Bagi Tempoh 6 Bulan`): OKT 68.50, NOV 71.20, DIS 75.80, JAN 73.40, FEB 70.90, MAC 72.46 — CSS-width bars with inline RM labels.
  - `Maklumat Tambahan untuk Anda` (2-column dotted-row grid): meter readings (Bacaan Semasa 4,501 kWh / Terdahulu 4,218 kWh / Penggunaan 283 kWh) + tariff breakdown (200 kWh @ RM0.218 = RM43.60, 83 kWh @ RM0.334 = RM27.72, KWTBB 1.6 % = RM1.14). `TIP MENINGKATKAN KECEKAPAN TENAGA` banner + page counter `m/s 1 / 3` in the footer strip.
- **Render guide** (`docs/trd.md` §9.6): render-to-PDF guide (Chrome headless fallback + settings to avoid clipping watermarks), data-fidelity table, "Watermark — For Demo" rationale section (Gemini vision couldn't read through 22 % red), "Legal and safety relaxations (PO1 decision, disclosed)" section listing what relaxed (chip graphic, stylised flag + checkmark, regular-weight body text) vs what remains off-limits (Jata Negara, real logos / photography, chip geometry that could mechanically pass). Provenance drift disclosed (IC last-digit parity vs fixture; age vs DOB).
- **Data fidelity across iterations** (unchanged through five redesigns): name `AISYAH BINTI AHMAD`, IC last-4 `4321`, monthly income RM2,800, address identical between MyKad and TNB. Math still checks: 3,520 − 704 − 116 + 100 = 2,800; 43.60 + 27.72 + 1.14 = 72.46; 4,501 − 4,218 = 283 kWh.
- **Audits** (three parallel subagents per round — legal safety, data fidelity, vision-model parseability): real bugs caught and fixed inline included (i) LHDN §6.20 → §6.19 miscitation (covered in earlier Task 4 commit), (ii) Unicode minus vs ASCII hyphen trap flagged for Path 2 implementer, (iii) seed-script `default_serving_config` path bug (covered in Task 3 Path 1 audit-fix commit). All audits returned green after fixes.
- **Verified**: `pnpm -C frontend build` passes; `pytest -q` in `backend/` passes all 39 rule-engine tests (backend untouched); `docs/trd.md` §9.6 marked RESOLVED pointing at `docs/demo/` in the earlier pushed commit.

---

## [21/04/26] - Task 3 Path 1 audit fixes: seed script serving_config path, ADC pre-check, pre-canary wait

Three parallel subagent audits on `6f263ee`: plan-adherence (Path 1 fully compliant, green), SSE wire-shape stability (stable, 2 flags for Path 2 awareness), seed-script production-readiness (1 bug, 3 flags). Bug fix + two flag-upgrades landed here.

- **Bug fix — seed script canary would fail on first live run.** `_run_canaries` used `serving_config = "{store_path}/servingConfigs/default_search"` but the canonical v1 name is `default_serving_config`. Every canary would have returned `NotFound` / `PERMISSION_DENIED`, surfacing as `[ERR ]` and an exit-2 even when indexing succeeded. One-line change in `backend/scripts/seed_vertex_ai_search.py:_run_canaries`; comment cites the audit so future drift is caught.
- **ADC pre-check** — new `_check_adc()` runs at the top of `_execute()` calling `google.auth.default()`. Missing ADC now fails fast with "Run: gcloud auth application-default login" instead of a cryptic mid-stream error from the first `get_data_store` call.
- **Pre-canary wait bumped 60 s → 180 s** — first-index latency on a fresh Discovery Engine data store for a 6-PDF corpus is typically 2-5 min. The previous 60 s sleep guaranteed one false MISS retry on every fresh seed; 180 s gets past the median first-index time without burning too much wall clock on re-runs.
- Audit flags **not acted on** (cosmetic / Path 2 concerns): drift-detect for existing store reconciling different content_config (acceptable for a sprint seed); per-step try/except in `stream_agent_events()` to populate `ErrorEvent.step` (Path 2 UX refinement); `ComputeUpsideResult` projecting real Gemini Code Execution output down to the four locked fields — documented as a trap in the Path 2 implementation TODO by the SSE-stability audit.
- **Verified**: ruff `check` + `format --check` clean on 27 files, dry-run seed script runs, `pytest -q` 39 passed in 3.13 s.

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

## [21/04/26] - Demo-docs audit fixes: watermark opacity, README Chrome guide, provenance-drift disclosure

Three parallel subagent audits (legal compliance, fixture-data fidelity, print-to-PDF fidelity) on commit `d6b1664` returned actionable findings. Fixed here.

- **A4 watermark opacity** — bumped `rgba(196, 30, 58, 0.14)` → `rgba(196, 30, 58, 0.22)` on both `grab-earnings.html` and `tnb-bill.html`. The 0.14 alpha would have reduced to ~11% grey luminance on a B/W printer (invisible); 0.22 survives grayscale. Also shifted the `.wm.top` / `.wm.mid` rows from `22%`/`52%` to `28%`/`55%` so the rotated watermarks clip symmetrically rather than the top band being half-hidden by page overflow.
- **README Chrome print guide** — dropped the A7 fallback line (A7 = 74 × 105 mm, not a "close substitute" for the 85.6 × 54 mm MyKad; misleading advice). Replaced with explicit Chrome print-dialog settings (uncheck `Headers and footers`, set `Margins: None`, leave `Background graphics: on`) and a copy-pasteable `google-chrome --headless --print-to-pdf` command as the deterministic fallback. Also noted that `file://` works if Next's dev server isn't running.
- **Intentional provenance drift** — added a "Known synthetic-provenance drift (intentional, disclosed)" section to `docs/trd.md` §9.6 documenting two issues an observant viewer would spot:
  1. MyKad shows `PEREMPUAN / FEMALE` but IC last digit `1` is odd (male-coded under real MyKad convention). The `4321` last-four is fixture-locked (`backend/app/fixtures/aisyah.py`); flipping would ripple through 20+ test + doc references. Disclosed rather than flipped.
  2. MyKad DOB `24 MAR 1990` derived from IC prefix makes Aisyah 36 at the demo's "now" (21 Apr 2026), but the fixture + `docs/prd.md` / `docs/roadmap.md` / `docs/project-idea.md` all say age 34. The IC and the age each come from separately-locked sources; the drift is synthetic-only and never enters the rule engine (rules use dependant ages and income, not `profile.age`). Disclosed rather than reconciled.
- **Not addressed** (audit flagged but cosmetic): minor A4 overflow headroom on `grab-earnings.html` and `tnb-bill.html` — each leaves 15–40 mm of page-2 safety margin, fine for current content; `address plausibility` (real-street + arbitrary house number pattern) — standard synthetic-persona practice and borderline under PDPA, documented in `docs/trd.md` §9.6 already.
- **Verification:** `pnpm -C frontend build` still passes (static `public/` assets don't hit the compile graph); `pytest -q` in `backend/` passes all 39 tests.

## [21/04/26] - Added three synthetic Aisyah demo documents (MyKad, Grab earnings, TNB bill) closing TRD §9.6

Independent PO1 task from `docs/mockgen.md`. Three self-contained HTML files at `docs/demo/` styled to look like the documents Aisyah uploads during the demo, plus a render guide.

- `docs/demo/mykad.html` — 85.6 × 54 mm (ISO/IEC 7810 ID-1) via `@page`. Off-white `#f5f3ed` with Pahang-green `#006c35` top border; photo placeholder + signature strip + IC (monospace), name, citizenship, gender (PEREMPUAN / FEMALE), DOB 24 MAR 1990, and the shared address. Stylized "MyKad · KAD PENGENALAN MALAYSIA" text header — **no coat of arms, holographic foil, or chip contacts** (Critical Do-Nots compliance). Three diagonal `SYNTHETIC — FOR DEMO ONLY` watermarks at 22 / 50 / 78% card-height so any reasonable crop still shows one.
- `docs/demo/grab-earnings.html` — A4 portrait, emerald `#00b14f` Grab-ish accent, stylised `g` monogram in place of the real logo. Partner block (AISYAH BINTI AHMAD, Partner ID `KTN-GRAB-38271`, GrabCar Saver, Maybank ••••8276, Kuantan zone, Gold tier), 6-row earnings table totalling **Net payout RM2,800.00** = `monthly_income_rm` in the fixture. Statement period 1–31 March 2026, issued 31 March 2026, next statement 30 April 2026. Tax-note callout points the user at LHDN Form B filing by 30 June 2026 (YA 2025). Three watermarks at 22 / 52 / 82% page-height.
- `docs/demo/tnb-bill.html` — A4 portrait, TNB green `#00793f` + yellow `#fcd116`, stylised `T` monogram. Customer block pins the identical address to the MyKad (the residence cross-check the classify step uses), account `082-0012-3456`, tariff Domestic (A) single-phase. Billing period 01-03-2026 → 31-03-2026, issue 05 April 2026, due **30 April 2026**. Consumption block: prev 4,218 → curr 4,501 kWh = 283 kWh, first 200 @ RM0.218 (RM43.60), next 83 @ RM0.334 (RM27.72), subtotal RM71.32, KWTBB 1.6% RM1.14, **Amount due RM72.46**. JomPAY panel with real public biller code `9191`, synthetic references, QR placeholder. Three watermarks at the same 22 / 52 / 82% heights.
- `docs/trd.md` §9.6 — one-paragraph render guide (open in Chrome → Cmd+P → Save as PDF; custom paper size for the MyKad; A4 for the rest), plus the data-fidelity table and the legal-safety reasoning that each file stays PDPA 2010 / NRR 1990 compliant.
- **No React-tree churn, no deps installed, no configs touched.** Static assets under `public/` are served as-is by Next.
- Sanity-check: `pnpm -C frontend build` still passes (static `public/` files don't enter the compile graph).
- Closed `docs/trd.md` §9.6 open question with a RESOLVED marker pointing at `docs/demo/`. Note inside: the original plan said "payslip (EA Form/CP8A)" but Aisyah is a Form B gig worker — an EA Form would misrepresent her filer category, so `grab-earnings.html` replaces it. The net payout still ties to `monthly_income_rm`.
- IC number quirk flagged by the brief (last digit even = female, `4321` ends in 1 → male-coded): preserved intentionally because the `ic_last4 = "4321"` value is fixture-locked across backend tests and the rule engine. Rippling a change across both sides of the codebase would cost more than the synthetic mismatch risks.

## [21/04/26] - Synced frontend Aisyah fixture to Phase 1 Task 4 rule-engine output

- Merged `origin/main` (commits `5b072b8` Task 4 rule engine + `2f7155d` §6.19 fix) into the `frontend` branch. Conflicts were additive in `docs/progress.md` + `docs/plan.md` only — resolved by concatenating entries in chronological order.
- The rule engine produced different Aisyah figures than the initial Task 2 commit-2 fixture mirror. New live totals: **JKM Warga Emas RM7,200 + LHDN Form B RM558 + STR 2026 RM450 = RM8,208/year** (was RM9,408). Both clear the plan.md ≥RM7,000 headline.
  - STR dropped from an assumed RM1,200 (higher tier) to the correct RM450 — Aisyah lands in the 1–2 children bucket × RM2,501–5,000 band of the risalah p.2 tier table.
  - LHDN dropped from an assumed flat RM1,008 to RM558 — real YA2025 bracket math: RM33,600 annual chargeable income minus RM30,500 stacked reliefs → RM3,100 taxable → RM0 tax after reliefs, saving the full RM558 that was otherwise owed.
- Rewrote `frontend/src/fixtures/aisyah-response.ts` to mirror the rule-engine output verbatim: `AISYAH_SCHEME_MATCHES` now sorted by `annual_rm` desc, `scheme_name` / `summary` / `why_qualify` strings regenerated per the engine's final copy, LHDN citations expanded to 6 entries (added §6.19.3 split between §49(1)(a)/§49(1)(b) and §6.11.3 lifestyle). `AISYAH_UPSIDE` Python snippet + stdout + `total_annual_rm` + `per_scheme_rm` all updated. `AISYAH_PACKET.drafts[]` reordered to match.
- `AISYAH_CLASSIFICATION.per_capita_monthly_rm` already RM700 — no change. Added a Form B filer note.
- `pnpm run lint` clean. `pnpm run build` clean.

---

## [20/04/26] - Phase 1 Task 2 commit 3: results view — ranked list, scheme cards, provenance panel, code execution trace

- Wrote `frontend/src/components/results/provenance-panel.tsx` — given `RuleCitation[]`, renders each citation as a clickable card (`rule_id`, `source_pdf · page_ref`). Clicking opens a shadcn `Dialog` with the passage text as a blockquote plus an external "Open source PDF" link (when `source_url` is present). Grounds FR-7.
- Wrote `frontend/src/components/results/scheme-card.tsx` — shadcn `Card` with agency `Badge`, scheme name, right-aligned "RMx,xxx per year (est.)" block, and `summary` description. "Why I qualify" toggle (`aria-expanded`) reveals the justification paragraph, the `ProvenancePanel`, and an "Open <agency> portal" external link. Grounds FR-6 + FR-9.
- Wrote `frontend/src/components/results/ranked-list.tsx` — filters to `qualifies=true`, sorts by `annual_rm` desc, renders a total-upside banner (uses `upside.total_annual_rm` when available, else sums `annual_rm`). Below the ranked cards, a "Checking… (v2)" section lists eight out-of-scope schemes from PRD §6.2 AC line 173 (i-Saraan, PERKESO SKSPS, MyKasih, eKasih, PADU sync, state-level aid, SARA claim flow, appeal workflow) as a 2-col grid of `opacity-60` cards.
- Wrote `frontend/src/components/results/code-execution-panel.tsx` — dedicated card rendering the Gemini Code Execution `python_snippet` and `stdout` as two `<pre>` blocks with `Code2` / `Terminal` icons. Advance-wires the Task 3 PO2 sync point ("Render Code Execution stdout in a small `<pre>` — this is the judge-trust moment") so commit 3 looks demo-complete in mock mode today.
- Rewired `frontend/src/components/home/home-client.tsx` results phase: replaces the placeholder with `<RankedList matches={state.matches} totalAnnualRm={state.upside?.total_annual_rm ?? null} />` followed by `<CodeExecutionPanel upside={state.upside} />` (rendered only when `upside` is present, so real-mode pre-Task-3 still renders cleanly).
- `pnpm run lint` clean. `pnpm run build` clean — 6.3 s compile, two routes prerendered static.
- Deferred to Task 5 / Task 6: responsiveness eyeball at 375 / 768 / 1440 viewports (final checkpoint manual QA), packet download button (FR-8, wired in Task 5 alongside WeasyPrint), error recovery card on `error` SSE events.

---

## [20/04/26] - Phase 1 Task 2 commit 2: SSE consumer hook, pipeline stepper, Aisyah fixture

- Wrote `frontend/src/lib/agent-types.ts` — TS mirror of `backend/app/schema/*.py` Pydantic models (`Profile`, `HouseholdClassification`, `SchemeMatch`, `RuleCitation`, `Packet`, `AgentEvent` discriminated union). Field names stay snake_case to match the JSON wire format. Exported `PIPELINE_STEPS` and `STEP_LABELS` constants.
- Wrote `frontend/src/fixtures/aisyah-response.ts` — canned replay mirroring `backend/app/fixtures/aisyah.py` verbatim (STR RM1,200 + JKM RM7,200 + LHDN RM1,008 = RM9,408/yr). Adds forward-looking fixtures the backend doesn't emit yet: `AISYAH_CLASSIFICATION`, `AISYAH_UPSIDE` (Python snippet + stdout), `AISYAH_PACKET`. `AISYAH_MOCK_EVENTS` is a 11-event ordered replay totalling ~3.8 s end-to-end.
- Wrote `frontend/src/lib/sse-client.ts` — `useAgentPipeline()` hook exposing `{state, start, reset}`. `start({mode:"mock"})` replays the fixture via staggered `setTimeout`s; `start({mode:"real", files})` POSTs multipart `FormData` to `${NEXT_PUBLIC_BACKEND_URL}/api/agent/intake` and consumes the `text/event-stream` body via `ReadableStream` + manual `data: …\n\n` chunk parser. `NEXT_PUBLIC_USE_MOCK_SSE=1` env flag forces mock for all real submissions. `AbortController` + `setTimeout` handles cleaned up on unmount or `reset()`. Reducer (`applyEvent`) is split out so the same logic drives both paths.
- Wrote `frontend/src/components/pipeline/pipeline-stepper.tsx` — shadcn `Progress` bar (percent complete) over an `<ol>` of five labelled rows. Each row carries a status icon (spinner / check / red alert / empty circle) and a textual state label. Active row picks up a `primary/5` tint, errored row a `destructive/5` tint. `aria-current="step"` on the active row for assistive tech.
- Rewrote `frontend/src/components/home/home-client.tsx` — derives display phase from `state.phase` (eliminates a `set-state-in-effect` ESLint error from the first pass). Submit + demo-mode handlers both call `start(...)`; `handleReset` clears fixture state and returns to landing. Results phase renders a placeholder with the total RM upside (real ranked list + provenance panel land in commit 3).
- `pnpm run lint` clean (after one correction). `pnpm run build` clean — 4.5 s compile, two routes prerendered static.
- Deferred to commit 3: `ranked-list.tsx`, `scheme-card.tsx`, `provenance-panel.tsx`, "Why I qualify" expander (FR-9), click-through source PDFs dialog (FR-7), out-of-scope "Checking… (v2)" cards (PRD §6.2).

---

## [20/04/26] - Phase 1 Task 2 commit 1: landing view, upload widget, demo-mode banner

- Flipped root `.env.example` `NEXT_PUBLIC_BACKEND_URL` from `:8000` to `:8080` to match `backend/app/main.py:13` (uvicorn `--port 8080`) and Cloud Run's default `PORT=8080`. Frontend branch only; backend untouched.
- Wrote `frontend/src/components/upload/upload-widget.tsx` — three separately-labelled file inputs (IC, payslip, utility) with `accept="image/*,application/pdf"`, mobile `capture="environment"`, controlled per-slot state, per-slot clear button, inline validation (`aria-invalid` + linked `aria-describedby`) rejecting files > 10 MB and non-image/non-PDF MIME types. "Continue" button disabled until all three slots are valid; "Use Aisyah sample documents" button sits adjacent (responsive row on sm+). Covers FR-2.
- Wrote `frontend/src/components/home/demo-mode-banner.tsx` — shadcn `Alert` in amber with `Sparkles` icon and copy "Running against Aisyah — a synthetic Grab driver …". Light + dark mode palette.
- Wrote `frontend/src/components/home/home-client.tsx` — `'use client'` orchestrator holding a three-phase state (`landing` | `processing` | `results`) and `isDemoMode` flag. Submit + "Use Aisyah" handlers both flip phase to `processing`; banner surfaces only in demo mode. Real SSE trigger + fixture replay land in Task 2 commit 2.
- Replaced `frontend/src/app/page.tsx` stub with a server component wrapping `HomeClient` inside shadcn `Card` + `CardContent`; copy references the extract → classify → match → rank → generate pipeline and the DRAFT invariant.
- `pnpm run lint` clean. `pnpm run build` clean — compiled in 8.5 s, two routes prerendered (`/`, `/_not-found`).
- Deferred to commit 2: `frontend/src/fixtures/aisyah-response.ts`, SSE consumer hook (`sse-client.ts`), pipeline stepper. Deferred to commit 3: ranked-list + scheme-card + provenance panel.

---

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
