"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RecordingListItem } from "@/lib/queries";
import { formatDate, formatDuration } from "@/lib/format";
import { isActive } from "@/lib/status";
import { StatusChip } from "@/components/status-chip";
import { UploadZone } from "@/components/upload-zone";

const FAST_POLL_MS = 2500;
const SLOW_POLL_MS = 12000;

export function Library() {
  const [recordings, setRecordings] = useState<RecordingListItem[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

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
