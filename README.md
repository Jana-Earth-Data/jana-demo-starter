# Jana Demo Starter

A lightweight **Next.js demo experience** for Jana Earth Data that turns the Nepal notebook into a non-technical demo.

## Important positioning

This package is intentionally a **demo starter**, not the production product UI.

The app includes:
- a visible demo disclaimer
- a Nepal-focused landing experience
- API wrappers for the Jana endpoints used in the notebook
- a mock fallback layer so the UI always works, even when endpoints are unavailable

## Goals

- Show what Jana enables for non-technical audiences
- Reuse the existing Jana frontend blueprint and deployment approach
- Avoid creating a new engineering project
- Make it easy to swap mock data for live data incrementally

## Suggested first-run path

```bash
cd jana-demo-starter
npm install
cp .env.local.example .env.local
npm run dev
```

Then open `http://localhost:3000`.

## What is included

- `docs/UI_SPEC.md` — exact layout, demo narrative, and component inventory
- `docs/API_MAPPING.md` — endpoint mapping from notebook → UI
- `docs/IMPLEMENTATION_NOTES.md` — build notes and phased next steps
- `app/` — minimal App Router demo shell
- `components/demo/` — presentational UI
- `lib/api/` — API client + demo fetchers
- `lib/mock/` — fallback data used when APIs are unavailable

## Environment variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEMO_USE_MOCKS=false
```

- `NEXT_PUBLIC_API_URL` points to the Jana API host
- `NEXT_PUBLIC_DEMO_USE_MOCKS=true` forces the app to use mock data

## Notes on live data

The notebook shows that the unified endpoint can time out when OpenAQ is included in a wide query window. This starter avoids that by calling each source separately and keeping the demo focused on summary views rather than heavy raw-table retrieval.

## Deploy notes

This scaffold follows the uploaded environment blueprint:
- Next.js App Router
- standalone build
- `NEXT_PUBLIC_API_URL` baked in at build time
- Docker multi-stage build
- ECS/ECR friendly layout

## Suggested repo options

1. Create a new repo named `jana-demo`
2. Or copy these files into an existing frontend repo under a `/demo` route

## Fastest build sequence

1. Confirm the mock-first UI feels right
2. Swap in live Climate TRACE summary data
3. Swap in EDGAR live trend data
4. Add OpenAQ live summary cards
5. Only then decide whether the demo should be public, login-gated, or internal

## CI/CD scaffold included

This package also includes starter GitHub Actions workflows under `.github/workflows/` aligned to the uploaded Jana frontend blueprint.
