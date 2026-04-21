# Layak - Malaysian Social-Assistance Eligibility Assistant

Layak helps Malaysian citizens upload three documents and get a ranked, source-cited view of the social-assistance schemes they may claim, plus draft application PDFs.

## Overview

Layak is built for the Project 2030: MyAI Future Hackathon Track 2 Citizens First brief. The v1 flow is straightforward: a user uploads IC, income, and utility documents, the agent extracts the profile, checks the locked scheme rules, ranks the matches, and generates draft packets. The app is designed for demo-night use and keeps the scope tight: grounded claims, visible provenance, and no live submission. It is centered on the Aisyah persona described in the product contract.

## Architecture

Layak is a two-service app: a Next.js frontend and a FastAPI + ADK-Python backend, both deployed on Cloud Run. The backend RootAgent runs the extract -> classify -> match -> rank -> generate pipeline, with Vertex AI Search for grounded retrieval and hardcoded Pydantic rules over the committed scheme PDFs. See `docs/trd.md` for the full contract.

## Tech Stack

- Frontend: Next.js 16.2.4, React 19.2.4, TypeScript 5, Tailwind CSS 4, shadcn/ui 4.3.1, Firebase 12.12.1
- Backend: FastAPI 0.115+, Python 3.12, ADK-Python 1.31, Pydantic v2, WeasyPrint 62+, firebase-admin 6.5+
- Tooling: pnpm 10.33.0, Node 24.x, ESLint 9, Prettier 3.6.2, Husky, lint-staged
- Platform: Google Cloud Run, Vertex AI Search, Secret Manager

## Repo Layout

```text
layak/
├── frontend/
├── backend/
├── docs/
├── .claude/
├── package.json
└── pnpm-workspace.yaml
```

## Local Development

1. `pnpm install`
2. `cp .env.example .env`
3. Fill in `GEMINI_API_KEY`, Firebase values, and `NEXT_PUBLIC_BACKEND_URL` if you are not using the default local backend.
4. `pnpm dev`

`pnpm dev` forwards to `frontend/` and starts Next.js. The frontend reads the shared root `.env` through `frontend/.env.local`; for local API calls, keep the backend available at `http://localhost:8080`.

## Deployment

- Frontend: `gcloud run deploy layak-frontend --source frontend --region asia-southeast1 --min-instances 1 --cpu-boost --allow-unauthenticated --set-build-env-vars NEXT_PUBLIC_BACKEND_URL=https://layak-backend-297019726346.asia-southeast1.run.app --memory 512Mi --timeout 60`
- Backend: `gcloud run deploy layak-backend --source backend --region asia-southeast1 --min-instances 1 --cpu-boost --allow-unauthenticated --set-secrets GEMINI_API_KEY=gemini-api-key:latest --memory 1Gi --timeout 300`

## Live URLs

- Frontend: https://layak-frontend-297019726346.asia-southeast1.run.app
- Backend: https://layak-backend-297019726346.asia-southeast1.run.app

## License / Status

Status: Hackathon project for Track 2 Citizens First of Project 2030: MyAI Future Hackathon. Deadline: 24 April 2026.
License: not separately declared in this repository.
