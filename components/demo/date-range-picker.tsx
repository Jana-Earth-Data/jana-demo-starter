"use client";

export type DateRangeValue = {
  startDate: string;
  endDate: string;
};

export function DateRangePicker({
  value,
  onChange,
  disabled,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panelAlt px-3 py-1">
      <label className="text-[10px] uppercase tracking-wider text-slate-500">From</label>
      <input
        type="date"
        value={value.startDate}
        onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        disabled={disabled}
        className="rounded bg-transparent px-1 py-0.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 [color-scheme:dark]"
      />
      <label className="text-[10px] uppercase tracking-wider text-slate-500">To</label>
      <input
        type="date"
        value={value.endDate}
        onChange={(e) => onChange({ ...value, endDate: e.target.value })}
        disabled={disabled}
        className="rounded bg-transparent px-1 py-0.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 [color-scheme:dark]"
      />
    </div>
  );
}
