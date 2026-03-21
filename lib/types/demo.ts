export type StatusKind = "live" | "mock";

export type KpiCard = {
  label: string;
  value: string;
  sublabel?: string;
  status: StatusKind;
};

export type SourceSummary = {
  name: string;
  status: StatusKind;
  title: string;
  description: string;
  recordCount?: number;
  dateRange?: string;
  notes?: string[];
};

export type TrendPoint = {
  period: string;
  value: number;
};

export type BreakdownPoint = {
  label: string;
  value: number;
};

export type InsightSet = {
  defaultSummary: string;
  compareSources: string;
  inventoryTrend: string;
  airQualityCoverage: string;
};

export type DemoData = {
  meta: {
    countryCode: string;
    countryName: string;
    isMock: boolean;
    generatedAt: string;
  };
  kpis: KpiCard[];
  sources: {
    climatetrace: SourceSummary;
    openaq: SourceSummary;
    edgar: SourceSummary;
  };
  charts: {
    emissionsTrend: TrendPoint[];
    sectorBreakdown: BreakdownPoint[];
  };
  insights: InsightSet;
};
