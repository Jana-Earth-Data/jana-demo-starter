"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DemoData, SourceSummary, TrendPoint, BreakdownPoint, RankedFacility, RankedLocation } from "@/lib/types/demo";
import { Badge, Card, Section } from "@/components/demo/ui";
import { EmissionsTrendChart, SectorBarChart } from "@/components/demo/charts";
import { AuthProvider, useAuth } from "@/lib/auth/auth-context";
import { LoginButton } from "@/components/demo/login-button";
import { ChatPanel, buildDataContext } from "@/components/demo/chat-panel";
import { RegionToggle } from "@/components/demo/region-toggle";
import { RegionKey, REGIONS } from "@/lib/types/region";
import { ApiCallLog, ApiCallEntry, ApiCallStatus } from "@/components/demo/api-call-log";
import { DateRangePicker, DateRangeValue } from "@/components/demo/date-range-picker";
import { TopEmitters, TopLocations } from "@/components/demo/ranked-lists";

const DEFAULT_DATE_RANGE: DateRangeValue = {
  startDate: "2020-01-01",
  endDate: "2025-12-31",
};

type ClimatetracResult = {
  source: SourceSummary;
  trend: TrendPoint[];
  sectors: BreakdownPoint[];
  kpiValue: string;
  topFacilities: RankedFacility[];
};

type OpenAQResult = {
  source: SourceSummary;
  locationsValue: string;
  sensorsValue: string;
  topLocations: RankedLocation[];
};

type EdgarResult = {
  source: SourceSummary;
  ghgValue: string;
  trend: TrendPoint[];
};

const SOURCE_DEFS = [
  { id: "climatetrace", label: "Climate TRACE emissions", path: "/api/demo-data/climatetrace" },
  { id: "openaq", label: "OpenAQ locations & sensors", path: "/api/demo-data/openaq" },
  { id: "edgar", label: "EDGAR inventory", path: "/api/demo-data/edgar" },
] as const;

function guidedQuestions(regionLabel: string): string[] {
  return [
    `Explain the overall ${regionLabel} emissions story using the dashboard data`,
    `Compare the three data sources — Climate TRACE, OpenAQ, and EDGAR — for ${regionLabel}`,
    `Analyze the emissions trend from the EDGAR data for ${regionLabel}`,
    `Explain what the air quality monitoring coverage means for ${regionLabel}`,
  ];
}

function makeIdleEntries(): ApiCallEntry[] {
  return SOURCE_DEFS.map((d) => ({
    id: d.id,
    label: d.label,
    endpoint: d.path,
    status: "idle" as ApiCallStatus,
  }));
}

export function DemoPageClient({ initialData }: { initialData: DemoData }) {
  return (
    <AuthProvider>
      <DemoPageInner initialData={initialData} />
    </AuthProvider>
  );
}

