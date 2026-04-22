# Layak Demo Video Director Script

Strict runtime target: `2:45-2:55`  
Hard cap used for planning: `3 minutes`

Why 3 minutes: `docs/project-handbook.md` allows up to 5 minutes, but `docs/project-faq.md` says 3-minute maximum. This script follows the stricter limit for safety.

Primary objective: maximize `AI Implementation and Technical Execution` proof while still landing `Impact`, `Innovation`, and `Presentation` clearly.

Demo focus: `v1 hackathon flow`, not the broader v2 product tour.

Recommended recording setup:

- Start already authenticated.
- Record the main flow from `/dashboard/evaluation/upload`.
- Capture one extra results-only take first so you can use it for the cold open.
- Use the `Aisyah` sample path for the main cut unless live upload is already extremely stable.
- Keep mouse movement slow and deliberate.
- Avoid showing settings, waitlist, account deletion, pricing, or long landing-page browsing in the main cut.

---

## Recording Order

Record in this order, even though the final edit starts with the results page:

1. Capture a short `results-only` take for the cold open.
2. Capture the full `upload -> pipeline -> results -> provenance -> packet` take.
3. If needed, capture a separate close-up take for:
   - pipeline stepper
   - code execution panel
   - packet section

---

## Director Transcript

### 0:00-0:12

**ON SCREEN:** Start on a completed results page. Hold on the upside hero for 2-3 seconds so the annual RM figure is immediately visible. Then do a clean cut back to the evaluation upload page.

**VOICEOVER:**  
"This is Layak. In one guided flow, it helps a Malaysian citizen discover aid and tax relief they may qualify for, estimate the annual upside, and prepare draft application packets. [pause 0.5s] We built it for Track 2, Citizens First."

**PACE:**  
`[hold 2.5s on total upside]`  
`[read calmly, no rush]`

**EDITOR NOTE:**  
This is the hook. Lead with the outcome before explaining the product.

---

### 0:12-0:30

**ON SCREEN:** Show the evaluation upload screen. Keep the quick-start cards visible. Move the cursor lightly across the upload/manual entry options. Do not click yet.

**VOICEOVER:**  
"Layak is designed around a very specific problem. Aisyah, our reference user, may qualify for multiple schemes, but today she still has to hop across separate portals, decode different rules, and re-enter the same information again and again. [pause 0.5s] Layak turns that friction into one grounded AI workflow."

**PACE:**  
`[slight emphasis: grounded AI workflow]`

**EDITOR NOTE:**  
Keep this section emotionally clear and practical. Do not over-explain policy background.

---

### 0:30-0:50

**ON SCREEN:** Show the `Upload documents` and `Enter manually` paths. Click the manual path briefly so the audience sees the privacy-first option. Then switch back to upload. Keep the `Use Aisyah` sample action visible.

**VOICEOVER:**  
"Users can either upload supporting documents, or choose manual entry if they do not want to hand sensitive documents to an AI model. [pause 0.5s] For the demo, we use bundled synthetic Aisyah documents so the full pipeline is stable, repeatable, and safe to review on screen."

**PACE:**  
`[pause 0.5s after manual entry mention]`  
`[emphasize: synthetic]`

**EDITOR NOTE:**  
Do not spend time filling the manual form. The point is to show the option exists.

---

### 0:50-1:30

**ON SCREEN:** Click `Use Aisyah` sample documents. Let the pipeline stepper become the main focus. Keep the stepper centered as the steps progress. If needed, use a gentle crop in editing so the step names are readable.

**VOICEOVER:**  
"Now the agentic flow begins. [pause 0.3s] First, Gemini two point five Flash extracts a structured profile from the documents. [pause 0.3s] Second, it classifies the household context. [pause 0.3s] Third, Layak matches the profile against grounded scheme rules using a typed rule engine and Vertex AI Search. [pause 0.3s] Fourth, Gemini Code Execution computes the annual upside. [pause 0.3s] Fifth, WeasyPrint generates draft packets for manual submission."

**PACE:**  
`[short pause between each step]`  
`[slight emphasis: Vertex AI Search]`  
`[slight emphasis: Gemini Code Execution]`

**EDITOR NOTE:**  
This is the highest-value judging section. Let each step register visually. Do not cut too quickly.

---

### 1:30-1:52

**ON SCREEN:** Transition to the finished results page. Hold on the upside hero first. Then scroll just enough to show the ranked scheme cards.

**VOICEOVER:**  
"The result is not a chat answer. It is a ranked action view. [pause 0.4s] Layak shows the total annual RM upside first, then the matched schemes ordered by value, so the user can immediately see what matters most."

