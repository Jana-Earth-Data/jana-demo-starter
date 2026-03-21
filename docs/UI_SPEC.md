# UI Spec — Jana Nepal Demo

## Positioning

This interface is a **demo experience powered by Jana Earth Data**, not the product itself.

Visible copy in the UI should make that explicit:

> Demo Experience — Powered by Jana Earth Data API  
> This interface is a lightweight demonstration of what Jana can enable for decision-makers and non-technical audiences.

---

## Primary audience

- investors
- partners
- commercial prospects
- non-technical operators
- policy or strategy stakeholders
- internal team members who need a compelling walkthrough

---

## Demo goal

Show that Jana can transform fragmented environmental datasets into fast, decision-ready views without forcing the audience to understand notebooks, APIs, or schemas.

---

## Page architecture

Single-page layout with six sections:

1. **Hero**
2. **KPI strip**
3. **Source cards**
4. **Trend + composition visuals**
5. **Generated insight panel**
6. **Guided question cards**

---

## 1. Hero section

### Purpose
Set context fast and make the demo feel polished.

### Layout
- Full-width section
- Left: headline, supporting text, CTA buttons
- Right: summary card with source count and demo disclaimer

### Copy
**Headline**  
Nepal climate intelligence, made legible.

**Body**  
A lightweight Jana demo showing how emissions, air quality, and national inventory data can be turned into decision-ready views for non-technical audiences.

### Buttons
- `Use live data`
- `Use mock demo`

### Supporting labels
- `Demo only`
- `Powered by Jana API + Python client workflow`

---

## 2. KPI strip

### Purpose
Create immediate “executive readability.”

### Cards
1. **Climate TRACE records**
2. **OpenAQ monitoring locations**
3. **OpenAQ sensors**
4. **EDGAR GHG records**

### Secondary metadata
- date range
- source status
- whether value is live or mock

### Recommended tone
Keep labels plain-English. Avoid endpoint names as primary labels.

---

## 3. Source cards

### Purpose
Show the breadth of Jana without overwhelming the audience.

### Card A — Climate TRACE
- title: `Facility and sector emissions`
- body: explain that this captures emissions activity across assets and sectors
- include:
  - total records
  - date range
  - sector chart preview

### Card B — OpenAQ
- title: `Air quality monitoring`
- include:
  - monitoring locations
  - sensors
  - measurements
  - measurement freshness note

### Card C — EDGAR
- title: `National inventory trends`
- include:
  - GHG totals record count
  - air pollutant record count
  - year range
  - note that national inventories support macro trend analysis

---

## 4. Trend + composition visuals

### Purpose
Create the “sexy but simple” part of the demo.

### Visual A — Emissions trend
- line chart
- x-axis: year or month
- y-axis: total emissions
- source: Climate TRACE or EDGAR depending on what is loaded

### Visual B — Emissions by sector
- horizontal bar chart
- top sectors only
- if live sector data is not available yet, use mock fallback and label it accordingly

### Visual C — Air quality metrics
- compact cards or a mini chart
- top metrics:
  - locations
  - sensors
  - measurements
  - “freshest available data” date

---

## 5. Generated insight panel

### Purpose
This is the most important non-technical feature.

### Interaction
Button:
- `Generate Nepal summary`

### Output
A short narrative block, written in plain English.

### Example structure
- What changed
- What data sources support the view
- What decision-maker should look at next

### Tone
Confident, clear, non-technical, no exaggerated claims.

### Guardrail copy
“Generated from currently loaded demo data. This is illustrative and should not be treated as a formal analytical report.”

---

## 6. Guided question cards

### Purpose
Give a controlled “Ask Jana” feel without needing an open chatbot.

### Cards
- `Compare emissions sources`
- `Show long-run inventory trends`
- `Explain Nepal air monitoring coverage`

### Behavior
On click:
- swap the insight panel content
- optionally scroll to the relevant chart
- avoid freeform LLM complexity in the first version

---

## Component inventory

### Layout / shell
- `DemoBanner`
- `HeroSection`
- `KpiGrid`
- `SourceCoverage`
- `DemoTabs`
- `InsightPanel`
- `GuidedQuestions`

### Visualization
- `TrendChart`
- `SectorBarChart`
- `CoverageCard`

### State / data
- `useDemoData()`
- `getNepalDemoData()`
- `generateInsight()`

---

## Initial data model

```ts
type DemoData = {
  meta: {
    countryCode: string
    countryName: string
    isMock: boolean
    generatedAt: string
  }
  kpis: Array<{
    label: string
    value: string
    sublabel?: string
    status: "live" | "mock"
  }>
  sources: {
    climatetrace: SourceSummary
    openaq: SourceSummary
    edgar: SourceSummary
  }
  charts: {
    emissionsTrend: Array<{ period: string; value: number }>
    sectorBreakdown: Array<{ label: string; value: number }>
  }
  insights: {
    defaultSummary: string
    compareSources: string
    inventoryTrend: string
    airQualityCoverage: string
  }
}
```

---

## Visual style

- dark or slate-heavy neutral background
- simple cards with soft borders
- large numerals
- low text density
- clean spacing
- visibly separate live vs mock state

---

## Demo script baked into the UI

1. “This is a demo, not the production product.”
2. “The data underneath is coming from Jana’s API and Python-client workflow.”
3. “Instead of exposing endpoints, we surface immediate insight.”
4. “The same underlying services can later support analyst notebooks, enterprise workflows, and application integrations.”

---

## Out of scope for first demo

- auth gating
- map rendering
- granular filtering
- CSV export
- user accounts
- conversational agent
- full notebook parity
