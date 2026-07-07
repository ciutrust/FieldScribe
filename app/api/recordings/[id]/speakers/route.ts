import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/db";
import { recordings, speakers } from "@/db/schema";
import { getRecording } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getRecording(id)) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }
  const { label, displayName } = (await request.json()) as {
    label?: string;
    displayName?: string;
  };
  if (!label) return NextResponse.json({ error: "Missing speaker label." }, { status: 400 });

  const name = displayName?.trim() || null;
  db.update(speakers)
    .set({ displayName: name })
    .where(and(eq(speakers.recordingId, id), eq(speakers.speakerLabel, label)))
    .run();
  // Renames change what the cloud mirror should show — mark the recording dirty.
  db.update(recordings).set({ updatedAt: nowIso() }).where(eq(recordings.id, id)).run();
  return NextResponse.json({ ok: true });
}
