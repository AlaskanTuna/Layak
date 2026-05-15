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

### Finalized script

Good morning/afternoon everyone. We are team T010NG.

Imagine this — during raya, your pak cik suddenly asks:

“Ah boy, can help pak cik check what subsidies I qualify for ah?”

(10 second)

So you try helping him.

A few minutes later, you're stuck between endless Google searches, confusing eligibility rules, and complicated application processes. You even try using AI, but here's your concern: is uploading pak cik’s personal details safe? Does all answers come from verified government sources?

At that point, you realise you're not Tom Cruise, and this is starting to feel more like Mission Impossible.

(40 second)

And that’s the real issue.

Malaysia currently has 167 subsidy schemes across 17 agencies, yet most people only claim one or two because discovering them is simply too complicated.

(55 seconds)

## True to our team’s name, we’re here to TOLONG / (help with that). Introducing LAYAK — meaning “eligible” — an AI-powered platform that helps Malaysians discover the subsidies they qualify for in under a minute, privately, securely, and backed by verified government sources.

## [Architecture Overview] (1m – 1m30s max)

And that last point — every claim backed by a verified source — is exactly where Layak's architecture earns its keep. Layak is not just any chatbot wrapper. Every number you see on screen comes from a typed Python rule engine, grounded against a real gazetted PDF. Let me show you how, in four pieces.

**[Slide 04 — System Architecture]**

Architecturally, Layak lives entirely inside one Google Cloud trust boundary, organised into three tiers — compute runs on Cloud Run, the AI layer runs on Vertex, and state sits in Firestore. And critically, the user's raw documents never persist anywhere. They're processed in memory and discarded the moment the pipeline finishes.

**[Slide 05 — Agent Pipeline]**

Our ADK-Python SequentialAgent orchestrates six autonomous steps — extract to draft packet — all streaming live to the screen. I'll save the step-by-step walkthrough for the live demo, where the pipeline runs in front of you and you can watch the agent think in real time.

**[Slide 09 — Vertex AI Search]**

The match step is the heart of our grounding story. Every rule queries Vertex AI Search across [switch] 20 gazetted government PDFs and pulls back the exact passage that justifies the eligibility decision. If retrieval misses, the rule is dropped — never invented. That's how we can promise zero hallucinations.

**[Slide 10 — Cik Lay]**

And once the results are on screen, Cik Lay — our concierge chatbot — takes over the conversation. She's hard-constrained to your evaluation only, guarded by five layers covering scope, topic, PII, legal, and citation. So every reply she gives is grounded in a real PDF, citing the exact page it came from.

---

## [Live Demo] (2m15s – 3m max)

Now, we are going to do a live demo on our website, layak.tech. The following is our sample persona, Aisyah, who's a Grab driver in Kuantan.

We can select the sample documents for Aisyah using this dropdown. As you can see, all you need is 3 documents for Layak to work its magic - a scanned copy of your IC, payslip and utility bill. For those concerned with their privacy regarding scanned documents, the documents are promptly discarded after extraction, never stored. There's also a manual input option as well. For better accuracy, we can also add dependants - for Aisyah here, she has 2 children below the age of 18, and 1 elderly parent.

Once all those details are done, the Layak pipeline executes. As briefly mentioned earlier, our pipeline consists of six steps:

1. The first step is extract. Our multimodal OCR first scans the user's MyKad, payslip and utility bill to fetch their relevant income details.
2. Second step is to classify the user's household according to three income bands, which you know are T20, M40, and B40.
3. Thirdly, we match the extracted details against the list of schemes in our database. Currently, we have 20 matchable schemes. and one day we hope to reach 167.
4. Fourth, we strategize. For each scheme that's matched, Gemini generates 1-3 sentences to advise the user as to why they're qualified for the scheme.
5. Then, we compute the upside of all the matched subsidies. This is the potential amount that is claimable by Aisyah.
6. Finally, we generate a pdf for each qualifying scheme, to allow Aisyah to download and submit her claims easily.

While the evaluation is running, we can view the pre-evaluated page first. As you can see, there is RM13k that Aisyah is potentially missing out on, which is 13k more than my bank account's balance. Jokes aside, below the computed upside, we can see the list of evaluated schemes that she's eligible for, as well as the pre-generated pdfs that she can use to apply for the subisides. Additionally, we have a chatbot, Cik Lay, that she can follow up with in case she has any questions or confusion.

Three documents, one minute, zero hallucinations. That's Layak. We're happy to take questions.

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

→ No. Try Farhan instead of Aisyah — the matched set changes because the rule engine genuinely re-evaluates `form_type`, income, dependants, and household flags. For example, a salaried profile routes to Form BE while a gig/self-employed profile routes to Form B; the UI shows the matching scheme IDs and citation chips from that actual run.

**"If the rule engine already knows the thresholds, why use Vertex AI Search instead of hardcoded citation text?"**

→ The rule decision is deterministic, but the evidence is retrieved. Hardcoded passages are summaries we wrote; Vertex AI Search returns text extracted from the actual gazetted PDF, with a `rag.<scheme>.primary` citation and `gs://` source URI that can be inspected on stage. That makes the pitch claim true: eligibility is rule-based, and every claim is grounded in a retrieved government source. It also keeps the system extensible — when a new scheme PDF is seeded, the citation layer can retrieve from the new source instead of waiting for someone to rewrite every passage by hand.

The design is fail-open hybrid, not RAG-or-nothing. If Discovery Engine misses or is down, the rule can fall back to the curated citation text; if RAG works, the user gets the verbatim PDF extract. The real trade-off is latency: each RAG call costs roughly 1–2s, but the 19 scheme checks now run in parallel, so Match is about the slowest retrieval call (~2.4s), not 19 calls added together.

**"Does RAG replace the deterministic rule engine?"**

→ No. RAG grounds the citation, not the eligibility math. The rule engine still decides things like income bands, dependant counts, form type, and annual amount in typed Python. Vertex AI Search supplies the auditable passage from the official PDF, so the UI can say why the rule exists without asking the model to invent or recompute it.

### Third tier (less likely, prepare brief answers)

**"What's your cost per evaluation?"**

→ Order-of-magnitude cents. Flash multimodal is the biggest line; Flash-Lite for classify is ~5× cheaper.

**"Why Cloud Run instead of Vertex AI Agent Engine?"**

→ Cloud Run gives us first-byte latency under 3s and full control over the SSE response shape. Agent Engine is a strong v2 path once GA pricing stabilises in asia-southeast1.

**"What's the latency?"**

→ ~60s median end-to-end. SSE stream means the user sees progress from second one — no blank loading screen.

**"Can it work without internet for offline rural users?"**

→ No — it's a Cloud Run service. The manual-entry path keeps the bandwidth footprint minimal, though.
