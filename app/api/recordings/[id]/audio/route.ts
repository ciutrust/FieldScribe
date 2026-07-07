import fs from "node:fs";
import { Readable } from "node:stream";
import { NextRequest } from "next/server";
import { audioPath } from "@/lib/db";
import { getRecording } from "@/lib/queries";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "audio/webm",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recording = getRecording(id);
  if (!recording) return new Response("Not found", { status: 404 });

  const file = audioPath(id, recording.storedExt);
  if (!fs.existsSync(file)) return new Response("Audio file missing", { status: 404 });

  const size = fs.statSync(file).size;
  const type = MIME[recording.storedExt] ?? "application/octet-stream";
  const range = request.headers.get("range");

  // Range support so <audio> can seek.
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? parseInt(match[1], 10) : 0;
    const end = match?.[2] ? Math.min(parseInt(match[2], 10), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(
      fs.createReadStream(file, { start, end })
    ) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    headers: {
      "Content-Type": type,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
    },
  });
}