**PACE:**  
`[hold 2s on upside hero]`  
`[emphasize: not a chat answer]`

**EDITOR NOTE:**  
Make sure the total RM number is readable before moving down.

---

### 1:52-2:10

**ON SCREEN:** Hover over one high-value matched scheme card. Open one explanation or qualification detail if that interaction is visually stable. Keep the card on screen long enough to read.

**VOICEOVER:**  
"Each scheme is explained in plain language. The goal is not to replace the agency decision. The goal is to help the user understand why they appear to qualify, based on visible rules and grounded evidence."

**PACE:**  
`[read slower here]`  
`[slight emphasis: visible rules]`

**EDITOR NOTE:**  
Use the clearest-looking scheme card. Avoid rapid scrolling through multiple cards.

---

### 2:10-2:25

**ON SCREEN:** Show one provenance interaction. If a citation panel or provenance detail is stable, open it. If clicking is slow, simply hover and frame the citation area clearly.

**VOICEOVER:**  
"This provenance layer is one of Layak's key trust features. Every important number and eligibility claim is meant to be grounded in source material, not guessed by a generic chatbot."

**PACE:**  
`[emphasize: trust]`  
`[pause 0.4s after grounded]`

**EDITOR NOTE:**  
If the interaction is too slow live, use a closer crop rather than forcing a second click.

---

### 2:25-2:40

**ON SCREEN:** Scroll to the code execution panel. Keep the Python trace and outputs in frame.

**VOICEOVER:**  
"We also make the arithmetic visible. Instead of hiding the calculation, Layak shows the code execution trace that computes annual upside across the matched schemes."

**PACE:**  
`[slight emphasis: visible]`

**EDITOR NOTE:**  
This section supports the judging criteria on technical execution and transparency.

---

### 2:40-2:55

**ON SCREEN:** Scroll to the draft packet area and packet download section. Hold long enough for the audience to register that the output becomes a usable draft packet. If the packet preview is visible, keep it in frame.

**VOICEOVER:**  
"And this is where the flow moves from analysis to action. Layak prepares draft packets the user can review and submit manually. [pause 0.5s] Draft only. Grounded. No auto-submission."

**PACE:**  
`[hold 2s on packet area]`  
`[strong emphasis: Draft only. Grounded. No auto-submission.]`

**EDITOR NOTE:**  
This is the safety close. Let the audience sit with it for a beat.

---

### 2:55-3:00

**ON SCREEN:** End on a stable frame: either the packet section, the overall results page, or a clean crop that includes the product UI and total upside.

**VOICEOVER:**  
"Layak is our Track 2 Citizens First submission: a grounded AI concierge built with Gemini, Vertex AI Search, and Cloud Run to turn fragmented public-service discovery into one practical workflow."

**PACE:**  
`[steady close, no rush]`

**EDITOR NOTE:**  
End cleanly. No extra outro card needed unless you have 1-2 seconds of silence to fill.

---

## Optional Alternate Lines

Use these only if a take needs a wording swap without changing timing too much.

### Alternate hook

**VOICEOVER:**  
"Layak helps a citizen go from confusion to a grounded, draft-ready action plan in one flow."

### Alternate trust line

**VOICEOVER:**  
"We are deliberately not automating final government submission. We are automating preparation, clarity, and confidence."

### Alternate technical line

**VOICEOVER:**  
"This is agentic AI with visible steps, grounded retrieval, and explicit computation, not just a conversational wrapper."

---

## Shot Checklist

Before final export, verify that the edited video visibly includes all of the following:

- total annual upside hero
- upload/manual entry choice
- `Use Aisyah` sample trigger
- full five-step pipeline progression
- at least one matched scheme card
- at least one provenance/citation moment
- code execution panel
- draft packet section
- one closing frame that still looks polished without narration

---

## Keep / Cut Guidance

### Keep

- Aisyah problem framing
- five-step pipeline
- grounded provenance
- visible code execution
- draft-only packet output
- Google AI ecosystem references tied to what is on screen

### Cut

- long landing page tour
- full sign-in flow
- settings and waitlist
- evaluation history
- pricing
- long explanations of every scheme
- deep architecture explanation better suited for the pitch deck

---

## Final Delivery Notes

- Best final spoken runtime: `2:45-2:55`
- Export in English
- Prefer captions if time allows
- If using AI voice, feed only the `VOICEOVER` sections
- If using a human narrator, keep the exact pacing tags and pause points

