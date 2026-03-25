"use client";

import { useEffect, useRef, useState } from "react";

export type ApiCallStatus = "idle" | "calling" | "done" | "error";

export type ApiCallEntry = {
  id: string;
  label: string;
  endpoint: string;
  status: ApiCallStatus;
  durationMs?: number;
  recordCount?: number;
  error?: string;
};

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 50);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="tabular-nums">{(elapsed / 1000).toFixed(1)}s</span>;
}

function ProgressBar({ status }: { status: ApiCallStatus }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-800">
      {status === "calling" && (
        <div className="h-full w-full animate-progress rounded-full bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
      )}
      {status === "done" && (
        <div className="h-full w-full rounded-full bg-emerald-500 transition-all duration-300" />
      )}
      {status === "error" && (
        <div className="h-full w-full rounded-full bg-red-500 transition-all duration-300" />
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: ApiCallStatus }) {
  if (status === "calling") {
    return (
      <svg className="h-4 w-4 shrink-0 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    );
  }
  if (status === "done") {
    return (
      <svg className="h-4 w-4 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }
  if (status === "error") {
    return (
      <svg className="h-4 w-4 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    );
  }
  return <div className="h-4 w-4 shrink-0 rounded-full border border-slate-700" />;
}

export function ApiCallLog({ entries }: { entries: ApiCallEntry[] }) {
  const startTimes = useRef<Record<string, number>>({});

  entries.forEach((e) => {
    if (e.status === "calling" && !startTimes.current[e.id]) {
      startTimes.current[e.id] = Date.now();
    }
    if (e.status === "idle") {
      delete startTimes.current[e.id];
    }
  });

  const anyActive = entries.some((e) => e.status === "calling");
  const allDone = entries.every((e) => e.status === "done" || e.status === "error");
  const totalTime = entries.reduce((sum, e) => Math.max(sum, e.durationMs ?? 0), 0);

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="space-y-1.5">
          <div className="flex items-start gap-2">
            <StatusIcon status={entry.status} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-slate-200">
                  {entry.status === "calling" && "Calling "}
                  {entry.status === "done" && "Got "}
                  {entry.status === "error" && "Failed "}
                  {entry.status === "idle" && ""}
                  {entry.label}
                  {entry.status === "calling" && "…"}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-slate-500">
                  {entry.status === "calling" && startTimes.current[entry.id] && (
                    <ElapsedTimer startedAt={startTimes.current[entry.id]} />
                  )}
                  {entry.status === "done" && entry.durationMs != null && (
                    <span className="text-emerald-400">{formatDuration(entry.durationMs)}</span>
                  )}
                  {entry.status === "error" && (
                    <span className="text-red-400">failed</span>
                  )}
                </span>
              </div>
              <div className="mt-0.5 truncate font-mono text-[10px] text-slate-600">
                {entry.endpoint}
              </div>
              {entry.status === "done" && entry.recordCount != null && (
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {new Intl.NumberFormat("en-US").format(entry.recordCount)} records
                </div>
              )}
            </div>
          </div>
          <ProgressBar status={entry.status} />
        </div>
      ))}

      {allDone && entries.length > 0 && (
        <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
          All sources loaded in {formatDuration(totalTime)}
        </div>
      )}

      {!anyActive && !allDone && (
        <p className="text-xs leading-6 text-slate-500">
          Sign in to see live API calls to Jana Earth data sources.
        </p>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
