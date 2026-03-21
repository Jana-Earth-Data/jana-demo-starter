"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DemoData } from "@/lib/types/demo";
import { Badge, Card, Section } from "@/components/demo/ui";
import { EmissionsTrendChart, SectorBarChart } from "@/components/demo/charts";
import { AuthProvider, useAuth } from "@/lib/auth/auth-context";
import { LoginButton } from "@/components/demo/login-button";

type InsightKey = "defaultSummary" | "compareSources" | "inventoryTrend" | "airQualityCoverage";

export function DemoPageClient({ initialData }: { initialData: DemoData }) {
  return (
    <AuthProvider>
      <DemoPageInner initialData={initialData} />
    </AuthProvider>
  );
}

function DemoPageInner({ initialData }: { initialData: DemoData }) {
  const { accessToken } = useAuth();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<InsightKey>("defaultSummary");

  const refetchWithToken = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/demo-data", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const live: DemoData = await res.json();
      setData(live);
    } catch (err) {
      console.error("Failed to fetch live data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) {
      refetchWithToken(accessToken);
    } else {
      setData(initialData);
    }
  }, [accessToken, initialData, refetchWithToken]);

  const currentInsight = useMemo(() => {
    return data.insights[selectedInsight];
  }, [data.insights, selectedInsight]);

  return (
    <main className="min-h-screen bg-surface px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div>
            <div className="font-semibold">Demo Experience — Powered by Jana Earth Data API</div>
            <div className="mt-1 text-amber-50/90">
              This interface is a lightweight demonstration for non-technical audiences. It should not be presented as the production product UI.
            </div>
          </div>
          <div className="shrink-0">
            <LoginButton />
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading live data&hellip;
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="rounded-3xl border border-line bg-panel p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Badge tone="warning">Demo only</Badge>
              <Badge tone={data.meta.isMock ? "warning" : "success"}>
                {data.meta.isMock ? "Using mock fallback" : "Using live data"}
              </Badge>
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Nepal climate intelligence, made legible.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              A simple Jana demo that turns emissions, air quality, and inventory data into a decision-ready view for non-technical stakeholders.
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
              What this demo proves
            </div>
            <div className="mt-3 space-y-4 text-sm leading-7 text-slate-300">
              <p>
                Jana can present multiple environmental sources in one coherent interface without forcing the audience into raw API responses or notebooks.
              </p>
              <p>
                The same underlying services can support analysts in Python while still giving non-technical viewers a fast narrative view.
              </p>
              <p>
                Generated at:{" "}
                <span className="text-slate-100">{new Date(data.meta.generatedAt).toLocaleString()}</span>
              </p>
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
          <Section title="Emissions trend" eyebrow="visual">
            <p className="mb-4 text-sm leading-7 text-slate-300">
              Use this chart to anchor the story in change over time rather than schema details.
            </p>
            <EmissionsTrendChart data={data.charts.emissionsTrend} />
          </Section>

          <Section title="Sector composition" eyebrow="visual">
            <p className="mb-4 text-sm leading-7 text-slate-300">
              This chart gives the audience a fast sense of where emissions activity appears concentrated.
            </p>
            <SectorBarChart data={data.charts.sectorBreakdown} />
          </Section>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Section title="Generated Nepal summary" eyebrow="insight">
            <div className="rounded-2xl border border-line bg-slate-950/30 p-5 text-base leading-8 text-slate-200">
              {currentInsight}
            </div>
            <div className="mt-4 text-xs leading-6 text-slate-400">
              Generated from the currently loaded demo data. This narrative is illustrative and should not be treated as a formal analytical report.
            </div>
          </Section>

          <Section title="Guided questions" eyebrow="interaction">
            <div className="grid gap-3">
              <button
                onClick={() => setSelectedInsight("defaultSummary")}
                className="rounded-2xl border border-line bg-panelAlt px-4 py-4 text-left text-sm text-slate-100 transition hover:border-accent"
              >
                Explain the overall Nepal story
              </button>
              <button
                onClick={() => setSelectedInsight("compareSources")}
                className="rounded-2xl border border-line bg-panelAlt px-4 py-4 text-left text-sm text-slate-100 transition hover:border-accent"
              >
                Compare emissions sources
              </button>
              <button
                onClick={() => setSelectedInsight("inventoryTrend")}
                className="rounded-2xl border border-line bg-panelAlt px-4 py-4 text-left text-sm text-slate-100 transition hover:border-accent"
              >
                Show long-run inventory trends
              </button>
              <button
                onClick={() => setSelectedInsight("airQualityCoverage")}
                className="rounded-2xl border border-line bg-panelAlt px-4 py-4 text-left text-sm text-slate-100 transition hover:border-accent"
              >
                Explain Nepal air monitoring coverage
              </button>
            </div>
          </Section>
        </section>
      </div>
    </main>
  );
}
