import { apiFetch } from "@/lib/api/client";
import { nepalDemoMock } from "@/lib/mock/demo-data";
import { DemoData, SourceSummary, TrendPoint, BreakdownPoint } from "@/lib/types/demo";

type PaginatedResponse<T> = {
  count?: number;
  results?: T[];
  next?: string | null;
};

type ClimateTraceEmission = {
  start_time?: string;
  co2e_tonnes?: number | string;
  sector_name?: string;
};

type OpenAQLocation = {
  id?: number | string;
};

type OpenAQSensor = {
  id?: number | string;
};

type OpenAQMeasurement = {
  datetime_utc?: string;
  parameter_name?: string;
};

type EdgarRecord = {
  year?: number | string;
  value?: number | string;
  gas?: string;
  gas_type?: string;
};

const FORCE_MOCKS = process.env.NEXT_PUBLIC_DEMO_USE_MOCKS === "true";

function numberLabel(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getDateRange(values: Array<string | undefined>): string | undefined {
  const cleaned = values.filter(Boolean) as string[];
  if (!cleaned.length) return undefined;
  const sorted = cleaned.slice().sort();
  return `${sorted[0].slice(0, 10)} to ${sorted[sorted.length - 1].slice(0, 10)}`;
}

function toNumeric(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

async function fetchClimateTraceSummary(token?: string | null): Promise<{
  source: SourceSummary;
  trend: TrendPoint[];
  sectors: BreakdownPoint[];
  kpiValue: string;
}> {
  const emissions = await apiFetch<PaginatedResponse<ClimateTraceEmission>>(
    "/api/v1/data-sources/climatetrace/emissions/",
    {
      params: { country_code: "NPL", page_size: 1000 },
      token,
    }
  );

  const rows = emissions.results ?? [];
  const range = getDateRange(rows.map((row) => row.start_time));

  const byYear = new Map<string, number>();
  const bySector = new Map<string, number>();

  rows.forEach((row) => {
    const date = row.start_time?.slice(0, 4);
    const value = toNumeric(row.co2e_tonnes);

    if (date) {
      byYear.set(date, (byYear.get(date) ?? 0) + value);
    }

    const sector = row.sector_name ?? "Other";
    bySector.set(sector, (bySector.get(sector) ?? 0) + value);
  });

  const trend = Array.from(byYear.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, value]) => ({ period, value: Math.round(value) }));

  const sectors = Array.from(bySector.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value: Math.round(value) }));

  return {
    source: {
      name: "climatetrace",
      status: "live",
      title: "Facility and sector emissions",
      description:
        "Live summary generated from the Climate TRACE endpoint used in the Nepal notebook.",
      recordCount: rows.length,
      dateRange: range,
      notes: ["Source loaded live from API"],
    },
    trend,
    sectors,
    kpiValue: numberLabel(rows.length),
  };
}

async function fetchOpenAQSummary(token?: string | null): Promise<{
  source: SourceSummary;
  locationsValue: string;
  sensorsValue: string;
}> {
  const [locations, sensors] = await Promise.all([
    apiFetch<PaginatedResponse<OpenAQLocation>>(
      "/api/v1/data-sources/openaq/locations/",
      { params: { country_code: "NP", page_size: 1000 }, token }
    ),
    apiFetch<PaginatedResponse<OpenAQSensor>>(
      "/api/v1/data-sources/openaq/sensors/",
      { params: { location__country_code: "NP", page_size: 1000 }, token }
    ),
  ]);

  const locationCount = (locations.results ?? []).length;
  const sensorCount = (sensors.results ?? []).length;

  return {
    source: {
      name: "openaq",
      status: "live",
      title: "Air quality monitoring",
      description:
        "Live summary of Nepal monitoring coverage from OpenAQ locations and sensors.",
      recordCount: locationCount,
      dateRange: undefined,
      notes: [
        `${locationCount} monitoring locations`,
        `${sensorCount} sensors`,
        "Measurements intentionally deferred to keep the demo responsive.",
      ],
    },
    locationsValue: numberLabel(locationCount),
    sensorsValue: numberLabel(sensorCount),
  };
}

