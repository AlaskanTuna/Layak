# Layak Demo Video Director Script - 5 Minutes

Intended runtime: `4:30-4:50`  
Upper limit used for planning: `5 minutes`

Intended use: richer story-led cut for handbook-aligned demo or finals-style showcase.  
Best for: edited recording with either human narration or AI voiceover.  
Read aloud: only the `VOICEOVER` sections.

Why this version exists: `docs/project-handbook.md` allows a demo video of up to 5 minutes. This version uses the extra time to introduce the citizen problem, the project objective, and the pipeline story more naturally before the live walkthrough.

Primary objective: preserve the strongest technical proof while giving judges more narrative context.

Demo focus: `v1 hackathon flow` first, with only light acknowledgment that `v2` adds persistence and product shell features around it.

## Recording Setup

- Start already authenticated.
- Capture one short results-only take for the cold open.
- Capture one full clean run from `/dashboard/evaluation/upload`.
- If possible, capture one close-up take of the `PipelineStepper` and one close-up take of the provenance or code-execution area.
- Keep cursor movement slow and intentional.
- Do not spend meaningful time on settings, pricing, waitlist, or full account flow.

## Director Transcript

### 0:00-0:20

**TIME:** `0:00-0:20`

**ON SCREEN:** Start on the results page with the annual upside hero visible. Hold for 2-3 seconds. Then cut to a clean visual introducing Aisyah: either the upload page with the `Use Aisyah` option visible or a simple title frame built from the synthetic Aisyah assets.

**VOICEOVER:**  
"This is Aisyah. She is our reference user for Layak. She is a working Malaysian citizen supporting her household, and like many people, she may qualify for multiple forms of aid or tax relief without knowing which rules actually apply to her."

**PACE:**  
`[hold 2.5s on results hero]`  
`[read warm and steady]`

**EDITOR NOTE:**  
This is the story hook. Do not rush past Aisyah's name or situation.

---

### 0:20-0:45

**TIME:** `0:20-0:45`

**ON SCREEN:** Stay on the upload screen or show a clean crop of the README functional diagram if it reads clearly on video. Keep the frame simple and uncluttered.

**VOICEOVER:**  
"The problem Layak tackles is fragmented public-service discovery. Today, a user like Aisyah still has to search across separate portals, interpret different eligibility rules, and repeat the same information over and over. [pause 0.5s] Our objective was to turn that manual hunt into one guided, grounded, draft-only AI workflow."

**PACE:**  
`[slight emphasis: fragmented public-service discovery]`  
`[slight emphasis: grounded, draft-only]`

**EDITOR NOTE:**  
This section replaces a traditional problem-statement slide.

---

### 0:45-1:10

**TIME:** `0:45-1:10`

**ON SCREEN:** Show the top functional diagram from the README or a clean pipeline visual. Keep the whole flow visible for a few seconds before returning to the app.

**VOICEOVER:**  
"Layak is not just chat. It is an agentic pipeline. Intake goes into a RootAgent, then flows through five visible steps: extract, classify, match, rank, and generate. [pause 0.4s] We use Gemini 2.5 Pro for orchestration, Gemini 2.5 Flash across the document and classification flow, Vertex AI Search for grounded retrieval, Gemini Code Execution for transparent arithmetic, and Cloud Run for the live web deployment."

**PACE:**  
`[pause 0.4s after five visible steps]`  
`[slow slightly on the tool names]`

**EDITOR NOTE:**  
If the README diagram is not crisp enough on screen, use the app and narration only.

---

### 1:10-1:30

**TIME:** `1:10-1:30`

**ON SCREEN:** Return fully to the evaluation upload page. Show the quick-start cards and the upload/manual-entry toggle.

**VOICEOVER:**  
"From the user's side, the experience stays simple. They can upload supporting documents, or switch to manual entry if they prefer not to hand sensitive documents to an AI model. For this demo, we use bundled synthetic Aisyah documents so the run is stable, repeatable, and safe to review."

**PACE:**  
`[pause 0.3s after manual entry mention]`  
`[emphasize: synthetic]`

**EDITOR NOTE:**  
Do not fill the manual form in the main cut.

---

### 1:30-2:20

**TIME:** `1:30-2:20`

**ON SCREEN:** Click `Use Aisyah` sample documents. Keep the `PipelineStepper` centered while the steps progress. Use a crop if needed so each step is legible.

