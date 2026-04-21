# Layak — Manual Entry Mode (Design Spec)

**Status:** Draft, awaiting PO1 sign-off
**Date:** 21 April 2026
**Author:** PO1 (Hao) + Claude Code draft
**Scope:** A privacy-first alternative to the three-document upload widget. Users who are cautious about handing MyKad / payslip / TNB scans to an LLM can type the same information into a structured form instead. Same five-step pipeline runs downstream; only the `extract` step changes.

**Non-goals:**

- Removing or deprecating the upload path. Upload stays the default.
- Supporting document-free evaluations in any flow other than the standalone intake form (no partial mixes of "upload two, type one").
- Changing the SSE wire contract beyond what is strictly necessary.

---

## 1. Motivation

Aisyah (the locked primary persona) is a Grab driver who carries her MyKad photo in her phone gallery; uploading it costs her nothing mental. But a meaningful share of privacy-sensitive users — seniors with their own NRIC in the shoebox, salaried professionals who treat their payslip as confidential, anyone who reads an upload prompt as a data-collection funnel — will bounce before the first multipart POST.

Layak's invariant has always been _"we discard the documents immediately after extraction"_ (docs/prd.md §7, NFR-3). Manual Entry Mode weakens that claim from "we only briefly touch the documents" to "we never touch the documents at all" — at the cost of the user re-typing five or six fields they already carry on a physical ID.

## 2. User-visible behaviour

On the intake page (v1: `/`, v2: `/dashboard/evaluation/new`), a segmented toggle sits above the three upload cards:

```
  [  Upload documents  ]  [  Enter manually  ]
        ^ default                 ^ privacy-first alternative
```

Choosing **Enter manually** replaces the three upload cards with a single vertical form divided into four sections:

1. **Identity** — from the MyKad
2. **Income** — from the payslip / Grab statement
3. **Address** — from the MyKad or utility bill
4. **Household** — from nothing (users disclose dependants directly)

Choosing **Use Aisyah sample documents** still works in either mode — in manual mode it pre-fills every form field with the Aisyah fixture values.

Submit button renders **Generate packet** regardless of mode; it POSTs to the appropriate endpoint (see §3) and the SSE stream that follows uses the same stepper UI the upload path uses today.

## 3. Backend contract

### 3.1 New endpoint

```
POST /api/agent/intake_manual
Content-Type: application/json
Authorization: Bearer <firebase-id-token>   # v2 only; v1 path is unauthed

{
  "name": "Aisyah binti Ahmad",
  "date_of_birth": "1992-03-24",
  "ic_last4": "4321",
  "monthly_income_rm": 2800,
  "employment_type": "gig",         // "gig" or "salaried"
  "address": "No. 42, Jalan IM 7/10, 25200 Kuantan, Pahang",
  "dependants": [
    { "relationship": "child",  "age": 10 },
    { "relationship": "child",  "age": 7  },
    { "relationship": "parent", "age": 70 }
  ]
}
```

Response: `text/event-stream`, same wire format as `/api/agent/intake`.

A new endpoint (rather than content-negotiating the existing one) keeps the contract trivially auditable — two URLs, two request shapes, two tests. There is no legacy caller we need to protect.

### 3.2 Pipeline reuse

The backend is factored so every step after `extract` consumes a validated `Profile` object. The manual path reuses classify → match → compute_upside → generate verbatim:

```
POST /api/agent/intake        → extract (Gemini OCR) → Profile → classify → …
POST /api/agent/intake_manual → build  (pure Python) → Profile → classify → …
```

The only new code is a thin adapter that maps the JSON payload to a `Profile`, plus a pure-Python reimplementation of the income-band heuristic the Gemini extract prompt applies today:

```python
# backend/app/agents/tools/build_profile.py  (new)
def derive_household_flags(
    monthly_income_rm: float,
    dependants: list[Dependant],
) -> HouseholdFlags:
    """Pure-Python twin of the extract prompt's household_flags logic.

    The extract prompt asks Gemini to set these three flags from the same
    inputs; reproducing them here keeps `Profile.household_flags` identical
    to the upload path for any given (income, dependants) pair.
    """
    has_children_under_18 = any(d.relationship == "child" and d.age < 18 for d in dependants)
    has_elderly_dependant = any(d.relationship == "parent" and d.age >= 60 for d in dependants)
    income_band = _classify_income_band(monthly_income_rm, has_children_under_18)
    return HouseholdFlags(
        has_children_under_18=has_children_under_18,
        has_elderly_dependant=has_elderly_dependant,
        income_band=income_band,
    )


def build_profile_from_manual_entry(payload: ManualEntryPayload) -> Profile:
    age = _age_from_dob(payload.date_of_birth)
    dependants = [Dependant(**d.model_dump()) for d in payload.dependants]
    return Profile(
        name=payload.name.strip().upper(),
        ic_last4=payload.ic_last4,
        age=age,
        monthly_income_rm=payload.monthly_income_rm,
        household_size=1 + len(dependants),
        dependants=dependants,
        household_flags=derive_household_flags(payload.monthly_income_rm, dependants),
        form_type="form_b" if payload.employment_type == "gig" else "form_be",
        address=payload.address,
    )
```

