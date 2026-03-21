# Implementation Notes

## Architecture fit

This starter intentionally mirrors the uploaded Next.js blueprint:
- App Router
- TypeScript
- Tailwind
- standalone output
- `NEXT_PUBLIC_API_URL` build arg pattern
- easy lift into ECS/ECR deployment flow

## Why this is intentionally simple

The demo should:
- look polished
- stay stable under uncertain backend performance
- require only thin frontend work
- avoid becoming a parallel product

## First implementation pass

### Included now
- single-page UI
- mock-first render
- live fetch wrappers
- fallback logic
- controlled insight generation

### Not included yet
- auth
- charts sourced from backend aggregation endpoints
- SSR caching strategy
- deployment workflow files

Those can be added after you confirm the UX direction.

## Suggested next implementation order

1. Validate the UI and narrative internally
2. Replace Climate TRACE chart data with live normalized values
3. Replace EDGAR trend data with live normalized values
4. Decide whether OpenAQ should remain summary-only for demo speed
5. Only then add optional map or geography visuals

## Why no map yet

A map can be compelling, but it adds setup, library decisions, and visual tuning.  
The current package aims to get you to a compelling demo faster.

## State handling

The current implementation uses:
- local React state for view mode
- a single async data loader
- no auth dependency

That keeps it easy to transplant into an existing frontend app.

## Notes on disclaimers

The UI deliberately repeats:
- demo-only status
- live vs mock state
- generated narrative is illustrative

This protects you from implying production feature completeness.

## Repo adoption options

### Option A — dedicated repo
Best if you want a standalone URL for demos.

### Option B — route inside an existing frontend
Best if you want to move fast and avoid new infra.

A good path is:
- start as standalone locally
- copy the route/components into an existing repo once approved
