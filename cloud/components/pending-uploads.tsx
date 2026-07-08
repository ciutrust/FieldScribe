"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";

export type QueueRow = {
  id: string;
  title: string;
  status: string;
  error: string | null;
  created_at: string;
};

const STATUS_TEXT: Record<string, string> = {
  queued: "waiting for the Studio…",
  downloaded: "processing on the Studio…",
  error: "failed",
};

/** Ghost entries for uploads in flight. Polls while any exist; when one
 * disappears (transcript synced), refreshes the library list behind it. */
export function PendingUploads({ initial }: { initial: QueueRow[] }) {
  const [rows, setRows] = useState(initial);
  const prevCount = useRef(initial.length);
  const router = useRouter();

  useEffect(() => {
    if (rows.length === 0) return;
    const timer = setInterval(async () => {
      const { data, error } = await createClient()
        .from("fs_upload_queue")
        .select("id, title, status, error, created_at")
        .order("created_at", { ascending: false });
      if (error) return;
      const next = (data ?? []) as QueueRow[];
      setRows(next);
      if (next.length < prevCount.current) router.refresh(); // one finished — show it
      prevCount.current = next.length;
    }, 10000);
    return () => clearInterval(timer);
  }, [rows.length, router]);

  if (rows.length === 0) return null;

  return (
    <ul className="divide-y divide-border rounded-xl border border-dashed">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-[15px] font-medium text-muted-foreground">{row.title}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {formatDate(row.created_at)}
              {row.status === "error" && row.error && (
                <span className="text-danger"> · {row.error}</span>
              )}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            {row.status !== "error" && <Loader2 className="size-3 animate-spin" />}
            <span className={row.status === "error" ? "text-danger" : undefined}>
              {STATUS_TEXT[row.status] ?? row.status}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
