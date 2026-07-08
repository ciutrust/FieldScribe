import Link from "next/link";
import { AudioLines } from "lucide-react";
import { LibrarySearch } from "@/components/library-search";
import { PendingUploads, type QueueRow } from "@/components/pending-uploads";
import { Upload } from "@/components/upload";
import { createClient } from "@/lib/supabase/server";
import type { FsRecording } from "@/lib/types";
import { formatDate, formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = FsRecording & { fs_speakers: { count: number }[] };

export default async function LibraryPage() {
  const supabase = await createClient();
  const [{ data }, { data: queueData }] = await Promise.all([
    supabase.from("fs_recordings").select("*, fs_speakers(count)").order("recorded_at", {
      ascending: false,
    }),
    supabase
      .from("fs_upload_queue")
      .select("id, title, status, error, created_at")
      .order("created_at", { ascending: false }),
  ]);
  const recordings = (data ?? []) as Row[];
  const queue = (queueData ?? []) as QueueRow[];

  if (recordings.length === 0 && queue.length === 0) {
    return (
      <div className="space-y-6">
        <Upload />
        <div className="rounded-xl border border-dashed px-6 py-16 text-center">
          <AudioLines className="mx-auto size-10 text-flare" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Nothing synced yet</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Upload a recording here, or finish one on the Mac Studio — either way it shows up
            about a minute after processing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Upload />
      <PendingUploads initial={queue} />
      <LibrarySearch>
      <ul className="divide-y divide-border rounded-xl border">
        {recordings.map((r) => {
          const speakerCount = r.fs_speakers[0]?.count ?? 0;
          return (
            <li key={r.id}>
              <Link
                href={`/r/${r.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-secondary/50"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-[15px] font-medium">{r.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {formatDate(r.recorded_at)}
                    {r.duration_sec != null && <> · {formatDuration(r.duration_sec)}</>}
                    {r.language && <> · {r.language}</>}
                    {speakerCount > 0 && (
                      <>
                        {" "}
                        · {speakerCount} speaker{speakerCount === 1 ? "" : "s"}
                      </>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      </LibrarySearch>
    </div>
  );
}
