import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, nowIso, audioPath } from "@/lib/db";
import { recordings } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file in upload." }, { status: 400 });
  }

  const id = randomUUID();
  const ext =
    path.extname(file.name).replace(".", "").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const title =
    (form.get("title") as string | null)?.trim() ||
    path.basename(file.name, path.extname(file.name));
  const skipSummary = form.get("skipSummary") === "1" ? 1 : 0;

  const dest = audioPath(id, ext);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()));

  db.insert(recordings)
    .values({
      id,
      title,
      originalFilename: file.name,
      storedExt: ext,
      status: "queued",
      skipSummary,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
    .run();

  return NextResponse.json({ id });
}
