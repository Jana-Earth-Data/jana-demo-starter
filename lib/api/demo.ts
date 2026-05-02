import { apiFetchAll } from "@/lib/api/client";
import { nepalDemoMock } from "@/lib/mock/demo-data";
import { DemoData, SourceSummary, TrendPoint, BreakdownPoint, RankedFacility, RankedLocation } from "@/lib/types/demo";
import { RegionConfig, REGIONS } from "@/lib/types/region";

type ClimateTraceEmission = {
  asset_name?: string;
  start_time?: string;
  co2e_tonnes?: number | string;
  sector_name?: string;
};

type OpenAQLocation = {
  id?: number | string;
  openaq_id?: number | string;
  name?: string;
  sensor_count?: number;
  datetime_first?: string;
  datetime_last?: string;
};

type OpenAQSensor = {
  id?: number | string;
  location?: { id?: number; name?: string } | number | string;
  location_name?: string;
};

type EdgarRecord = {
  year?: number | string;
  value?: number | string;
  gas?: string;
  gas_type?: string;
  sector?: string;
};

type EdgarGridRecord = {
  year?: number | string;
  value?: number | string;
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
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

type GeoParams = {
  coordinates?: string;
  radius?: number;
};

function geoFromRegion(region: RegionConfig): GeoParams {
  if (region.coordinates && region.radius) {
    return { coordinates: region.coordinates, radius: region.radius };
  }
  return {};
}

export type DateRange = {
  start_date?: string;
  end_date?: string;
};

export async function fetchClimateTraceSummary(
  region: RegionConfig,
  token?: string | null,
  dateRange?: DateRange
): Promise<{
  source: SourceSummary;
  trend: TrendPoint[];
  sectors: BreakdownPoint[];
  kpiValue: string;
  topFacilities: RankedFacility[];
}> {
  const geo = geoFromRegion(region);
  const params: Record<string, string | number | boolean> = {
    // Jana #172: prefer canonical country_iso3 (server still accepts country_code as alias)
    country_iso3: region.countryCode,
    page_size: 10000,
    ...geo,
  };
  if (dateRange?.start_date) params.start_date = dateRange.start_date;
  if (dateRange?.end_date) params.end_date = dateRange.end_date;

  const { count: apiCount, results: rows } = await apiFetchAll<ClimateTraceEmission>(
    "/api/v1/data-sources/climatetrace/emissions/",
    { params, token }
  );

  const totalRecords = Math.max(apiCount, rows.length);
  const range = getDateRange(rows.map((row) => row.start_time));

  const byYear = new Map<string, number>();
  const bySector = new Map<string, number>();
  const byFacility = new Map<string, { co2e: number; sector: string }>();

  rows.forEach((row) => {
    const date = row.start_time?.slice(0, 4);
    const value = toNumeric(row.co2e_tonnes);

    if (date) {
      byYear.set(date, (byYear.get(date) ?? 0) + value);
    }

    const sector = row.sector_name ?? "Other";
    bySector.set(sector, (bySector.get(sector) ?? 0) + value);

    const rawName = row.asset_name ?? "Unknown";
    const prev = byFacility.get(rawName);
    byFacility.set(rawName, {
      co2e: (prev?.co2e ?? 0) + value,
      sector: prev?.sector ?? sector,
    });
  });

  const trend = Array.from(byYear.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, value]) => ({ period, value: Math.round(value) }));

  const sectors = Array.from(bySector.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value: Math.round(value) }));

  const cleanAssetName = (raw: string): string =>
    raw.replace(/ Administrative Zone$/i, "").replace(/ Urban Area$/i, "");

  const topEmitters = Array.from(byFacility.entries())
    .sort((a, b) => b[1].co2e - a[1].co2e)
    .slice(0, 10)
    .map(([name, { co2e, sector }]) => ({
      name: cleanAssetName(name),
      sector,
      co2eTonnes: Math.round(co2e),
    }));

  return {
    source: {
      name: "climatetrace",
      status: "live",
      title: "Facility and sector emissions",
      description: geo.coordinates
        ? `Climate TRACE emissions within ${region.radius} km of ${region.label}.`
        : `Climate TRACE facility and sector emissions for ${region.countryName}.`,
      recordCount: totalRecords,
      dateRange: range,
      notes: [
        `${numberLabel(totalRecords)} emission records`,
        `${byYear.size} year(s) of data, ${bySector.size} sectors`,
      ],
    },
    trend,
    sectors,
    kpiValue: numberLabel(totalRecords),
    topFacilities: topEmitters,
  };
}

