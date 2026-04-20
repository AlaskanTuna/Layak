# ROADMAP

> **Project:** Layak
> **Hackathon:** Project 2030: MyAI Future Hackathon (GDG On Campus UTM)
> **Category:** Open
> **Team:** 2 members — PO1 (Team Lead), PO2 (Co-dev)
> **Registration deadline:** 20 Apr 2026 · 23:59 MYT
> **Submission deadline:** 21 Apr 2026 · 23:59 MYT
> **Effective build window (from idea lock):** ~26 hours

This roadmap is the single source of truth for the sprint. Claude Code re-reads this file before every major task. Anything not on this roadmap does not get built.

Owner convention: **PO1** drives AI/backend, **PO2** drives frontend/infra, **Both** = paired. Adjust as strengths dictate.

---

## Phase 0 — Decision & Setup

**When:** 20 April, afternoon → midnight
**Goal:** Registration submitted, idea locked, hello-world live on Cloud Run, both laptops primed. Sleep by 01:00.

| Time (MYT)    | Milestone                                                                                           | Owner | Deliverable                                                           |
| ------------- | --------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------- |
| ASAP          | Team Lead submits Google Form registration                                                          | PO1   | Submission confirmation visible in response sheet                     |
| ASAP          | Kick off Track 4 + Track 2 deep research in parallel                                                | PO1   | 2 claude.ai chats running                                             |
| ASAP → 20:00  | PO2 reads handbook + FAQs independently                                                             | PO2   | Aligned understanding, any flags raised                               |
| 20:00         | Both review research reports, debate top 3 ideas                                                    | Both  | **DECISION: idea + track locked**                                     |
| 20:15         | Project name chosen; rename repo `myai-future-hackathon` → codename                                 | PO1   | Renamed public repo                                                   |
| 20:15 → 22:00 | Scaffold `docs/` via Claude Code kickoff prompt                                                     | PO1   | `docs/prd.md`, `docs/trd.md`, `docs/progress.md`, `README.md` stubbed |
| 20:15 → 22:00 | GCP project, billing linked, enable Vertex AI + Cloud Run + Artifact Registry + Secret Manager APIs | PO2   | `gcloud` authed on both laptops                                       |
| 22:00         | Gemini API key from AI Studio                                                                       | PO2   | Key in local `.env` (NOT committed); `.env.example` committed         |
| 22:00 → 23:30 | Hello-world: FastAPI route → Gemini call → container → Cloud Run                                    | Both  | Public URL returns a Gemini response in browser                       |
| 23:30         | Commit, push, tag `v0.0.1-helloworld`                                                               | PO1   | Green build on `main`                                                 |
| **00:30**     | **SLEEP — hard rule**                                                                               | Both  |                                                                       |

**Phase 0 exit gate:**

- [ ] Registration confirmed
- [ ] Idea + track locked and written into `docs/prd.md`
- [ ] Repo public on GitHub with `docs/` and `README.md` stubbed
- [ ] AI disclosure section in README names Claude Code explicitly (Rules §4.2)
- [ ] Hello-world Gemini call reachable on a Cloud Run URL
- [ ] Both laptops can `gcloud run deploy` independently

---

## Phase 1 — Core Build

**When:** 21 April, 08:00 → 18:00
**Goal:** One critical user journey. End-to-end. On Cloud Run. No side quests.

| Time (MYT)    | Milestone                                                     | Owner | Deliverable                                           |
| ------------- | ------------------------------------------------------------- | ----- | ----------------------------------------------------- |
| 08:00 → 08:30 | Stand-up. Re-read roadmap. Claim tasks.                       | Both  | Today's plan crystal clear                            |
| 08:30 → 10:30 | Backend: data models, Gemini agent wired to 2–3 FunctionTools | PO1   | `/api/agent` returns real agent responses             |
| 08:30 → 10:30 | Frontend scaffolding: framework, routing, API client stub     | PO2   | Skeleton UI reachable locally                         |
| 10:30 → 12:00 | Backend: orchestration layer (agent takes ≥3 chained steps)   | PO1   | Agent autonomously executes the critical action chain |
| 10:30 → 12:00 | Frontend: build the critical journey UI with mock data        | PO2   | All screens render                                    |
| 12:00 → 12:30 | Lunch. Progress sync. Re-read `progress.md`.                  | Both  | Gap list identified                                   |
| 12:30 → 14:30 | Wire frontend ↔ backend (real API calls, no mocks)            | Both  | Happy path works end-to-end locally                   |
| 14:30 → 16:00 | Redeploy to Cloud Run. Test on the public URL.                | PO2   | URL shows the working journey                         |
| 14:30 → 16:00 | Backend hardening: error handling, structured logging         | PO1   | No 500s on the happy path                             |
| 16:00 → 17:30 | Mobile/desktop responsiveness pass                            | PO2   | Passes 3 viewport checks (375px, 768px, 1440px)       |
| 16:00 → 17:30 | Seed demo data. Rehearse the demo script 3×.                  | PO1   | Happy path runs cleanly 3× in a row                   |
| **18:00**     | **🔒 FEATURE FREEZE**                                         | Both  | No new code paths after this point                    |

