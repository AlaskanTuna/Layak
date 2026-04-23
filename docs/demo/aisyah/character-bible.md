# Aisyah Character Bible and Image Prompt Pack

Use this file as the source of truth when generating Aisyah-related visuals for the pitch deck, README banner variants, demo video overlays, or supporting marketing images.

The goal is consistency:

- same face and age across scenes
- same family situation across scenes
- same working-class Malaysian context across scenes
- no accidental drift into glamorous, generic, or Westernized stock-photo imagery

## Canonical Persona

- Name: `Aisyah binti Ahmad`
- Age: `34`
- Location: `Kuantan, Malaysia`
- Role: `self-employed e-hailing / gig driver`
- Tax profile: `Form B` filer, not salaried
- Monthly income: `about RM2,800`
- Household: `2 children`, ages `7` and `10`
- Elder dependant: `1 father`, age `70`
- Household size: `4`
- Digital literacy: moderate, practical, comfortable with phones and e-wallet apps
- Emotional posture: busy, financially careful, skeptical of complicated government forms, but capable and determined
- Product-story role: the primary Layak demo persona and the human face of fragmented public-service discovery

## Visual Identity

Keep these traits fixed as often as possible:

- Malaysian Malay woman, age 34
- warm medium-brown skin tone
- dark brown eyes
- soft oval face
- average build
- black or very dark brown hair
- black hijab for consistency across scenes
- modest, practical everyday clothing
- realistic, documentary-style expression

Recommended recurring look:

- black hijab
- muted green, beige, grey, or navy clothing
- simple family-life styling, not corporate or fashion-forward
- natural Malaysian home, roadside, or car interiors

## Lifestyle and Context Cues

Details that help the image feel like Layak's Aisyah:

- drives for a generic e-hailing service
- uses a mid-range Android phone
- lives in a lower-middle-income Malaysian household
- has two school-age children nearby in some home scenes
- cares for her elderly father
- deals with bills, forms, and repeated document submission
- should feel mobile-first, practical, and time-constrained

## Brand and Copyright Guidance

Avoid using real trademarks directly in generated images.

Do not ask for:

- official `Grab` logos
- exact branded uniforms
- exact corporate app UI
- copied MyKad or official form layouts from real systems

Prefer neutral wording such as:

- `generic green e-hailing driver jacket`
- `ride-hailing driver`
- `generic Southeast Asian e-hailing app colors`
- `generic earnings statement`

## Core Story Beats

These are the most useful story moments to visualize:

1. Aisyah as a working Malaysian citizen and gig driver
2. Aisyah carrying household responsibilities: two children and one elderly father
3. Aisyah overwhelmed by fragmented aid and tax-relief discovery
4. Aisyah preparing documents on a phone-first workflow
5. Aisyah gaining clarity and relief after seeing grounded results
6. Aisyah reviewing draft documents while staying in control of final submission

## Master Prompt

Reuse this base prompt in every image request before adding the scene-specific part:

```text
Aisyah binti Ahmad, a 34-year-old Malaysian Malay woman from Kuantan, realistic documentary style, black hijab, warm medium-brown skin, dark brown eyes, soft oval face, average build, practical modest casual clothing, self-employed e-hailing driver, lower-middle-income household, caring mother of two school-age children and caregiver to her 70-year-old father, holding a mid-range Android phone, emotionally resilient, slightly tired but determined, contemporary Malaysia, natural lighting, authentic home-and-city atmosphere, grounded social-impact storytelling, photorealistic, consistent facial identity across scenes
```

## Negative Prompt

Use this with most image generations:

```text
no real Grab logo, no corporate trademarks, no luxury fashion, no glam makeup, no futuristic sci-fi interface, no Western suburban house, no studio portrait lighting, no cartoon style, no anime style, no exaggerated poverty stereotypes, no extra children, no extra elderly people, no unrealistically cheerful stock-photo mood
```

## Prompt Pack

### 1. Hero Portrait

Best for:

- pitch cover
- intro slide
- README or promo visual variants

Prompt:

```text
Aisyah binti Ahmad, 34-year-old Malaysian Malay woman from Kuantan, black hijab, realistic documentary photo, standing beside a compact ride-hailing car with generic green branding and no logo, practical modest clothing, warm natural daylight, urban Malaysia roadside setting, determined but approachable expression, social-impact startup storytelling, photorealistic
```

