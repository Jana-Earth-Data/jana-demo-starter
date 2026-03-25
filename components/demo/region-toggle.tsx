"use client";

import { RegionKey, REGIONS } from "@/lib/types/region";

const keys: RegionKey[] = ["nepal", "kathmandu"];

export function RegionToggle({
  value,
  onChange,
  disabled,
}: {
  value: RegionKey;
  onChange: (key: RegionKey) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-full border border-line bg-panelAlt p-1">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          disabled={disabled}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
            value === key
              ? "bg-accent/20 text-accent"
              : "text-slate-400 hover:text-white"
          } disabled:opacity-50`}
        >
          {REGIONS[key].label}
        </button>
      ))}
    </div>
  );
}
