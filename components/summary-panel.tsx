"use client";

import ReactMarkdown from "react-markdown";
import type { Summary } from "@/db/schema";

type Action = { text: string; owner?: string };

export function SummaryPanel({ summary, skipped }: { summary: Summary | null; skipped: boolean }) {
  if (skipped) {
    return (
      <section className="space-y-2">
        <Heading>Summary</Heading>
        <p className="text-xs text-muted-foreground">Skipped for this recording.</p>
      </section>
    );
  }
  if (!summary) return null;

  let actions: Action[] = [];
  try {
    actions = JSON.parse(summary.actionsJson) as Action[];
  } catch {
    actions = [];
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Heading>Summary</Heading>
        <div className="prose-sm text-[13px] leading-relaxed text-foreground/85 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-1 [&_p]:mb-2 [&_strong]:text-foreground">
          <ReactMarkdown>{summary.summaryMd}</ReactMarkdown>
        </div>
      </section>
      {actions.length > 0 && (
        <section className="space-y-2">
          <Heading>Action items</Heading>
          <ul className="space-y-1.5">
            {actions.map((a, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-foreground/85">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-flare" />
                <span>
                  {a.text}
                  {a.owner && <span className="text-muted-foreground"> — {a.owner}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </h2>
  );
}
