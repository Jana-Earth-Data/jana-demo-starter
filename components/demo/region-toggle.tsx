"use client";

import { RegionKey, REGIONS, REGION_GROUPS } from "@/lib/types/region";

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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RegionKey)}
      disabled={disabled}
      className="rounded-full border border-line bg-panelAlt px-4 py-2 text-xs font-medium text-slate-100 transition focus:border-accent focus:outline-none disabled:opacity-50 appearance-none cursor-pointer pr-8"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.75rem center",
      }}
    >
      {REGION_GROUPS.map((group) => (
        <optgroup key={group.country} label={group.country}>
          {group.regions.map((key) => (
            <option key={key} value={key}>
              {REGIONS[key].label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
