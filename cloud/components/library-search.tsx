"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FsSearchHit } from "@/lib/types";
import { MARK_OPEN, MARK_CLOSE } from "@/lib/search-shared";
import { formatClock, formatDate } from "@/lib/format";

/** Renders a snippet, highlighting text between the FTS markers. */
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

export function LibrarySearch({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<FsSearchHit[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) {
      setHits(null);
      return;
    }
    timer.current = setTimeout(async () => {
      const { data, error } = await createClient().rpc("fs_search", { q: query.trim() });
      setHits(error ? [] : ((data ?? []) as FsSearchHit[]));
    }, 250);
  }, [query]);

  const searching = query.trim().length > 0 && hits !== null;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search every transcript…"
          className="w-full rounded-lg border bg-card py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-flare/50"
          aria-label="Search transcripts"
        />
      </div>
      {searching ? <Results query={query.trim()} hits={hits!} /> : children}
    </div>
  );
}

function Results({ query, hits }: { query: string; hits: FsSearchHit[] }) {
  if (hits.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nothing in your transcripts matches “{query}”.
      </p>
    );
  }

  const byRecording = new Map<string, FsSearchHit[]>();
  for (const hit of hits) {
    const list = byRecording.get(hit.recording_id) ?? [];
    list.push(hit);
    byRecording.set(hit.recording_id, list);
  }

  return (
    <div className="space-y-5">
      {[...byRecording.entries()].map(([recordingId, group]) => (
        <div key={recordingId} className="rounded-xl border">
          <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
            <p className="truncate text-sm font-medium">{group[0].title}</p>
            <p className="shrink-0 font-mono text-[10px] text-muted-foreground">
              {formatDate(group[0].recorded_at)}
            </p>
          </div>
          <ul className="divide-y divide-border/60">
            {group.map((hit) => (
              <li key={hit.utterance_id}>
                <Link
                  href={`/r/${recordingId}#u-${hit.utterance_id}`}
                  className="flex items-baseline gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/50"
                >
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {formatClock(hit.start_sec)}
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