function assembleDemoData(
  ct: ClimatetracResult,
  oaq: OpenAQResult,
  edgar: EdgarResult,
  region: RegionKey,
  mock: DemoData
): DemoData {
  const regionConfig = REGIONS[region];

  const emissionsTrend =
    edgar.trend.length > 1
      ? edgar.trend
      : ct.trend.length > 1
        ? ct.trend
        : mock.charts.emissionsTrend;

  const sectorBreakdown =
    ct.sectors.length > 0
      ? ct.sectors
      : mock.charts.sectorBreakdown;

  return {
    meta: {
      countryCode: regionConfig.countryCode,
      countryName: regionConfig.label,
      isMock: false,
      generatedAt: new Date().toISOString(),
    },
    kpis: [
      {
        label: "Climate TRACE records",
        value: ct.kpiValue,
        sublabel: ct.source.dateRange,
        status: "live",
      },
      {
        label: "Monitoring locations",
        value: oaq.locationsValue,
        sublabel: `OpenAQ ${regionConfig.label} coverage`,
        status: "live",
      },
      {
        label: "OpenAQ sensors",
        value: oaq.sensorsValue,
        sublabel: `${regionConfig.label} coverage`,
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
      climatetrace: ct.source,
      openaq: oaq.source,
      edgar: edgar.source,
    },
    charts: { emissionsTrend, sectorBreakdown },
    insights: {
      defaultSummary: `Live data for ${regionConfig.label}.`,
      compareSources: "Climate TRACE surfaces operational and sector-oriented emissions context, while EDGAR provides long-run national trend framing. OpenAQ complements that with practical monitoring coverage on the ground.",
      inventoryTrend: "The long-run EDGAR series is useful for explaining historical direction and national context before diving into more operational emissions detail.",
      airQualityCoverage: `OpenAQ coverage for ${regionConfig.label} shows where sensors and monitoring locations exist on the ground.`,
    },
  };
}

function DemoPageInner({ initialData }: { initialData: DemoData }) {
  const { accessToken } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<RegionKey>("nepal");
  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const [apiCalls, setApiCalls] = useState<ApiCallEntry[]>(makeIdleEntries());

  const [topEmitters, setTopEmitters] = useState<RankedFacility[]>([]);
  const [topLocations, setTopLocations] = useState<RankedLocation[]>([]);

  const [insightQuestion, setInsightQuestion] = useState<string | null>(null);
  const [insightResponse, setInsightResponse] = useState("");
  const [insightStreaming, setInsightStreaming] = useState(false);
  const insightAbortRef = useRef<AbortController | null>(null);

  const ctRef = useRef<ClimatetracResult | null>(null);
  const oaqRef = useRef<OpenAQResult | null>(null);
  const edgarRef = useRef<EdgarResult | null>(null);

  const updateEntry = useCallback(
    (id: string, patch: Partial<ApiCallEntry>) => {
      setApiCalls((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
    },
    []
  );

  const fetchSource = useCallback(
    async (
      def: (typeof SOURCE_DEFS)[number],
      token: string,
      regionKey: RegionKey,
      extraParams?: Record<string, string>
    ): Promise<unknown> => {
      const params = new URLSearchParams({ region: regionKey, ...extraParams });
      const url = `${def.path}?${params}`;
      updateEntry(def.id, {
        status: "calling",
        endpoint: url,
        durationMs: undefined,
        recordCount: undefined,
        error: undefined,
      });

      const t0 = performance.now();
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const durationMs = Math.round(performance.now() - t0);

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = await res.json();

        const recordCount = json.source?.recordCount;
        updateEntry(def.id, { status: "done", durationMs, recordCount });
        return json;
      } catch (err) {
        const durationMs = Math.round(performance.now() - t0);
        updateEntry(def.id, {
          status: "error",
          durationMs,
          error: (err as Error).message,
        });
        return null;
      }
    },
    [updateEntry]
  );

  const fetchAll = useCallback(
    async (token: string, regionKey: RegionKey, dates: DateRangeValue) => {
      setLoading(true);
      setInsightQuestion(null);
      setInsightResponse("");
      ctRef.current = null;
      oaqRef.current = null;
      edgarRef.current = null;

      const dateParams = { start_date: dates.startDate, end_date: dates.endDate };

      setApiCalls(
        SOURCE_DEFS.map((d) => ({
          id: d.id,
          label: d.label,
          endpoint: `${d.path}?region=${regionKey}`,
          status: "calling" as ApiCallStatus,
        }))
      );

      const [ctResult, oaqResult, edgarResult] = await Promise.all([
        fetchSource(SOURCE_DEFS[0], token, regionKey, dateParams),
        fetchSource(SOURCE_DEFS[1], token, regionKey),
        fetchSource(SOURCE_DEFS[2], token, regionKey, dateParams),
      ]);

      if (ctResult && oaqResult && edgarResult) {
        ctRef.current = ctResult as ClimatetracResult;
        oaqRef.current = oaqResult as OpenAQResult;
        edgarRef.current = edgarResult as EdgarResult;

        setTopEmitters(ctRef.current.topFacilities ?? []);
        setTopLocations(oaqRef.current.topLocations ?? []);

        setData(
          assembleDemoData(
            ctRef.current,
            oaqRef.current,
            edgarRef.current,
            regionKey,
            initialData
          )
        );
      }

      setLoading(false);
    },
    [fetchSource, initialData]
  );

  useEffect(() => {
    if (accessToken) {
      fetchAll(accessToken, region, dateRange);
    } else {
      setData(initialData);
      setApiCalls(makeIdleEntries());
    }
  }, [accessToken, region, dateRange, initialData, fetchAll]);

  const askGuidedQuestion = useCallback(
    async (question: string) => {
      insightAbortRef.current?.abort();

      setInsightQuestion(question);
      setInsightResponse("");
      setInsightStreaming(true);

      const controller = new AbortController();
      insightAbortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: question }],
            dataContext: buildDataContext(data),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error(`${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setInsightResponse(text);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setInsightResponse("Sorry, something went wrong generating this insight. Please try again.");
        }
      } finally {
        setInsightStreaming(false);
        insightAbortRef.current = null;
      }
    },
    [data]
  );

  return (
    <main className="min-h-screen bg-surface px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div>
            <div className="font-semibold">Demo — Powered by Jana Earth Data</div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <DateRangePicker value={dateRange} onChange={setDateRange} disabled={loading || !accessToken} />
            <RegionToggle value={region} onChange={setRegion} disabled={loading || !accessToken} />
            <LoginButton />
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="rounded-3xl border border-line bg-panel p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Badge tone="warning">Demo only</Badge>
              <Badge tone={data.meta.isMock ? "warning" : "success"}>
                {data.meta.isMock ? "Using mock fallback" : "Using live data"}
              </Badge>
            </div>
            <div className="mb-4 flex items-center gap-6">
              <img src="/green_logo.png" alt="Jana Earth" className="h-40 w-auto" />
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                One Planet. One API.
              </h1>
            </div>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              A simple Jana demo that turns emissions, air quality, and inventory data into a decision-ready view.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {data.kpis.map((item) => (
                <Card key={item.label}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-slate-400">{item.label}</div>
                    <Badge tone={item.status === "live" ? "success" : "warning"}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-white">{item.value}</div>
                  {item.sublabel ? (
                    <div className="mt-2 text-sm text-slate-400">{item.sublabel}</div>
                  ) : null}
                </Card>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-panelAlt p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-accent">
              Live API calls
            </div>
            <div className="mt-4">
              <ApiCallLog entries={apiCalls} />
            </div>
            <div className="mt-6 border-t border-line pt-4">
              <div className="text-xs uppercase tracking-[0.24em] text-accent">
                Jana at a Glance
              </div>
              <div className="mt-3 space-y-1 font-mono text-[11px] leading-5 text-slate-400">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="pr-4 font-normal">Source</th>
                      <th className="pr-4 text-right font-normal">Records</th>
                      <th className="text-right font-normal">Countries</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="pr-4">OpenAQ</td><td className="pr-4 text-right text-slate-300">1,490,089,379</td><td className="text-right text-slate-300">181</td></tr>
                    <tr><td className="pr-4">Climate TRACE</td><td className="pr-4 text-right text-slate-300">54,772,634</td><td className="text-right text-slate-300">251</td></tr>
                    <tr><td className="pr-4">EDGAR</td><td className="pr-4 text-right text-slate-300">612,557,807</td><td className="text-right text-slate-300">225</td></tr>
                    <tr className="border-t border-line font-semibold text-slate-200">
                      <td className="pr-4 pt-1">TOTAL</td><td className="pr-4 pt-1 text-right">2,157,419,820</td><td></td>
                    </tr>
                  </tbody>
                </table>

                <details className="mt-3">
                  <summary className="cursor-pointer text-accent hover:text-accent/80">EDGAR: 612,557,807 records | 225 countries</summary>
                  <div className="mt-1 pl-3 text-slate-500">
                    <div className="flex justify-between"><span>air_pollutant_grid</span><span className="text-slate-400">466,560,000</span></div>
                    <div className="flex justify-between"><span>air_pollutant_totals</span><span className="text-slate-400">105,205</span></div>
                    <div className="flex justify-between"><span>country_count</span><span className="text-slate-400">225</span></div>
                    <div className="flex justify-between"><span>country_totals</span><span className="text-slate-400">49,280</span></div>
                    <div className="flex justify-between"><span>fasttrack</span><span className="text-slate-400">1,342</span></div>
                    <div className="flex justify-between"><span>grid_emissions</span><span className="text-slate-400">145,637,188</span></div>
                    <div className="flex justify-between"><span>source_total</span><span className="text-slate-400">612,557,807</span></div>
                    <div className="flex justify-between"><span>temporal_profiles</span><span className="text-slate-400">204,792</span></div>
                  </div>
                </details>

                <details>
                  <summary className="cursor-pointer text-accent hover:text-accent/80">OpenAQ: 1,490,089,379 records | 181 countries</summary>
                  <div className="mt-1 pl-3 text-slate-500">
                    <div className="flex justify-between"><span>measurements</span><span className="text-slate-400">1,489,718,052</span></div>
                    <div className="pl-3 text-[10px] text-slate-600">range: 2016-01-30 → 2026-01-01 · 45,783 locations · 22 params</div>
                    <div className="flex justify-between"><span>sensors</span><span className="text-slate-400">320,783</span></div>
                    <div className="flex justify-between"><span>locations</span><span className="text-slate-400">50,514</span></div>
                    <div className="flex justify-between"><span>parameters</span><span className="text-slate-400">30</span></div>
                  </div>
                </details>

                <details>
                  <summary className="cursor-pointer text-accent hover:text-accent/80">Climate TRACE: 54,772,634 records | 251 countries</summary>
                  <div className="mt-1 pl-3 text-slate-500">
                    <div className="flex justify-between"><span>emissions</span><span className="text-slate-400">53,422,192</span></div>
                    <div className="pl-3 text-[10px] text-slate-600">range: 2021-01-01 → 2025-12-31 · 1,337,533 assets · 7 sectors · 208.7B tonnes CO₂e</div>
                    <div className="flex justify-between"><span>assets</span><span className="text-slate-400">1,337,615</span></div>
                    <div className="flex justify-between"><span>sectors</span><span className="text-slate-400">26</span></div>
                    <div className="flex justify-between"><span>countries</span><span className="text-slate-400">251</span></div>
                    <div className="flex justify-between"><span>annual_country_emissions</span><span className="text-slate-400">12,550</span></div>
                    <div className="pl-3 text-[10px] text-slate-600">years: 2015–2024 · 251 countries · 5 gas types</div>
                  </div>
                </details>

                <p className="mt-2 text-slate-600">
                  Generated at:{" "}
                  <span className="text-slate-500">{new Date(data.meta.generatedAt).toLocaleString()}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {Object.values(data.sources).map((source) => (
            <Section key={source.name} title={source.title} eyebrow={source.name}>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone={source.status === "live" ? "success" : "warning"}>
                    {source.status}
                  </Badge>
                  {source.recordCount ? (
                    <div className="text-sm text-slate-400">
                      {new Intl.NumberFormat("en-US").format(source.recordCount)} records
                    </div>
                  ) : null}
                </div>
                <p className="text-sm leading-7 text-slate-300">{source.description}</p>
                {source.dateRange ? (
                  <div className="text-sm text-slate-400">Range: {source.dateRange}</div>
                ) : null}
                {source.notes?.length ? (
                  <ul className="space-y-2 text-sm text-slate-300">
                    {source.notes.map((note) => (
                      <li key={note} className="rounded-xl border border-line bg-slate-950/30 px-3 py-2">
                        {note}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Section>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Section title="National emissions trend" eyebrow="EDGAR">
            <p className="mb-4 text-sm leading-7 text-slate-300">
              Long-run national inventory trend anchors the story in change over time.
            </p>
            <EmissionsTrendChart data={data.charts.emissionsTrend} />
          </Section>

          <Section title="Sector composition" eyebrow="Climate TRACE">
            <p className="mb-4 text-sm leading-7 text-slate-300">
              Facility-level data shows where emissions activity is concentrated across sectors.
            </p>
            <SectorBarChart data={data.charts.sectorBreakdown} />
          </Section>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Section title="Top emitting regions" eyebrow="Climate TRACE">
            <TopEmitters items={topEmitters} />
          </Section>

          <Section title="Top monitoring locations" eyebrow="OpenAQ">
            <TopLocations items={topLocations} />
          </Section>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Section title={insightQuestion ?? "AI-generated insight"} eyebrow="Jana AI">
            {insightResponse ? (
              <div className="rounded-2xl border border-line bg-slate-950/30 p-5 text-base leading-8 text-slate-200 whitespace-pre-wrap">
                {insightResponse}
                {insightStreaming && (
                  <span className="ml-1 inline-flex items-center gap-0.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0.4s]" />
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-slate-950/30 p-5 text-base leading-8 text-slate-400">
                Click a guided question to generate an AI-powered insight from the current dashboard data.
              </div>
            )}
            <div className="mt-4 text-xs leading-6 text-slate-400">
              Generated by Jana AI using {data.meta.isMock ? "mock" : "live"} dashboard data. Not a formal analytical report.
            </div>
          </Section>

          <Section title="Ask about the data" eyebrow="guided questions">
            <div className="grid gap-3">
              {guidedQuestions(REGIONS[region].label).map((q) => (
                <button
                  key={q}
                  onClick={() => askGuidedQuestion(q)}
                  disabled={insightStreaming}
                  className="rounded-2xl border border-line bg-panelAlt px-4 py-4 text-left text-sm text-slate-100 transition hover:border-accent disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </Section>
        </section>
      </div>

      <ChatPanel data={data} />
      <span className="sr-only" aria-hidden="true" data-version="0.3">v0.3</span>
    </main>
  );
}
