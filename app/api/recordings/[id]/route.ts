import { NextResponse } from "next/server";
import { getRecording, getSpeakers, getSummary, getUtterances } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recording = getRecording(id);
  if (!recording) return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  return NextResponse.json({
    recording,
    utterances: getUtterances(id),
    speakers: getSpeakers(id),
    summary: getSummary(id) ?? null,
  });
}
