import { ReactNode } from "react";

export function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-panel/70 p-6 shadow-2xl shadow-black/20">
      {eyebrow ? (
        <div className="mb-2 text-xs uppercase tracking-[0.24em] text-accent">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning";
}) {
  const tones = {
    default: "border-line bg-slate-900 text-slate-200",
    success: "border-green-500/30 bg-green-500/10 text-green-200",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-panelAlt p-5 ${className}`}>
      {children}
    </div>
  );
}
