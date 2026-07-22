import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/db";
import { recordings } from "@/db/schema";
import { getRecording } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Re-run a recording through the pipeline. Lets you fix a bad transcript after
// the fact: force the language (auto-detect misfires on quiet far-field audio)
// and/or boost distant audio. Overwrites the old transcript.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recording = getRecording(id);
  if (!recording) return NextResponse.json({ error: "Recording not found." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    language?: string | null;
    enhance?: boolean;
  };
  const forcedLanguage = body.language === "en" || body.language === "pt" ? body.language : null;
  const enhanceAudio = (body.enhance ?? recording.enhanceAudio === 1) ? 1 : 0;

  db.update(recordings)
    .set({
      forcedLanguage,
      enhanceAudio,
      status: "queued",
      error: null,
      updatedAt: nowIso(),
    })
    .where(eq(recordings.id, id))
    .run();
  return NextResponse.json({ ok: true });
}