### 2. Household Responsibility Scene

Best for:

- problem statement
- user persona slide
- emotional context before demo

Prompt:

```text
Aisyah binti Ahmad at her dining table in a modest Malaysian home, black hijab, two school-age children nearby doing homework, elderly father age 70 seated beside her, utility bill and income documents on the table, smartphone and laptop showing complicated forms, realistic documentary style, emotionally grounded, slightly overwhelmed but composed, warm indoor daylight, photorealistic
```

### 3. Portal Overload Scene

Best for:

- fragmented aid-discovery story
- explaining repeated forms and repeated portal-hopping

Prompt:

```text
Aisyah binti Ahmad sitting at a table in a modest Malaysian home, black hijab, looking tired and frustrated while comparing multiple government-style forms across her phone and laptop, printed utility bill and income papers spread across the table, realistic documentary photography, grounded social-impact tone, natural indoor lighting, photorealistic
```

### 4. Driver-at-Work Scene

Best for:

- showing her as a gig worker
- reinforcing that she is busy and mobile-first

Prompt:

```text
Aisyah binti Ahmad inside a compact car between ride-hailing trips, black hijab, practical modest clothing, checking her Android phone while parked safely at a roadside area in Malaysia, generic green ride-hailing cues with no logo, realistic car interior, natural daylight, focused and hardworking mood, photorealistic
```

### 5. Document Prep Scene

Best for:

- explaining Layak intake
- showing the document-upload problem naturally

Prompt:

```text
Aisyah binti Ahmad at home preparing documents for a digital application, black hijab, smartphone on the table, identity card, earnings statement, and utility bill neatly arranged beside her, realistic Malaysian household setting, practical and focused mood, documentary realism, photorealistic
```

### 6. Manual Entry Privacy Scene

Best for:

- explaining the privacy-first alternative
- showing that not everyone wants to upload sensitive documents

Prompt:

```text
Aisyah binti Ahmad using her Android phone to type information into a simple form instead of uploading documents, black hijab, modest home setting in Malaysia, sensitive documents kept aside on the table, privacy-conscious but calm expression, realistic documentary style, photorealistic
```

### 7. Relief After Results Scene

Best for:

- outcome slide
- transition from problem to solution

Prompt:

```text
Aisyah binti Ahmad in her home, black hijab, reviewing clear helpful results on her phone or laptop, visibly relieved and more confident, two children and elderly father softly present in the background, documents now organized instead of messy, realistic Malaysian home, hopeful but grounded mood, photorealistic
```

### 8. Draft-Packet Review Scene

Best for:

- emphasizing draft-only workflow
- reinforcing that the user stays in control

Prompt:

```text
Aisyah binti Ahmad seated at a table reviewing draft application documents on a laptop and phone, black hijab, elderly father nearby, children in the background, calm focused expression, realistic Malaysian household, social-impact product storytelling, photorealistic, practical and trustworthy mood
```

## Best Three To Generate First

If the team only has time for a few visuals, prioritize:

1. `Hero Portrait`
2. `Household Responsibility Scene`
3. `Relief After Results Scene`

These three cover:

- who she is
- what problem she faces
- what better outcome Layak creates

## Consistency Rules for Image Models

To improve consistency across repeated generations:

- always reuse the `Master Prompt`
- always include `34-year-old Malaysian Malay woman from Kuantan`
- always include `black hijab`
- always include `two school-age children and her 70-year-old father` when the scene is at home
- keep the tone `realistic documentary`, not cinematic fantasy
- use one strong hero portrait as the visual anchor if your image tool supports reference-image conditioning

## What Not To Drift On

Avoid accidentally changing these facts across scenes:

- she is not salaried
- she is not a corporate office worker
- she is not wealthy
- she is not elderly
- she does not have only one child
- her elderly dependant is her `father`
- she is part of a four-person household
- she should feel like a real Malaysian citizen, not a polished stock model

## Fast Copy-Paste Prompt Template

Use this template when creating new scenes:

```text
[MASTER PROMPT]

Scene: [describe the exact moment]
Mood: [e.g. determined, overwhelmed, relieved, focused]
Setting: [e.g. compact car in Kuantan, modest Malaysian home, table with documents]
Composition: [e.g. medium shot, portrait, over-the-shoulder, family in background]

[NEGATIVE PROMPT]
```