async function fetchEdgarSummary(token?: string | null): Promise<{
  source: SourceSummary;
  ghgValue: string;
  trend: TrendPoint[];
}> {
  const countryTotals = await apiFetch<PaginatedResponse<EdgarRecord>>(
    "/api/v1/data-sources/edgar/country-totals/",
    { params: { country_code: "NPL", page_size: 1000 }, token }
  );

  const rows = countryTotals.results ?? [];
  const years = rows
    .map((row) => Number(row.year))
    .filter((value) => Number.isFinite(value));

  const gasKey = (row: EdgarRecord) => row.gas ?? row.gas_type ?? "Unknown";

  const ghgRows = rows.filter((row) => gasKey(row) === "GWP_100_AR5_GHG");
  const byYear = new Map<string, number>();

  ghgRows.forEach((row) => {
    const year = String(row.year ?? "");
    if (!year) return;
    byYear.set(year, (byYear.get(year) ?? 0) + toNumeric(row.value));
  });

  const trend = Array.from(byYear.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, value]) => ({ period, value: Math.round(value) }));

  const minYear = years.length ? Math.min(...years) : undefined;
  const maxYear = years.length ? Math.max(...years) : undefined;

  return {
    source: {
      name: "edgar",
      status: "live",
      title: "National inventory trends",
      description:
        "Live EDGAR national totals summary for long-run Nepal framing.",
      recordCount: rows.length,
      dateRange: minYear && maxYear ? `${minYear} to ${maxYear}` : undefined,
      notes: ["Source loaded live from API"],
    },
    ghgValue: numberLabel(rows.length),
    trend,
  };
}

export async function getNepalDemoData(token?: string | null): Promise<DemoData> {
  if (FORCE_MOCKS) {
    return {
      ...nepalDemoMock,
      meta: {
        ...nepalDemoMock.meta,
        isMock: true,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const [climatetrace, openaq, edgar] = await Promise.all([
      fetchClimateTraceSummary(token),
      fetchOpenAQSummary(token),
      fetchEdgarSummary(token),
    ]);

    return {
      meta: {
        countryCode: "NPL",
        countryName: "Nepal",
        isMock: false,
        generatedAt: new Date().toISOString(),
      },
      kpis: [
        {
          label: "Climate TRACE records",
          value: climatetrace.kpiValue,
          sublabel: climatetrace.source.dateRange,
          status: "live",
        },
        {
          label: "Monitoring locations",
          value: openaq.locationsValue,
          sublabel: "OpenAQ Nepal coverage",
          status: "live",
        },
        {
          label: "OpenAQ sensors",
          value: openaq.sensorsValue,
          sublabel: "Live summary",
          status: "live",
        },
        {
          label: "EDGAR GHG records",
          value: edgar.ghgValue,
          sublabel: edgar.source.dateRange,
          status: "live",
        },
      ],
      sources: {
        climatetrace: climatetrace.source,
        openaq: openaq.source,
        edgar: edgar.source,
      },
      charts: {
        emissionsTrend:
          climatetrace.trend.length > 0
            ? climatetrace.trend
            : edgar.trend.length > 0
              ? edgar.trend
              : nepalDemoMock.charts.emissionsTrend,
        sectorBreakdown:
          climatetrace.sectors.length > 0
            ? climatetrace.sectors
            : nepalDemoMock.charts.sectorBreakdown,
      },
      insights: {
        defaultSummary:
          "This demo is currently showing live source summaries where available. It is designed to translate Jana's source coverage into a decision-ready narrative, not to reproduce the full analyst workflow.",
        compareSources:
          "Climate TRACE surfaces operational and sector-oriented emissions context, while EDGAR provides long-run national trend framing. OpenAQ complements that with practical monitoring coverage on the ground.",
        inventoryTrend:
          "The long-run EDGAR series is useful for explaining historical direction and national context before diving into more operational emissions detail.",
        airQualityCoverage:
          "OpenAQ live coverage makes the demo feel tangible: stakeholders can immediately see that the Jana platform can expose not just national totals, but on-the-ground monitoring presence as well.",
      },
    };
  } catch (error) {
    console.error("Falling back to mock demo data", error);
    return {
      ...nepalDemoMock,
      meta: {
        ...nepalDemoMock.meta,
        isMock: true,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
