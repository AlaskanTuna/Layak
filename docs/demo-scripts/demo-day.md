# Demo Day Script

> **Duration:** 5 minutes presentation + 3 minutes Q&A session
> **Members:** 3 (ZJ, LH, JS)
> **Slides:** `docs/demo-slides/layak-pitch-detch.html`

---

- Begin with strong hook, end with strong slogan.
- 1.5–2 mins for slides presentation, the rest (3 mins) fully commit to live demo.

---

## [Introduction] (1m – 1m15s max)

### Route #1 — Interactive Scenario

Good morning/afternoon everyone. We are team T010NG. Before we begin the presentation, just to make sure no one's asleep — please raise your hands if you have already claimed your RM100 MyKasih subsidy.

If you haven't already — there's your reminder. For those unaware, MyKasih RM100 is the most widely known subsidy recently introduced by the Madani government to all Malaysians — auto-credited, no application required, just walk into a participating grocery store and you can purchase applicable items up to RM100 by just showing your IC card. And yet, most of us still nearly missed it, despite being the most easily accessible subsidy.

### Route #2 — Imaginary Scenario

Good morning/afternoon everyone. We are team T010NG. Picture this — you are sitting on the couch at your relative's house bing chilling during raya, and your pak cik suddenly pulls up next to you and asks "eh ah boy, can help me check what subsidies pak cik is eligible for ah? Pak cik very bad at tech stuff and navigating those website is causing me severe migraines".

So, you sit down with your phone and lock in — only to be drowned out by endless google searches, vague eligibility requirements, and complicated application processes. You try asking AI to help — but you're hesitant to give out your pak cik's personal details, and most of the sources from AI aren't truly verified. In the end, you give up and tell your pak cik that you aren't Tom Cruise and you're not getting paid enough to deal with mission impossible.

### Common Route

This is the crux of the issue. Malaysia's Ministry of Finance runs 167 (🤲) schemes across 17 agencies. However, the average citizen claims maybe one or two — because finding and applying for them costs more effort than they're worth.

True to our team's name, we are here to help with that. Introducing **LAYAK**, the agentic concierge website that finds every Malaysian subsidy you qualify for, in three uploads, under a minute, fully private and secure, with every single source backed up via verified gomen websites or documents.

---

## [Architecture Overview] (1m – 1m30s max)

Here is a brief architecture overview of Layak. Layak is not just a generic chatbot wrapper. There's no free-text answer. Every number on screen comes from a typed Python rule engine, grounded against a government PDF.

**Five autonomous steps.** [Slide 05] Gemini Flash reads your MyKad, payslip, and bill — multimodal, no OCR. Flash-Lite classifies your household. The rule engine matches you against Budget-2026 schemes — STR, JKM, LHDN reliefs, BUDI95, MyKasih. Gemini Code Execution computes annual upside in real Python — visible in the stream. WeasyPrint generates the draft packets.

**Eight Google components.** [Slide 11] Three Gemini tiers, Code Execution, Vertex AI Search for grounding, ADK-Python orchestrating, Cloud Run hosting, Firebase Auth gating.

**The grounding guarantee.** [Slide 06]

If Vertex AI Search returns no passage for a rule, the rule is dropped, not invented. Every number on screen is one click from its source PDF and page. That's the single beat that separates Layak from the MyGov chatbot disabled after one day.

---

## [Live Demo] (2m15s – 3m max)

We would now like to do a quick live demo of our deployed product, at **layak.tech**.

**[ACTION — landing page → login page]**

Our login page offers Google SSO and the traditional email/password signup options. For this demo, we shall proceed using the Guest account.

**[ACTION — Click "Try sample data" → Aisyah. Submit.]**

To simulate a fictional user, we shall use the persona as follows:

> Aisyah, 34, Grab driver in Kuantan, RM 2,800 a month, two kids, elderly father.

We can select the sample documents for Aisyah using this dropdown. Next, please watch the screen as our exclusive Layak agentic pipeline runs.

