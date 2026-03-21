import { DemoData } from "@/lib/types/demo";

export const nepalDemoMock: DemoData = {
  meta: {
    countryCode: "NPL",
    countryName: "Nepal",
    isMock: true,
    generatedAt: new Date().toISOString(),
  },
  kpis: [
    {
      label: "Climate TRACE records",
      value: "17,512",
      sublabel: "2021-01-01 to 2025-10-01",
      status: "mock",
    },
    {
      label: "Monitoring locations",
      value: "41",
      sublabel: "OpenAQ locations in Nepal",
      status: "mock",
    },
    {
      label: "OpenAQ sensors",
      value: "201",
      sublabel: "PM2.5, temperature, humidity and more",
      status: "mock",
    },
    {
      label: "EDGAR GHG records",
      value: "220",
      sublabel: "1970 to 2024 national inventory series",
      status: "mock",
    },
  ],
  sources: {
    climatetrace: {
      name: "climatetrace",
      status: "mock",
      title: "Facility and sector emissions",
      description:
        "Illustrative view of Climate TRACE activity for Nepal, designed for a non-technical demo.",
      recordCount: 17512,
      dateRange: "2021-01-01 to 2025-10-01",
      notes: [
        "Notebook snapshot showed 17,512 Climate TRACE emission records.",
        "Use this card to explain facility and sector coverage, not to imply production reporting UI.",
      ],
    },
    openaq: {
      name: "openaq",
      status: "mock",
      title: "Air quality monitoring",
      description:
        "Summary coverage for Nepal monitoring locations, sensors, and recent measurements.",
      recordCount: 4100,
      dateRange: "2025-01-09 to 2025-12-31",
      notes: [
        "41 monitoring locations",
        "201 sensors",
        "4,100 measurement records in notebook snapshot",
      ],
    },
    edgar: {
      name: "edgar",
      status: "mock",
      title: "National inventory trends",
      description:
        "Long-run inventory-style trends for greenhouse gases and air pollutants.",
      recordCount: 220,
      dateRange: "1970 to 2024",
      notes: [
        "477 air pollutant records were also returned in the notebook snapshot.",
        "Useful for macro trend framing and country-level context.",
      ],
    },
  },
  charts: {
    emissionsTrend: [
      { period: "2019", value: 31200 },
      { period: "2020", value: 32750 },
      { period: "2021", value: 34980 },
      { period: "2022", value: 38120 },
      { period: "2023", value: 40280 },
      { period: "2024", value: 41468 },
    ],
    sectorBreakdown: [
      { label: "Transport", value: 13200 },
      { label: "Energy", value: 9800 },
      { label: "Industry", value: 7200 },
      { label: "Waste", value: 5400 },
      { label: "Buildings", value: 3900 },
    ],
  },
  insights: {
    defaultSummary:
      "This demo combines facility-level emissions context, national inventory trends, and air-quality monitoring coverage into a single Nepal view. The goal is not to reproduce the full analyst workflow, but to make Jana's underlying data assets legible for a non-technical audience.",
    compareSources:
      "Climate TRACE gives a more operational, asset-and-sector-oriented lens, while EDGAR provides long-run national inventory framing. OpenAQ complements both by showing where air-quality monitoring coverage exists on the ground.",
    inventoryTrend:
      "The long-run EDGAR view is useful for explaining historical emissions trajectory and country context. For a live demo, it helps anchor the story in national trend data rather than raw tables.",
    airQualityCoverage:
      "OpenAQ coverage helps show that the demo is not only about emissions totals. It also reveals the practical monitoring footprint — where sensors exist, how much data is available, and how current the measurements are.",
  },
};