export async function fetchOpenAQSummary(
  region: RegionConfig,
  token?: string | null
): Promise<{
  source: SourceSummary;
  locationsValue: string;
  sensorsValue: string;
  topLocations: RankedLocation[];
}> {
  const geo = geoFromRegion(region);

  const sharedParams: Record<string, string | number | boolean> = {
    page_size: 1000,
    ...geo,
  };

  const [locations, sensors] = await Promise.all([
    apiFetchAll<OpenAQLocation>(
      "/api/v1/data-sources/openaq/locations/",
      // Jana #172: prefer canonical country_iso2 (OpenAQ is alpha-2, not alpha-3).
      // Server still accepts country_code as an alias.
      { params: { country_iso2: region.openaqCountryCode, ...sharedParams }, token }
    ),
    apiFetchAll<OpenAQSensor>(
      "/api/v1/data-sources/openaq/sensors/",
      // Jana #172: prefer canonical location__country_iso2 on FK-traversal filters.
      { params: { location__country_iso2: region.openaqCountryCode, ...sharedParams }, token }
    ),
  ]);

  const locationCount = Math.max(locations.count, locations.results.length);
  const sensorCount = Math.max(sensors.count, sensors.results.length);

  const locationNameById = new Map<string, string>();
  locations.results.forEach((loc) => {
    const name = (loc.name ?? "").trim();
    if (!name) return;
    if (loc.id != null) locationNameById.set(String(loc.id), name);
    if ((loc as Record<string, unknown>).openaq_id != null)
      locationNameById.set(String((loc as Record<string, unknown>).openaq_id), name);
  });

  const sensorsByLocation = new Map<string, { name: string; count: number }>();
  sensors.results.forEach((s) => {
    const loc = s.location;
    let locId: string;
    let locName = "";

    if (typeof loc === "object" && loc !== null) {
      locId = String(loc.id ?? "unknown");
      locName = (loc.name ?? "").trim();
    } else {
      locId = String(loc ?? "unknown");
      locName = (s.location_name ?? "").trim();
    }

    if (!locName) locName = locationNameById.get(locId) ?? "";

    const prev = sensorsByLocation.get(locId);
    sensorsByLocation.set(locId, {
      name: prev?.name || locName,
      count: (prev?.count ?? 0) + 1,
    });
  });

  const topLocations = Array.from(sensorsByLocation.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([locId, { name, count }]) => ({
      name: name || locationNameById.get(locId) || `Location ${locId}`,
      sensorCount: count,
    }));

  return {
    source: {
      name: "openaq",
      status: "live",
      title: "Air quality monitoring",
      description: geo.coordinates
        ? `OpenAQ monitoring within ${region.radius} km of ${region.label}.`
        : `Summary coverage for ${region.countryName} monitoring locations, sensors, and recent measurements.`,
      recordCount: locationCount,
      dateRange: undefined,
      notes: [
        `${numberLabel(locationCount)} monitoring locations`,
        `${numberLabel(sensorCount)} sensors`,
        "Measurements intentionally deferred to keep the demo responsive.",
      ],
    },
    locationsValue: numberLabel(locationCount),
    sensorsValue: numberLabel(sensorCount),
    topLocations,
  };
}

