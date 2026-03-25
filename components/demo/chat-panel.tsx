"use client";

import { useCallback, useRef, useState } from "react";
import { DemoData } from "@/lib/types/demo";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function buildDataContext(data: DemoData): string {
  const lines: string[] = [];
  lines.push(`Country: ${data.meta.countryName} (${data.meta.countryCode})`);
  lines.push(`Data mode: ${data.meta.isMock ? "mock" : "live"}`);
  lines.push("");

  lines.push("KPIs:");
  data.kpis.forEach((k) => {
    lines.push(`  ${k.label}: ${k.value}${k.sublabel ? ` (${k.sublabel})` : ""}`);
  });
  lines.push("");

  lines.push("Sources:");
  Object.values(data.sources).forEach((s) => {
    lines.push(`  ${s.name}: ${s.title} — ${s.recordCount ?? "?"} records, ${s.dateRange ?? "no date range"}`);
    s.notes?.forEach((n) => lines.push(`    • ${n}`));
  });
  lines.push("");

  lines.push("Emissions trend (year → value):");
  data.charts.emissionsTrend.forEach((p) => lines.push(`  ${p.period}: ${p.value.toLocaleString()}`));
  lines.push("");

  lines.push("Sector breakdown:");
  data.charts.sectorBreakdown.forEach((p) => lines.push(`  ${p.label}: ${p.value.toLocaleString()}`));

  return lines.join("\n");
}

function suggestedQuestions(regionLabel: string): string[] {
  return [
    `What does ${regionLabel}'s emissions trend tell us?`,
    `Which sectors contribute most to emissions in ${regionLabel}?`,
    `How does the air quality monitoring network look in ${regionLabel}?`,
    "Summarize this dashboard for a policy audience.",
  ];
}

export function ChatPanel({ data }: { data: DemoData }) {
  const regionLabel = data.meta.countryName || "Nepal";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      const updated = [...messages, userMsg];
      setMessages(updated);
      setInput("");
      setStreaming(true);
      scrollToBottom();

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updated.map(({ role, content }) => ({ role, content })),
            dataContext: buildDataContext(data),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Chat request failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: assistantText };
            return copy;
          });
          scrollToBottom();
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Sorry, something went wrong. Please try again." },
          ]);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, data, scrollToBottom]
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-panel shadow-2xl shadow-black/40 transition hover:bg-accent/20"
        title="Ask Jana AI"
      >
        <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[400px] flex-col overflow-hidden rounded-3xl border border-line bg-panel shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div>
          <div className="text-sm font-semibold text-white">Jana AI</div>
          <div className="text-xs text-slate-400">Ask about {regionLabel} climate data</div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => {
                abortRef.current?.abort();
                setMessages([]);
                setStreaming(false);
              }}
              className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title="New chat"
            >
              New chat
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 transition hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Ask about the {regionLabel} climate data on this dashboard, or try:
            </p>
            {suggestedQuestions(regionLabel).map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="block w-full rounded-xl border border-line bg-panelAlt px-3 py-2.5 text-left text-xs text-slate-200 transition hover:border-accent"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent/20 text-accent"
                  : "bg-slate-800/60 text-slate-200"
              }`}
            >
              {msg.content || (
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent [animation-delay:0.4s]" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${regionLabel} climate data…`}
            disabled={streaming}
            className="flex-1 rounded-xl border border-line bg-panelAlt px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="rounded-xl bg-accent/20 px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/30 disabled:opacity-30"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
