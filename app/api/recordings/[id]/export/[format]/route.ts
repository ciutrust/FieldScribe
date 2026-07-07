import { NextResponse } from "next/server";
import { buildMarkdown, buildSrt, exportFilename } from "@/lib/export";
import { defaultSpeakerName } from "@/lib/format";
import { getRecording, getSpeakers, getSummary, getUtterances } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; format: string }> }
) {
  const { id, format } = await params;
  const recording = getRecording(id);
  if (!recording) return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  if (format !== "md" && format !== "srt") {
    return NextResponse.json({ error: "Format must be md or srt." }, { status: 400 });
  }

  const utterances = getUtterances(id);
  const speakers = getSpeakers(id);
  const names: Record<string, string> = {};
  speakers.forEach((s, i) => {
    names[s.speakerLabel] = s.displayName?.trim() || defaultSpeakerName(i);
  });

  const body =
    format === "md"
      ? buildMarkdown(recording, utterances, names, getSummary(id) ?? null)
      : buildSrt(utterances, names);

  return new Response(body, {
    headers: {
      "Content-Type": format === "md" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(recording.title, format)}"`,
    },
  });
}