**Phase 1 exit gate:**

- [ ] Critical journey works end-to-end on the live Cloud Run URL
- [ ] Agent autonomously chains ≥3 steps (not just Q&A) — this is the agentic moment
- [ ] No hardcoded secrets; env vars documented in `.env.example`
- [ ] README has setup steps, AI disclosure, architecture overview (15 code-quality marks)

---

## Phase 2 — Submission Package

**When:** 21 April, 18:00 → 23:00
**Goal:** Ship clean, complete artifacts. Nothing heroic, nothing risky.

| Time (MYT)    | Milestone                                                                                            | Owner | Deliverable                            |
| ------------- | ---------------------------------------------------------------------------------------------------- | ----- | -------------------------------------- |
| 18:00 → 19:00 | UI polish: copy, empty states, obvious bugs                                                          | PO2   | Demo-ready URL                         |
| 18:00 → 19:00 | README final pass: features, setup, AI disclosure, architecture diagram                              | PO1   | Rubric-ready README                    |
| 19:00 → 20:00 | Record 3-min video demo (script → 2 takes)                                                           | PO1   | Raw `demo.mp4`                         |
| 19:00 → 20:00 | Draft pitch deck in Canva (15 slides max)                                                            | PO2   | First pass of deck                     |
| 20:00 → 21:00 | Edit video (trim, captions if time); upload to YouTube unlisted                                      | PO1   | YouTube URL                            |
| 20:00 → 21:30 | Polish deck: problem → user → solution → demo → architecture → tech → impact → business model → team | PO2   | Final deck                             |
| 21:30 → 22:00 | Export deck to PDF; final repo sweep (remove scratch files)                                          | Both  | `pitch.pdf` in repo                    |
| 22:00 → 23:00 | Fill and submit the Google Form; double-check every link                                             | PO1   | Submission confirmation email received |
| **23:00**     | **🚨 HARD SUBMIT** (59-min buffer before the actual deadline)                                        | Both  | Form submitted                         |
| 23:00 → 23:59 | Buffer zone. Resubmit if anything is broken.                                                         | Both  | Peace of mind                          |

**Submission package checklist (must all appear in the Google Form):**

- [ ] Public GitHub repo URL
- [ ] Cloud Run deployment URL (loads without login; if login is unavoidable, submit test credentials via the separate form — never in the README)
- [ ] Video URL (YouTube or Google Drive, public or unlisted, ≤3 min)
- [ ] Pitch deck as PDF (≤15 slides, English)
- [ ] Both GitHub profile links
- [ ] Track + category clearly stated

---

## Freeze points

| Freeze         | When         | Rule                                                                         |
| -------------- | ------------ | ---------------------------------------------------------------------------- |
| Idea lock      | 20 Apr 20:00 | Decision is final. No further track/idea debate.                             |
| Scope freeze   | 21 Apr 08:30 | Only tasks on this roadmap get built. New ideas → `docs/parking_lot.md`.     |
| Feature freeze | 21 Apr 18:00 | No new endpoints, pages, or flows. Bug fixes only.                           |
| Code freeze    | 21 Apr 21:00 | No commits to `main` except submission-related metadata (README links, etc). |
| Hard submit    | 21 Apr 23:00 | Form submitted. Anything after is bonus polish.                              |

---

## Decision log

| Date        | Decision       | Value                                                                                                                                                                           |
| ----------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20 Apr 2026 | Category       | Open                                                                                                                                                                            |
| 20 Apr 2026 | Track          | Track 2 — Citizens First (GovTech & Digital Services)                                                                                                                           |
| 20 Apr 2026 | Project name   | Layak                                                                                                                                                                           |
| 20 Apr 2026 | Agentic moment | One upload → five visible agent steps (extract → classify → match → rank → generate) → ranked schemes, provenance-cited rules, and a signed DRAFT application packet.           |
| 20 Apr 2026 | Orchestrator   | ADK-Python v1.31 GA (not Genkit — Genkit-Python is Alpha with a known warm-instance bug on Cloud Run).                                                                          |
| 20 Apr 2026 | RAG layer      | Vertex AI Search (primary); Gemini 2.5 Pro inline-PDF 1M-context grounding as documented Plan B if Vertex AI Search setup stalls past sprint hour 12.                           |
| 20 Apr 2026 | Persona        | Aisyah, 34, Grab driver in Kuantan — files **Form B** (self-employed), not Form BE.                                                                                             |
| 20 Apr 2026 | Schemes locked | STR 2026 (household tier), JKM Warga Emas (RM600/mo per Budget 2026, RM500 fallback), five LHDN reliefs (individual, parent medical, child 16a ×2, EPF+life #17, lifestyle #9). |
| 20 Apr 2026 | Persistence    | Stateless — no DB, no GCS, no Firestore in v1. Scheme PDFs git-versioned at `backend/data/schemes/`.                                                                            |

---

## Non-goals

Mirrored from `docs/project-idea.md` §5 and `docs/prd.md` §6.2. Any item below renders as a greyed-out "Checking… (v2)" card in the UI — never a working feature.

- Live submission to any government portal (disqualification risk).
- Malay, Chinese, or Tamil UI (English only in v1).
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

---
