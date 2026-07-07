"use client";

import { Fragment } from "react";
import Link from "next/link";
import { MARK_OPEN, MARK_CLOSE, type SearchHit } from "@/lib/search-shared";
import { formatClock, formatDate } from "@/lib/format";

/** Render a snippet, highlighting text between the FTS5 markers. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(new RegExp(`(${MARK_OPEN}[^${MARK_CLOSE}]*${MARK_CLOSE})`, "g"));
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith(MARK_OPEN) ? (
          <mark key={i} className="rounded-sm bg-flare-deep/60 px-0.5 text-foreground">
            {part.slice(1, -1)}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

export function SearchResults({ query, hits }: { query: string; hits: SearchHit[] }) {
  if (hits.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nothing in your transcripts matches “{query}”.
      </p>
    );
  }

  const byRecording = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const list = byRecording.get(hit.recordingId) ?? [];
    list.push(hit);
    byRecording.set(hit.recordingId, list);
  }

  return (
    <div className="space-y-5">
      {[...byRecording.entries()].map(([recordingId, group]) => (
        <div key={recordingId} className="rounded-xl border">
          <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
            <p className="truncate text-sm font-medium">{group[0].title}</p>
            <p className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {formatDate(group[0].createdAt)}
            </p>
          </div>
          <ul className="divide-y divide-border/60">
            {group.map((hit) => (
              <li key={hit.utteranceId}>
                <Link
                  href={`/r/${recordingId}?t=${hit.startSec}`}
                  className="flex items-baseline gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/50"
                >
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatClock(hit.startSec)}
                  </span>
                  <span className="text-[13.5px] leading-snug text-foreground/85">
                    <Snippet text={hit.snippet} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
