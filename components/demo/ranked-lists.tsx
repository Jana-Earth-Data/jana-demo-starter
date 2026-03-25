"use client";

import { RankedEmitter, RankedLocation } from "@/lib/types/demo";

function formatTonnes(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US").format(value);
}

export function TopEmitters({ items }: { items: RankedEmitter[] }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">No emission source data available.</p>;
  }

  const maxVal = items[0].co2eTonnes;

  return (
    <div className="space-y-2">
      {items.map((f, i) => (
        <div key={`${f.name}-${i}`} className="relative overflow-hidden rounded-xl border border-line bg-slate-950/30 px-4 py-3">
          <div
            className="absolute inset-y-0 left-0 bg-accent/10"
            style={{ width: `${maxVal > 0 ? (f.co2eTonnes / maxVal) * 100 : 0}%` }}
          />
          <div className="relative flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-accent tabular-nums">{i + 1}</span>
                <span className="truncate text-sm font-medium text-slate-100">{f.name}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">{f.sector}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-semibold tabular-nums text-white">{formatTonnes(f.co2eTonnes)}</div>
              <div className="text-[10px] text-slate-500">t CO₂e</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopLocations({ items }: { items: RankedLocation[] }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">No location data available.</p>;
  }

  const maxVal = items[0].sensorCount;

  return (
    <div className="space-y-2">
      {items.map((loc, i) => (
        <div key={`${loc.name}-${i}`} className="relative overflow-hidden rounded-xl border border-line bg-slate-950/30 px-4 py-3">
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500/10"
            style={{ width: `${maxVal > 0 ? (loc.sensorCount / maxVal) * 100 : 0}%` }}
          />
          <div className="relative flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-emerald-400 tabular-nums">{i + 1}</span>
                <span className="truncate text-sm font-medium text-slate-100">{loc.name}</span>
              </div>
              {loc.dateRange && (
                <div className="mt-0.5 text-[11px] text-slate-500">{loc.dateRange}</div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-semibold tabular-nums text-white">{loc.sensorCount}</div>
              <div className="text-[10px] text-slate-500">sensors</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