**VOICEOVER:**  
"Now we let the workflow run. First, Gemini 2.5 Flash extracts a structured profile from the uploaded documents. Second, the system classifies Aisyah's household context. Third, Layak checks that profile against typed scheme rules and grounds the result with Vertex AI Search. Fourth, Gemini Code Execution computes the annual upside. Fifth, WeasyPrint generates the draft packet the user can review before manual submission."

**PACE:**  
`[short pause between each step]`  
`[slight emphasis: Vertex AI Search]`  
`[slight emphasis: Gemini Code Execution]`

**EDITOR NOTE:**  
This is still the most important technical proof section. Let the audience see the system think in steps.

---

### 2:20-2:50

**TIME:** `2:20-2:50`

**ON SCREEN:** Transition to the finished results page. Hold on the upside hero first. Then scroll slowly to the ranked scheme list and let the required-contributions area appear if the framing stays clean.

**VOICEOVER:**  
"The output is a ranked action view, not a vague answer. Layak currently evaluates 6 enabled rule paths. In Aisyah's demo flow, 6 matched items are surfaced in total. [pause 0.4s] Five are benefit schemes that contribute to annual upside, while PERKESO SKSPS is shown separately as a required contribution."

**PACE:**  
`[hold 2s on upside hero]`  
`[emphasize: ranked action view]`

**EDITOR NOTE:**  
Make the total upside and matched-scheme framing easy to read before moving further down.

---

### 2:50-3:20

**TIME:** `2:50-3:20`

**ON SCREEN:** Keep one strong scheme card in frame. If a qualification or explanation surface opens cleanly, use it.

**VOICEOVER:**  
"This is where the product objective becomes visible. Layak helps the user focus on the schemes most worth acting on first, and it explains the recommendation in plain language. That makes the experience more useful, and more trustworthy, than a generic chatbot answer."

**PACE:**  
`[read a little slower]`  
`[slight emphasis: more trustworthy]`

**EDITOR NOTE:**  
Choose the cleanest card, not the busiest one.

---

### 3:20-3:45

**TIME:** `3:20-3:45`

**ON SCREEN:** Show one provenance interaction or hover state with the citation area clearly framed.

**VOICEOVER:**  
"Trust matters even more in public-service discovery. So every important claim should be grounded in source material that the user can inspect, instead of hidden behind a fluent but unverifiable response."

**PACE:**  
`[emphasize: grounded]`

**EDITOR NOTE:**  
If the click is unstable, use a close crop rather than a second take.

---

### 3:45-4:05

**TIME:** `3:45-4:05`

**ON SCREEN:** Scroll to the code execution panel and keep the Python trace and output visible.

**VOICEOVER:**  
"We also make the arithmetic visible. Gemini Code Execution shows how the annual upside is computed, so the audience can see that the number is produced transparently rather than presented as black-box magic."

**PACE:**  
`[slight emphasis: transparently]`

**EDITOR NOTE:**  
This is one of the strongest trust beats for technically minded judges.

---

### 4:05-4:35

**TIME:** `4:05-4:35`

**ON SCREEN:** Scroll to the draft packet area and packet download section. Hold long enough for the audience to register the packet output.

**VOICEOVER:**  
"And this is the final shift from analysis to action. Layak prepares draft packets the user can review and submit manually. [pause 0.5s] That is an intentional safety choice. The system helps with preparation, clarity, and prioritization, but the user still stays in control of final submission."

**PACE:**  
`[hold 2s on packet area]`  
`[strong emphasis: user still stays in control]`

**EDITOR NOTE:**  
This is the trust and safety close.

---

### 4:35-4:50

**TIME:** `4:35-4:50`

**ON SCREEN:** End on a clean frame that includes either the packet area or the main results hero.

**VOICEOVER:**  
"Layak is our Track 2 Citizens First submission: a grounded AI concierge that helps someone like Aisyah focus on the schemes she may be eligible for, understand the reasoning, and act on a clearer path with real potential yearly upside."

**PACE:**  
`[steady close]`

**EDITOR NOTE:**  
End without extra filler. Let the final sentence land.

## Shot Checklist

- outcome-first cold open
- Aisyah story hook
- problem/objective section without formal slides
- one pipeline visual or equivalent explanation beat
- upload/manual-entry choice
- `Use Aisyah` trigger
- full five-step pipeline progression
- total annual upside hero
- at least one scheme card
- if possible, the required-contributions block
- at least one provenance moment
- code execution panel
- draft packet section
- stable closing frame
