import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, nowIso } from "@/lib/db";
import { recordings } from "@/db/schema";
import { getRecording } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Re-run a recording through the pipeline with the distant-audio boost on.
// The original file is still on disk, so it re-converts (enhanced), then
// re-transcribes and re-diarizes, overwriting the old transcript.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recording = getRecording(id);
  if (!recording) return NextResponse.json({ error: "Recording not found." }, { status: 404 });

  db.update(recordings)
    .set({ enhanceAudio: 1, status: "queued", error: null, updatedAt: nowIso() })
    .where(eq(recordings.id, id))
    .run();
  return NextResponse.json({ ok: true });
}
