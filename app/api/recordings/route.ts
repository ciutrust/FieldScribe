import { NextResponse } from "next/server";
import { listRecordings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ recordings: listRecordings() });
}
