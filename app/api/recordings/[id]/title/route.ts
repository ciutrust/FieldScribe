import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, nowIso } from "@/lib/db";
import { recordings } from "@/db/schema";
import { getRecording } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getRecording(id)) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }
  const { title } = (await request.json()) as { title?: string };
  const trimmed = title?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Title can't be empty." }, { status: 400 });
  }
  // Bump updated_at too, so the cloud mirror re-syncs the new title.
  db.update(recordings)
    .set({ title: trimmed, updatedAt: nowIso() })
    .where(eq(recordings.id, id))
    .run();
  return NextResponse.json({ ok: true });
}
