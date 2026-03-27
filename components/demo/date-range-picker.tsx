"use client";

import { useCallback, useMemo } from "react";

export type DateRangeValue = {
  startDate: string;
  endDate: string;
};

const MONTHS = [
  { v: "01", label: "Jan" },
  { v: "02", label: "Feb" },
  { v: "03", label: "Mar" },
  { v: "04", label: "Apr" },
  { v: "05", label: "May" },
  { v: "06", label: "Jun" },
  { v: "07", label: "Jul" },
  { v: "08", label: "Aug" },
  { v: "09", label: "Sep" },
  { v: "10", label: "Oct" },
  { v: "11", label: "Nov" },
  { v: "12", label: "Dec" },
];

/** Calendar month 1–12; uses UTC so server and browser match (avoids hydration issues). */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseISO(iso: string): { y: number; m: number; d: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dim = daysInMonth(y, mo);
  if (d > dim) return null;
  return { y, m: mo, d };
}

function toISO(y: number, m: number, d: number): string {
  const dim = daysInMonth(y, m);
  const day = Math.min(d, dim);
  return `${y}-${pad2(m)}-${pad2(day)}`;
}

const selectClass =
  "rounded-md border border-line bg-slate-950/60 px-1.5 py-1 text-xs text-slate-200 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50";

function DateTriplet({
  value,
  onChange,
  disabled,
  minYear,
  maxYear,
}: {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  minYear: number;
  maxYear: number;
}) {
  const parsed = parseISO(value) ?? { y: maxYear, m: 1, d: 1 };
  const y = Math.min(maxYear, Math.max(minYear, parsed.y));
  const m = parsed.m;
  let d = parsed.d;
  const dim = daysInMonth(y, m);
  if (d > dim) d = dim;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let yy = minYear; yy <= maxYear; yy++) list.push(yy);
    return list;
  }, [minYear, maxYear]);

  const dayOptions = useMemo(() => {
    const n = daysInMonth(y, m);
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [y, m]);

  const setPart = useCallback(
    (nextY: number, nextM: number, nextD: number) => {
      onChange(toISO(nextY, nextM, nextD));
    },
    [onChange]
  );

  return (
    <div className="flex items-center gap-1">
      <select
        aria-label="Year"
        className={selectClass}
        disabled={disabled}
        value={String(y)}
        onChange={(e) => setPart(Number(e.target.value), m, d)}
      >
        {years.map((yy) => (
          <option key={yy} value={String(yy)}>
            {yy}
          </option>
        ))}
      </select>
      <select
        aria-label="Month"
        className={selectClass}
        disabled={disabled}
        value={pad2(m)}
        onChange={(e) => setPart(y, Number(e.target.value), d)}
      >
        {MONTHS.map((mo) => (
          <option key={mo.v} value={mo.v}>
            {mo.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Day"
        className={selectClass}
        disabled={disabled}
        value={pad2(d)}
        onChange={(e) => setPart(y, m, Number(e.target.value))}
      >
        {dayOptions.map((dd) => (
          <option key={dd} value={pad2(dd)}>
            {dd}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DateRangePicker({
  value,
  onChange,
  disabled,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  disabled?: boolean;
}) {
  const minYear = 1990;
  const maxYear = 2035;

  return (
    <div className="inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-full border border-line bg-panelAlt px-3 py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">From</span>
        <DateTriplet
          value={value.startDate}
          onChange={(startDate) => onChange({ ...value, startDate })}
          disabled={disabled}
          minYear={minYear}
          maxYear={maxYear}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">To</span>
        <DateTriplet
          value={value.endDate}
          onChange={(endDate) => onChange({ ...value, endDate })}
          disabled={disabled}
          minYear={minYear}
          maxYear={maxYear}
        />
      </div>
    </div>
  );
}
