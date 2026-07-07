import Link from "next/link";
import { AudioLines } from "lucide-react";
import { LibrarySearch } from "@/components/library-search";
import { createClient } from "@/lib/supabase/server";
import type { FsRecording } from "@/lib/types";
import { formatDate, formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = FsRecording & { fs_speakers: { count: number }[] };

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("fs_recordings")
    .select("*, fs_speakers(count)")
    .order("recorded_at", { ascending: false });
  const recordings = (data ?? []) as Row[];

  if (recordings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-16 text-center">
        <AudioLines className="mx-auto size-10 text-flare" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Nothing synced yet</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Finish a recording on the Mac Studio and it shows up here about a minute later.
        </p>
      </div>
    );
  }

  return (
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
  );
}
