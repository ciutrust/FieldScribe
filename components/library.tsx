"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { RecordingListItem } from "@/lib/queries";
import type { SearchHit } from "@/lib/search-shared";
import { formatDate, formatDuration } from "@/lib/format";
import { isActive } from "@/lib/status";
import { SearchResults } from "@/components/search-results";
import { StatusChip } from "@/components/status-chip";
import { UploadZone } from "@/components/upload-zone";

const FAST_POLL_MS = 2500;
const SLOW_POLL_MS = 12000;

export function Library() {
  const [recordings, setRecordings] = useState<RecordingListItem[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounced full-text search across all transcripts.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setHits(null);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        setHits(((await res.json()) as { results: SearchHit[] }).results);
      } catch {
        setHits([]);
      }
    }, 250);
  }, [query]);

  const refresh = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    try {
      const res = await fetch("/api/recordings");
      const data = (await res.json()) as { recordings: RecordingListItem[] };
      setRecordings(data.recordings);
      const anyActive = data.recordings.some((r) => isActive(r.status));
      timer.current = setTimeout(refresh, anyActive ? FAST_POLL_MS : SLOW_POLL_MS);
    } catch {
      timer.current = setTimeout(refresh, SLOW_POLL_MS);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  if (recordings === null) {
    return <p className="py-16 text-center font-mono text-xs text-muted-foreground">loading…</p>;
  }

  return (
    <div className="space-y-6">
      <UploadZone onUploaded={refresh} hero={recordings.length === 0} />
      {recordings.length > 0 && (
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
      )}
      {query.trim() && hits !== null ? (
        <SearchResults query={query.trim()} hits={hits} />
      ) : recordings.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border">
          {recordings.map((r) => (
            <li key={r.id}>
              <Link
                href={`/r/${r.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-secondary/50"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-[15px] font-medium">{r.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {formatDate(r.createdAt)}
                    {r.durationSec != null && <> · {formatDuration(r.durationSec)}</>}
                    {r.language && <> · {r.language}</>}
                    {r.speakerCount > 0 && (
                      <>
                        {" "}
                        · {r.speakerCount} speaker{r.speakerCount === 1 ? "" : "s"}
                      </>
                    )}
                  </p>
                  {r.status === "failed" && r.error && (
                    <p className="truncate text-xs text-danger">{r.error}</p>
                  )}
                </div>
                <StatusChip status={r.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