export async function fetchEdgarSummary(
  region: RegionConfig,
  token?: string | null,
  dateRange?: DateRange
): Promise<{
  source: SourceSummary;
  ghgValue: string;
  trend: TrendPoint[];
}> {
  const geo = geoFromRegion(region);
  const isLocal = !!geo.coordinates;

  const endpoint = isLocal
    ? "/api/v1/data-sources/edgar/grid-emissions/"
    : "/api/v1/data-sources/edgar/country-totals/";

  // EDGAR grid-emissions has no country dimension (gridded global data); only
  // country-totals accepts country_code. Both endpoints accept start_date /
  // end_date (Jana PR #170): the backend translates the date range to
  // year__gte / year__lte so the request is bounded — without this, a Kathmandu
  // grid + multi-year range can return 20k+ records and time out the proxy.
  const params: Record<string, string | number | boolean> = {
    page_size: 1000,
    ...geo,
  };
  if (!isLocal) {
    params.country_code = region.countryCode;
  }
  if (dateRange?.start_date) {
    params.start_date = dateRange.start_date;
  }
  if (dateRange?.end_date) {
    params.end_date = dateRange.end_date;
  }

  const { count: apiCount, results: rawRows } = await apiFetchAll<EdgarRecord | EdgarGridRecord>(
    endpoint,
    { params, token }
  );

  const startYear = dateRange?.start_date ? Number(dateRange.start_date.slice(0, 4)) : undefined;
  const endYear = dateRange?.end_date ? Number(dateRange.end_date.slice(0, 4)) : undefined;
  const rows = (startYear || endYear)
    ? rawRows.filter((row) => {
        const y = Number(row.year);
        if (!Number.isFinite(y)) return false;
        if (startYear && y < startYear) return false;
        if (endYear && y > endYear) return false;
        return true;
      })
    : rawRows;

  const totalRecords = (startYear || endYear) ? rows.length : Math.max(apiCount, rawRows.length);

  const years = rows
    .map((row) => Number(row.year))
    .filter((value) => Number.isFinite(value));

  const gasTypes = new Set(rows.map((r) => (r as EdgarRecord).gas_type ?? (r as EdgarRecord).gas ?? "Unknown"));

  const byYear = new Map<string, number>();
  rows.forEach((row) => {
    const year = String(row.year ?? "");
    if (!year) return;
    byYear.set(year, (byYear.get(year) ?? 0) + toNumeric(row.value));
  });

  const trend = Array.from(byYear.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-10)
    .map(([period, value]) => ({ period, value: Math.round(value) }));

  const minYear = years.length ? Math.min(...years) : undefined;
  const maxYear = years.length ? Math.max(...years) : undefined;

  return {
    source: {
      name: "edgar",
      status: "live",
      title: isLocal ? "Grid-level emissions" : "National inventory trends",
      description: isLocal
        ? `EDGAR grid emissions within ${region.radius} km of ${region.label}.`
        : `EDGAR national inventory trends for ${region.countryName}.`,
      recordCount: totalRecords,
      dateRange: minYear && maxYear ? `${minYear} to ${maxYear}` : undefined,
      notes: [
        `${numberLabel(totalRecords)} total records`,
        `Gas types: ${Array.from(gasTypes).join(", ")}`,
        minYear && maxYear ? `Covers ${maxYear - minYear + 1} years (${minYear}–${maxYear})` : "",
        isLocal ? `Gridded data within ${region.radius} km radius` : "",
      ].filter(Boolean),
    },
    ghgValue: numberLabel(totalRecords),
    trend,
  };
}

export function resolveRegion(regionKey?: string): RegionConfig {
  return REGIONS[(regionKey ?? "nepal") as keyof typeof REGIONS] ?? REGIONS.nepal;
}

export async function getNepalDemoData(
  token?: string | null,
  regionKey?: string
): Promise<DemoData> {
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

  const region = REGIONS[(regionKey ?? "nepal") as keyof typeof REGIONS] ?? REGIONS.nepal;

  try {
    const [climatetrace, openaq, edgar] = await Promise.all([
      fetchClimateTraceSummary(region, token),
      fetchOpenAQSummary(region, token),
      fetchEdgarSummary(region, token),
    ]);

    const emissionsTrend =
      edgar.trend.length > 1
        ? edgar.trend
        : climatetrace.trend.length > 1
          ? climatetrace.trend
          : nepalDemoMock.charts.emissionsTrend;

    const sectorBreakdown =
      climatetrace.sectors.length > 0
        ? climatetrace.sectors
        : nepalDemoMock.charts.sectorBreakdown;

    return {
      meta: {
        countryCode: region.countryCode,
        countryName: region.label,
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
          sublabel: `OpenAQ ${region.label} coverage`,
          status: "live",
        },
        {
          label: "OpenAQ sensors",
          value: openaq.sensorsValue,
          sublabel: `${region.label} coverage`,
          status: "live",
        },
        {
          label: "EDGAR records",
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
        emissionsTrend,
        sectorBreakdown,
      },
      insights: {
        defaultSummary:
          `This demo shows live data for ${region.label}. It translates Jana's source coverage into a decision-ready narrative for non-technical audiences.`,
        compareSources:
          "Climate TRACE surfaces operational and sector-oriented emissions context, while EDGAR provides long-run national trend framing. OpenAQ complements that with practical monitoring coverage on the ground.",
        inventoryTrend:
          "The long-run EDGAR series is useful for explaining historical direction and national context before diving into more operational emissions detail.",
        airQualityCoverage:
          `OpenAQ coverage for ${region.label} shows where sensors and monitoring locations exist on the ground, giving the demo a tangible, real-world dimension.`,
      },
    };
  } catch (error) {
    console.error("Falling back to mock demo data. Error:", (error as Error).message);
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
