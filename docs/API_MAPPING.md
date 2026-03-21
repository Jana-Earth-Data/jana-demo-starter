# API Mapping — Notebook to Demo

This document maps the Nepal notebook workflows to a lightweight demo UI.

## Guiding principle

Prefer **fast summary endpoints or constrained calls**.  
Avoid wide unified queries that may time out.

---

## Climate TRACE notebook pattern

Notebook calls:
- `/api/v1/data-sources/climatetrace/assets/`
- `/api/v1/data-sources/climatetrace/emissions/`

Notebook filters:
- `country_code=NPL`

### Demo usage
Use Climate TRACE to power:
- total record count
- date range
- emissions trend
- emissions by sector

### UI mapping
- KPI: `Climate TRACE records`
- source card: `Facility and sector emissions`
- trend chart: emissions over time
- sector chart: top sectors

---

## OpenAQ notebook pattern

Notebook calls:
- `/api/v1/data-sources/openaq/locations/`
- `/api/v1/data-sources/openaq/sensors/`
- `/api/v1/data-sources/openaq/measurements/`

Notebook filters:
- locations: `country_code=NP`
- sensors: `location__country_code=NP`
- measurements: looped by location ids

### Demo usage
Use OpenAQ to power:
- monitoring location count
- sensor count
- measurement count
- latest measurement date

### UI mapping
- KPI: `Monitoring locations`
- KPI: `Sensors`
- source card: `Air quality monitoring`
- insight text: monitoring coverage

### Recommendation
Do not fetch raw measurements across every location on first page load.
For v1:
- show summary counts only
- optionally add a “load air detail” interaction later

---

## EDGAR notebook pattern

Notebook calls:
- `/api/v1/data-sources/edgar/country-totals/`
- `/api/v1/data-sources/edgar/air-pollutant-totals/`

Notebook filters:
- `country_code=NPL`

### Demo usage
Use EDGAR to power:
- long-run national trend chart
- GHG totals count
- air pollutant totals count
- latest inventory year

### UI mapping
- KPI: `EDGAR GHG records`
- source card: `National inventory trends`
- guided question: `Show long-run inventory trends`

---

## Unified endpoint note

The notebook notes that:

- unified `climatetrace + edgar` can time out
- unified OpenAQ queries can be heavy because of large measurement joins

### Recommendation for demo
Do not use the unified endpoint for the first public-facing demo route.

Instead:
1. call source endpoints separately
2. normalize on the frontend
3. cache where appropriate
4. use mock fallback for resilience

---

## Proposed frontend fetch order

### Home page
Parallel:
1. Climate TRACE summary
2. OpenAQ summary
3. EDGAR summary

### Insight panel
Generate text from already loaded data on the client or server.

### Optional enhancement
Add a small API route in Next.js later:
- `/api/demo/nepal-summary`
- aggregates live backend responses
- shields the client from schema drift

---

## Proposed normalization layer

Each source adapter should return the same shape:

```ts
type SourceSummary = {
  name: string
  status: "live" | "mock"
  recordCount?: number
  dateRange?: string
  notes?: string[]
}
```

---

## Mock fallback rule

If any live request fails:
- catch the error
- return source-specific mock data
- set `status: "mock"`
- render a visible badge in the UI