**`employment_type` → `form_type` mapping** (v1 lossy-but-total):

- `"gig"` → `"form_b"` (self-employed / gig worker, files Form B)
- `"salaried"` → `"form_be"` (regular employee, files Form BE)

This mirrors what `extract.py` instructs Gemini to emit and keeps the wire contract user-friendly (the user picks their employment type; they don't need to know the LHDN form-code system).

**`_classify_income_band` thresholds** — transcribed verbatim from `backend/app/agents/tools/extract.py:42-47` (the prompt the Gemini extract step applies today):

| Band                          | Monthly RM     | Extra condition              |
| ----------------------------- | -------------- | ---------------------------- |
| `b40_hardcore`                | < 1,500        | —                            |
| `b40_household`               | 1,500 – 2,500  | —                            |
| `b40_household_with_children` | 2,501 – 5,000  | `has_children_under_18=True` |
| `b40_household` (fallback)    | 2,501 – 5,000  | no children under 18         |
| `m40`                         | 5,001 – 10,000 | —                            |
| `t20`                         | > 10,000       | —                            |

Aisyah's RM2,800 + 2 children → `"b40_household_with_children"` ✓. Same income with no children would fall back to `b40_household`. Implementer should NOT paraphrase these thresholds — copy them out of `extract.py` and add a docstring cross-reference so future prompt edits can be mirrored cleanly.

### 3.3 SSE behaviour

Even though the manual path bypasses Gemini, it still emits the five-step wire sequence so the frontend stepper does not need conditional logic:

```
step_started: extract       # fires immediately
step_result:  extract        # carries the built Profile
step_started: classify
step_result:  classify
…
done
```

The extract step's `step_result.data` is identical in shape to the upload path — the UI already renders the extracted profile; it has no way to tell the difference. Frontend label for the step in manual mode: **"Profile prepared"** (not "Extracted"); this is a one-line copy change on the stepper.

### 3.4 Validation

Pydantic v2 `ManualEntryPayload` model:

| Field               | Type                   | Rule                                                                                                              |
| ------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `name`              | `str`                  | `min_length=1`, strip, uppercase server-side                                                                      |
| `date_of_birth`     | `date`                 | ISO-8601 `YYYY-MM-DD`; age derived from DOB + today in `asia-southeast1` TZ                                       |
| `ic_last4`          | `str`                  | `^\d{4}$`                                                                                                         |
| `monthly_income_rm` | `float`                | `ge=0`, `le=1_000_000` (sanity cap)                                                                               |
| `employment_type`   | `Literal`              | `"gig"` \| `"salaried"`                                                                                           |
| `address`           | `str \| None`          | optional; `max_length=500`                                                                                        |
| `dependants`        | `list[DependantInput]` | `max_length=15`; each row: relationship ∈ {child, parent, spouse, sibling, other}, age 0–130, `ic_last4` optional |

Derived server-side (not accepted from client):

- `age` (from DOB)
- `household_size` (1 + len(dependants))
- `household_flags` (from dependants + monthly_income_rm, same logic extract already uses)
- `form_type` (from `employment_type`)

Validation errors return a structured 422 with field-level messages the form can bind to.

## 4. Frontend contract

### 4.1 Toggle component

`frontend/src/components/evaluation/intake-mode-toggle.tsx` — two-segment shadcn `Tabs` or a simple radio group, state lifted to the parent page/client component. Default: `"upload"`. URL query param `?mode=manual` preloads the manual form — useful for direct-linking privacy-sensitive users.

### 4.2 Form component

`frontend/src/components/evaluation/manual-entry-form.tsx` — one component, four sections, `react-hook-form` + `zod` validation to match backend rules exactly.

Field layout:

**Identity**

- Full name (text, required)
- Date of birth (date input, required) — derives age client-side for the review panel
- IC last 4 digits (masked text, 4 chars, required)

**Income**

- Monthly income RM (number, required, ≥0) — formatted with thousands separator on blur
- Employment type (radio: "Self-employed / gig worker" or "Salaried employee"), with a one-sentence helper line under each explaining the LHDN form mapping

**Address**

- Home address (textarea, optional, max 500 chars)

**Household**

- "Add dependant" button prepending a row; rows render inline with relationship dropdown, age input, optional IC last-4
- "Household size: {n} (you + {len} dependant(s))" read-only hint beneath the list
- Empty state copy: "Add anyone you share a household with. Children under 18 and parents aged 60+ unlock specific schemes — add them here."

Submit handler POSTs JSON to `${BACKEND}/api/agent/intake_manual` (with `Authorization` header in v2), then pipes the SSE stream through the same `parseSseStream` generator the upload path uses.

### 4.3 Hook changes

`frontend/src/hooks/use-agent-pipeline.ts` — add a `"manual"` mode to `StartOptions`:

```ts
export type StartOptions =
  | { mode: 'mock' }
  | { mode: 'real'; files: UploadFiles }
  | { mode: 'manual'; payload: ManualEntryPayload }
```

The new `startManual(payload)` path mirrors `startReal(files)` but posts JSON and hits `/api/agent/intake_manual`. The SSE consumer is shared.

### 4.4 "Use Aisyah sample documents" in manual mode

When the user is on the manual tab and clicks the samples button, we pre-fill every form field with the Aisyah fixture values (name, DOB derived from IC 900324 → 1992-03-24, ic_last4 "4321", monthly_income_rm 2800, employment_type "gig", address, three dependants). Dependants whose fixture `ic_last4` is `None` are pre-filled with a blank IC input — the user can leave it blank or type it. Clicking a second time is idempotent. No auto-submit — the user reviews the filled form and clicks Generate.

## 5. Acceptance criteria

- [ ] **Deterministic Profile round-trip** — given the Aisyah JSON payload, `build_profile_from_manual_entry(...)` produces a `Profile` that equals `AISYAH_PROFILE` field-for-field (name, ic_last4, age, monthly_income_rm, household_size, dependants, `household_flags` including `income_band`, form_type, address). This is the bit-level check that keeps the two paths aligned.
- [ ] **Downstream match parity** — when that built `Profile` is fed into the rule engine (`match_schemes(profile)`), the resulting `SchemeMatch[]` equals `AISYAH_SCHEME_MATCHES` (which is already computed live from `AISYAH_PROFILE`, so this follows from the first criterion but is asserted explicitly for regression protection).
- [ ] **End-to-end SSE smoke** — `POST /api/agent/intake_manual` with the Aisyah payload emits the full 5-step stream (`step_started` + `step_result` for each of extract / classify / match / compute_upside / generate, plus `done`). The `extract` step_result carries the built Profile. The `classify` step still runs via Gemini — its output is not pinned (it's a nondeterministic call), but the `match` step's output is, because rules read `Profile.household_flags.income_band` which was set deterministically by `derive_household_flags`.
- [ ] Invalid payloads return HTTP 422 with field-level error messages the frontend can bind to.
- [ ] No full IC number crosses the wire — verified by the `ManualEntryPayload` schema (no `ic` field) and a test that asserts the built `Profile.ic_last4` is exactly 4 digits.
- [ ] Toggle switches render in both `/` (v1) and `/dashboard/evaluation/new` (v2) without layout shift.
- [ ] Manual form is keyboard-navigable top-to-bottom (tabindex default, no trap).
- [ ] "Use Aisyah sample documents" populates every field on the manual form; dependants whose fixture `ic_last4` is `None` show a blank IC input.
- [ ] `?mode=manual` query parameter preloads the manual tab on first paint.
- [ ] Stepper shows all five steps for the manual path; extract step label changes to "Profile prepared".

## 6. Tradeoffs considered

**T1. Endpoint split vs. content negotiation.** Chose split — two URLs are easier to document, test, and audit than one URL with a branch. The manual path also does not accept multipart, so content-negotiation would bring no user-visible benefit.

**T2. Full IC vs. DOB + last-4.** Chose DOB + last-4 — the full IC never leaves the user's keystrokes. Honours the motivation for the feature; the extra field is one date picker.

**T3. Household size field vs. derived.** Chose derived (`1 + len(dependants)`). Prevents the contradiction where a user sets size=5 but lists 2 dependants. Edge case "unlisted household member" is solved by adding a "other" relationship dependant row.

**T4. Skip extract step vs. synthesise it.** Chose synthesise — the stepper, results page, and Phase 3 Firestore persistence all already read the extracted profile from the `step_result` event; changing the wire format to a four-step variant would cost more frontend code than the one-line label change. The synthesised event also gives users a visual confirmation that "Layak understands my input" before classify runs.

**T5. Auth parity.** Chose parity with `/api/agent/intake`. v1 is unauthed, v2 is authed. No feature-specific auth bypass — keeps the boundary module (`backend/app/auth.py`) applicable to both intake endpoints unchanged.

## 7. Dependencies and sequencing

- **None.** The feature can land against v1 (pre-auth) or v2 (post-auth). The endpoint inherits whatever auth policy is applied to `/api/agent/intake` at the time of merge.
- Depends on `Phase 1 Task 4` rule engine being stable (it is).
- Depends on the classify/match/compute_upside/generate tools accepting a fully-populated `Profile` (they do — see `backend/app/agents/tools/classify.py`).

No blocker on Phase 2 Task 4, Phase 3, or Phase 4.

## 8. Out of scope (explicit)

- OCR from a typed IC number (we don't parse "900324-06-4321" to extract YYMMDD).
- A progressive disclosure UI that shows the upload card by default and only surfaces the toggle after an "Advanced" click.
- A hybrid mode where some fields come from upload and others are typed.
- Persistence of a partial manual-entry draft for later submission.
- Carrying the mode choice into the v2 evaluation history UI — both paths produce the same `evaluations/{evalId}` shape, so history treats them as one.
