import { NextRequest, NextResponse } from "next/server";
import { searchTranscripts } from "@/lib/search";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });
  return NextResponse.json({ results: searchTranscripts(q) });
}