**[ACTION — Pipeline streams. Don't narrate every step — let the work speak.]**

> "Gemini Flash is reading her documents. Classify runs. Match — each scheme appears with a citation chip linking to the source PDF. Code Execution runs real Python in a Gemini sandbox — you can read the snippet. Five seconds later: three pre-filled PDFs."

**[ACTION — Headline number lands. Pause.]**

> "RM 13,808 a year. Six upside schemes, five subsidy-credit cards, one mandatory PERKESO contribution flagged separately so the headline stays honest."

**[ACTION — Scroll to the MyKasih card. Point to the bold red expiry line.]**

> "And here's the MyKasih RM100 card — eligibility confirmed, official portal link, and the bold red expiry: 31 December 2026. So Aisyah sees the deadline before she scrolls past."

**[ACTION — Click Cik Lay chatbot icon. Type a question.]**

> "Cik Lay — our concierge — is hard-constrained to her evaluation. Every reply cites the scheme. No legal advice, no IC requests, no off-topic answers. Five-layer guardrails."

**[ACTION — Click any 'Download PDF' button. Show watermark.]**

> "DRAFT — NOT SUBMITTED on every page. Layak never auto-submits — Aisyah reviews, signs, and submits via the official portal herself. That's the line we don't cross."

Five schemes, one minute, zero hallucinations. That's Layak. We're happy to take questions.

---

## [Q&A Session] (3m)

### Most likely (prepare these cold)

**"Why aren't you the MyGov chatbot 2.0? What stops you from getting shut down?"**

→ MyGov was a free-text chatbot that hallucinated minister portfolios and RON95 prices. Layak has no free-text path in the pipeline — every claim is a Python rule engine output with a Vertex AI Search citation. If retrieval misses, the rule is dropped, not invented. Cik Lay (the chat) is hard-constrained to the loaded evaluation only.

**"What about PDPA — you're handling MyKad numbers?"**

→ Manual-entry path collects zero IC information. Upload path processes the MyKad transiently in Gemini's request-scope memory — no IC tail retained on the persisted profile. Original document bytes never persist past the request.

**"Where exactly is Google's AI ecosystem used?"**

→ Eight components in one flow — Gemini 2.5 Pro (RootAgent), 2.5 Flash (multimodal extract), Flash-Lite (classify), Code Execution (arithmetic), Vertex AI Search (grounded RAG), ADK-Python (SequentialAgent), Cloud Run (deploy), Firebase Auth (identity).

**"How do you guarantee zero hallucinations?"**

→ Two contracts. (a) Match step is a typed Python rule engine with Pydantic-validated thresholds — not an LLM. (b) Every `annual_rm` value renders with a RuleCitation carrying source PDF + page + retrieved passage. The frontend never shows an uncited number.

**"Only 8 schemes? Malaysia has 167."**

→ V1 is depth-first hackathon scope. We've built the agentic discovery infrastructure in Phase 11 — an admin moderation queue that ingests new schemes from official gazetted PDFs with human-in-the-loop approval. Path from 8 → 67 → 167 is the v2 pivot.

### Second tier (likely)

**"What if rates change mid-year?"**

→ Discovery agent polls allowlisted government source pages, content-hashes them, and surfaces deltas to admin moderation. Approve a candidate, and `verified_at` on every scheme card updates automatically. **(THIS IS PROBABLY DEFERRED TO V2)**

**"What's the business model?"**

→ Free tier: 5 evaluations / 24 hours, 30-day history. Pro: unlimited evaluations, indefinite retention, profile editing. Already wired with quota meter + waitlist modal.

**"What does v2 look like for the Ministry of Digital?"**

→ V2 aligns explicitly with PPDSA — the Ministry of Digital's data-digitalisation policy that publicly names agentic AI as the next layer above MyGDX. Layak is what that layer looks like, grounded and auditable.

**"What about citizens who don't speak English?"**

→ Full trilingual: English, Bahasa Malaysia, Simplified Chinese — pipeline output, chat, and citations all localised. Users can switch live.

**"Is the demo hardcoded?"**

→ No. Try Farhan instead of Aisyah — the LHDN deadline citation flips from 30 June (Form B) to 30 April (Form BE) because the rule engine genuinely re-evaluates `form_type`. Happy to show it.

### Third tier (less likely, prepare brief answers)

**"What's your cost per evaluation?"**

→ Order-of-magnitude cents. Flash multimodal is the biggest line; Flash-Lite for classify is ~5× cheaper.

**"Why Cloud Run instead of Vertex AI Agent Engine?"**

→ Cloud Run gives us first-byte latency under 3s and full control over the SSE response shape. Agent Engine is a strong v2 path once GA pricing stabilises in asia-southeast1.

**"What's the latency?"**

→ ~60s median end-to-end. SSE stream means the user sees progress from second one — no blank loading screen.

**"Can it work without internet for offline rural users?"**

→ No — it's a Cloud Run service. The manual-entry path keeps the bandwidth footprint minimal, though.
